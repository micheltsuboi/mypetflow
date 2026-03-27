'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CartItem {
    id: string
    product_id: string
    name: string
    quantity: number
    unit_price: number
    discount_percent: number
    total_price: number
    stock_quantity: number
}

interface CheckoutData {
    cartItems: CartItem[]
    customerId: string | null
    petId: string | null
    paymentMethod: string
    paymentStatus: 'paid' | 'pending'
    totalDiscount: number
    subtotal: number
    finalTotal: number
    cashbackUsed?: number // Amount of cashback balance used as discount
}

export async function searchTutorsForPDV(query: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!profile?.org_id) return { success: false, data: [] }

    try {
        let dbQuery = supabase
            .from('customers')
            .select(`
                id,
                name,
                cpf,
                cpf_cnpj,
                address,
                neighborhood,
                city,
                pets (
                    id,
                    name,
                    species
                )
            `)
            .eq('org_id', profile.org_id)
            .order('name')
            .limit(10)

        // Se query não for vazia, buscar por ILIKE no nome, cpf ou cpf_cnpj
        if (query && query.trim() !== '') {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,cpf.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
        }

        const { data, error } = await dbQuery

        if (error) throw error
        return { success: true, data }

    } catch (err) {
        console.error('Error searching tutors:', err)
        return { success: false, error: 'Erro ao buscar tutores' }
    }
}

