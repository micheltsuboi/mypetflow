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
                pets (
                    id,
                    name,
                    species
                )
            `)
            .eq('org_id', profile.org_id)
            .order('name')
            .limit(10)

        // Se query não for vazia, buscar por ILIKE no nome ou cpf
        if (query && query.trim() !== '') {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,cpf.ilike.%${query}%`)
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

        // 2. Se status for 'paid', criar Financial Transaction única
        if (checkoutData.paymentStatus === 'paid') {
            const { data: txData, error: txError } = await supabase
                .from('financial_transactions')
                .insert({
                    org_id: profile.org_id,
                    type: 'income',
                    category: 'Venda Caixa/PDV',
                    amount: checkoutData.finalTotal,
                    description: `Venda balcão - ${checkoutData.cartItems.length} item(ns)`,
                    payment_method: checkoutData.paymentMethod,
                    created_by: user.id,
                    date: new Date().toISOString()
                })
                .select()
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
                discount_amount: checkoutData.totalDiscount,
                payment_status: checkoutData.paymentStatus,
                payment_method: checkoutData.paymentMethod,
                financial_transaction_id: transactionId,
                created_by: user.id
            })
            .select()
            .single()

        if (orderError) throw orderError

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

        // Decrementar estoque de cada produto
        for (const item of checkoutData.cartItems) {
            // Não usamos o update em massa complexo por limitação do supabase-js rest interface. O array tem < 10 items na maioria das vezes
            const newStock = item.stock_quantity - item.quantity;
            await supabase
                .from('products')
                .update({ stock_quantity: newStock < 0 ? 0 : newStock })
                .eq('id', item.product_id)
        }

        revalidatePath('/owner/petshop')
        revalidatePath('/owner/financeiro')

        return { message: 'Venda concluída com sucesso!', success: true }
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