export async function checkoutCart(checkoutData: CheckoutData) {
    const supabase = await createClient()

    // Auth & Org check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!profile?.org_id) return { message: 'Organização não encontrada.', success: false }

    try {
        // 1. Iniciar registro de Order
        let transactionId = null

        // Se houver cashback usado, validar e descontar (FIFO)
        if (checkoutData.cashbackUsed && checkoutData.cashbackUsed > 0 && checkoutData.customerId) {
            // Buscar transações válidas e com saldo
            const { data: transactions, error: txFetchErr } = await supabase
                .from('cashback_transactions')
                .select('id, amount, expires_at')
                .eq('tutor_id', checkoutData.customerId)
                .gt('expires_at', new Date().toISOString())
                .gt('amount', 0)
                .order('expires_at', { ascending: true }); // Gastar o que vence antes

            if (txFetchErr) throw new Error('Erro ao buscar transações de cashback.');

            let totalAvailable = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
            if (totalAvailable < checkoutData.cashbackUsed) {
                throw new Error('Saldo de cashback insuficiente ou expirado.');
            }

            let amountToDeduct = checkoutData.cashbackUsed;
            for (const tx of transactions) {
                if (amountToDeduct <= 0) break;

                const deduction = Math.min(Number(tx.amount), amountToDeduct);
                const { error: updTxErr } = await supabase
                    .from('cashback_transactions')
                    .update({ amount: Number(tx.amount) - deduction })
                    .eq('id', tx.id);

                if (updTxErr) throw updTxErr;
                amountToDeduct -= deduction;
            }

            // Atualizar o cache de balance total
            const newBalance = totalAvailable - checkoutData.cashbackUsed;
            await supabase
                .from('cashbacks')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('tutor_id', checkoutData.customerId);

            // 1.1 Registrar histórico de uso
            await supabase.from('cashback_history').insert({
                org_id: profile.org_id,
                tutor_id: checkoutData.customerId,
                order_id: null,
                type: 'spend',
                amount: checkoutData.cashbackUsed,
                description: `Resgate de cashback na venda`
            });
        }

        // 2. Se status for 'paid', criar Financial Transaction única
        if (checkoutData.paymentStatus === 'paid') {
            const { data: txData, error: txError } = await supabase
                .from('financial_transactions')
                .insert({
                    org_id: profile.org_id,
                    type: 'income',
                    category: 'Venda Caixa/PDV',
                    amount: checkoutData.finalTotal,
                    description: `Venda balcão - ${checkoutData.cartItems.length} item(ns)${checkoutData.cashbackUsed ? ` (Cashback: R$ ${checkoutData.cashbackUsed.toFixed(2)})` : ''}`,
                    payment_method: checkoutData.paymentMethod,
                    created_by: user.id,
                    date: new Date().toISOString()
                })
                .select('id')
                .single()

            if (txError) throw txError
            transactionId = txData.id
        }

        // 3. Criar a Order vinculando cliente/pet (se houver) e transação
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                org_id: profile.org_id,
                customer_id: checkoutData.customerId || null,
                pet_id: checkoutData.petId || null,
                total_amount: checkoutData.finalTotal,
                discount_amount: checkoutData.totalDiscount + (checkoutData.cashbackUsed || 0),
                payment_status: checkoutData.paymentStatus,
                payment_method: checkoutData.paymentMethod,
                financial_transaction_id: transactionId,
                created_by: user.id
            })
            .select('id')
            .single()

        if (orderError) throw orderError

        // Atualizar histórico de uso com o order_id real
        if (checkoutData.cashbackUsed && checkoutData.cashbackUsed > 0 && checkoutData.customerId) {
            await supabase
                .from('cashback_history')
                .update({ order_id: orderData.id })
                .eq('order_id', null) // Tentar achar o log recém criado
                .eq('tutor_id', checkoutData.customerId)
                .eq('type', 'spend');
        }

        // 4. Inserir Order Items e atualizar Estoque
        const itemsToInsert = checkoutData.cartItems.map(item => ({
            order_id: orderData.id,
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            discount_percent: item.discount_percent
        }))

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert)

        if (itemsError) throw itemsError

        // Decrementar estoque e calcular acúmulo de cashback
        let earnedCashback = 0
        let maxValidityMonths = 2 // Default

        // Buscar regras de cashback
        const { data: rules } = await supabase
            .from('cashback_rules')
            .select('id, type, target_id, percent, validity_months')
            .eq('org_id', profile.org_id);

        // Coeficiente de desconto global: se houver desconto no total da venda ou uso de cashback,
        // o novo cashback deve ser calculado apenas sobre o montante pagar em dinheiro/cartão.
        const totalAfterItemDiscounts = checkoutData.cartItems.reduce((acc, item) => acc + item.total_price, 0);
        const globalDiscountCoefficient = totalAfterItemDiscounts > 0
            ? checkoutData.finalTotal / totalAfterItemDiscounts
            : 1;

        for (const item of checkoutData.cartItems) {
            // Decrementar estoque
            const newStock = item.stock_quantity - item.quantity;
            await supabase
                .from('products')
                .update({ stock_quantity: newStock < 0 ? 0 : newStock })
                .eq('id', item.product_id)

            // Calcular acúmulo se houver tutor
            if (checkoutData.customerId && rules && rules.length > 0) {
                // Tenta achar regra por produto específico
                let rule = rules.find(r => r.type === 'product' && r.target_id === item.product_id)

                // Se não achar, tenta por categoria (precisamos da categoria do item)
                if (!rule) {
                    // Buscar categoria do produto
                    const { data: prodInfo } = await supabase
                        .from('products')
                        .select('category')
                        .eq('id', item.product_id)
                        .single()

                    if (prodInfo) {
                        rule = rules.find(r => r.type === 'category' && r.target_id === prodInfo.category)
                    }
                }

                if (rule) {
                    const effectiveItemPrice = item.total_price * globalDiscountCoefficient;
                    earnedCashback += (effectiveItemPrice * (Number(rule.percent) / 100));
                    // Usar a maior validade se houver múltiplas regras aplicadas
                    if (rule.validity_months > maxValidityMonths) {
                        maxValidityMonths = rule.validity_months
                    }
                }
            }
        }

        // Se ganhou cashback, atualizar saldo do tutor e criar transação
        if (earnedCashback > 0 && checkoutData.customerId) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + maxValidityMonths);

            // 1. Criar registro individual da transação
            const { error: txErr } = await supabase
                .from('cashback_transactions')
                .insert({
                    tutor_id: checkoutData.customerId,
                    org_id: profile.org_id,
                    order_id: orderData.id,
                    amount: earnedCashback,
                    original_amount: earnedCashback,
                    expires_at: expiresAt.toISOString()
                });
            if (txErr) throw txErr;

            // 2. Atualizar saldo consolidado (cache)
            const { data: existingCb } = await supabase
                .from('cashbacks')
                .select('id, balance')
                .eq('tutor_id', checkoutData.customerId)
                .maybeSingle()

            if (existingCb) {
                await supabase
                    .from('cashbacks')
                    .update({
                        balance: Number(existingCb.balance) + earnedCashback,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingCb.id)
            } else {
                await supabase
                    .from('cashbacks')
                    .insert({
                        tutor_id: checkoutData.customerId,
                        org_id: profile.org_id,
                        balance: earnedCashback,
                        updated_at: new Date().toISOString()
                    })
            }

            // 3. Registrar histórico de acúmulo
            await supabase.from('cashback_history').insert({
                org_id: profile.org_id,
                tutor_id: checkoutData.customerId,
                order_id: orderData.id,
                type: 'earn',
                amount: earnedCashback,
                description: `Acúmulo de cashback da venda`
            });
        }

        revalidatePath('/owner/petshop')
        revalidatePath('/owner/financeiro')
        revalidatePath('/owner/tutors')
        revalidatePath('/owner/cashback')

        return {
            message: 'Venda concluída com sucesso!' + (earnedCashback > 0 ? ` Cashback acumulado: R$ ${earnedCashback.toFixed(2)}` : ''),
            success: true,
            orderId: orderData.id
        }
    } catch (err: any) {
        console.error('Error during checkout:', err)
        return { message: `Erro ao concluir a venda: ${err.message}`, success: false }
    }
}

export async function getPetshopHistory(petId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                payment_status,
                payment_method,
                created_at,
                order_items (
                    product_name,
                    quantity,
                    total_price
                )
            `)
            .eq('pet_id', petId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching petshop history:', error)
        return { success: false, error: 'Erro ao buscar histórico.' }
    }
}

export async function getPetshopOrders(filters: {
    startDate?: string,
    endDate?: string,
    customerId?: string,
    searchTerm?: string
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autorizado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!profile?.org_id) return { success: false, error: 'Org not found' }

    try {
        let query = supabase
            .from('orders')
            .select(`
                id, total_amount, discount_amount, payment_status, payment_method, created_at,
                customer_id, pet_id, financial_transaction_id,
                order_items (product_name, quantity, unit_price, total_price, product_id, discount_percent),
                customers (name, cpf, cpf_cnpj, phone_1, email, address, neighborhood, city),
                pets (name)
            `)
            .eq('org_id', profile.org_id)
            .order('created_at', { ascending: false })

        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate)
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate)
        }
        if (filters.customerId) {
            query = query.eq('customer_id', filters.customerId)
        }

        const { data: orders, error } = await query

        if (error) throw error

        let filteredOrders = orders || []

        // Search term filter (clients or products)
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase()
            filteredOrders = filteredOrders.filter(order => {
                const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers
                const customerMatch = customer?.name?.toLowerCase().includes(term)
                const productMatch = order.order_items?.some((item: any) => 
                    item.product_name?.toLowerCase().includes(term)
                )
                return customerMatch || productMatch
            })
        }

        // Fetch NF info separately to avoid complex joins if needed, or just map it
        const orderIds = filteredOrders.map(o => o.id)
        if (orderIds.length > 0) {
            const { data: nfs } = await supabase
                .from('notas_fiscais')
                .select('id, status, referencia, caminho_pdf, origem_id')
                .in('origem_id', orderIds)
                .eq('origem_tipo', 'pdv')

            if (nfs) {
                filteredOrders = filteredOrders.map(order => ({
                    ...order,
                    nf: nfs.find(nf => nf.origem_id === order.id) || null
                }))
            }
        }

        return { success: true, data: filteredOrders }
    } catch (error) {
        console.error('Error fetching orders:', error)
        return { success: false, error: 'Erro ao buscar extrato.' }
    }
}

export async function payPetshopSale(orderId: string, paymentMethod: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Não autorizado.' }

    try {
        // Obter Organização
        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) throw new Error('Org not found')

        // Obter info da order
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (!order) throw new Error('Venda não encontrada')

        // Criar transação financeira
        const { data: tx, error: txError } = await supabase
            .from('financial_transactions')
            .insert({
                org_id: profile.org_id,
                type: 'income',
                category: 'Venda Caixa/PDV',
                amount: order.total_amount,
                description: `Pagamento Venda Pendente`,
                payment_method: paymentMethod,
                created_by: user.id,
                date: new Date().toISOString()
            })
            .select()
            .single()

        if (txError) throw txError

        // Atualizar status
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                payment_status: 'paid',
                payment_method: paymentMethod,
                financial_transaction_id: tx.id
            })
            .eq('id', orderId)

        if (updateError) throw updateError

        revalidatePath('/owner/financeiro')
        revalidatePath('/owner/pets')
        revalidatePath('/owner/petshop')

        return { success: true, message: 'Pagamento registrado com sucesso!' }
    } catch (error) {
        console.error('Error paying sale:', error)
        return { success: false, message: 'Erro ao registrar pagamento.' }
    }
}
