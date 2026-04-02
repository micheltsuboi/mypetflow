'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// VACCINE CATALOG
// ==========================================

export async function getVaccines() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return []

        const { data, error } = await supabase
            .from('vaccines')
            .select('*')
            .eq('org_id', profile.org_id)
            .order('name')

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching vaccines:', error)
        return []
    }
}

export async function upsertVaccine(data: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada.' }

        const { id, name, manufacturer, description, target_animals } = data

        const vaccineData = {
            org_id: profile.org_id,
            name,
            manufacturer,
            description,
            target_animals
        }

        let result;
        if (id) {
            result = await supabase
                .from('vaccines')
                .update(vaccineData)
                .eq('id', id)
        } else {
            result = await supabase
                .from('vaccines')
                .insert(vaccineData)
        }

        if (result.error) throw result.error

        revalidatePath('/owner/vacinas')
        return { success: true, message: 'Vacina salva com sucesso.' }
    } catch (error: any) {
        console.error('Error upserting vaccine:', error)
        return { success: false, message: error.message }
    }
}

export async function deleteVaccine(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('vaccines')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/owner/vacinas')
        return { success: true, message: 'Vacina removida com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

// ==========================================
// VACCINE BATCHES (LOTES)
// ==========================================

export async function getVaccineBatches(vaccineId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('vaccine_batches')
            .select('*')
            .eq('vaccine_id', vaccineId)
            .order('expiration_date', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching vaccine batches:', error)
        return []
    }
}

export async function upsertVaccineBatch(data: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada.' }

        const { id, vaccine_id, batch_number, quantity, cost_total, selling_price, expiration_date } = data

        // Calculate unit cost
        const cost_price = quantity > 0 ? (cost_total / quantity) : 0

        const batchData = {
            vaccine_id,
            batch_number,
            quantity,
            cost_total,
            cost_price,
            selling_price,
            expiration_date
        }

        let result;
        if (id) {
            result = await supabase
                .from('vaccine_batches')
                .update(batchData)
                .eq('id', id)
        } else {
            result = await supabase
                .from('vaccine_batches')
                .insert(batchData)
                .select()
                .single()

            if (!result.error && cost_total > 0) {
                // Get vaccine name for description
                const { data: vaccine } = await supabase
                    .from('vaccines')
                    .select('name')
                    .eq('id', vaccine_id)
                    .single()

                // Create financial transaction (EXPENSE)
                await supabase.from('financial_transactions').insert({
                    org_id: profile.org_id,
                    type: 'expense',
                    category: 'Estoque de Vacinas',
                    amount: cost_total,
                    description: `Compra de Lote (${vaccine?.name || 'Vacina'}) - Lote: ${batch_number}`,
                    date: new Date().toISOString(),
                    created_by: user.id,
                    reference_id: result.data.id
                })
            }
        }

        if (result.error) throw result.error

        revalidatePath('/owner/vacinas')
        return { success: true, message: 'Lote salvo com sucesso.' }
    } catch (error: any) {
        console.error('Error upserting vaccine batch:', error)
        return { success: false, message: error.message }
    }
}

// ==========================================
// PET VACCINATIONS (CARTEIRA)
// ==========================================

export async function getPetVaccinations(petId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('pet_vaccines')
            .select('*')
            .eq('pet_id', petId)
            .order('application_date', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching pet vaccinations:', error)
        return []
    }
}

export async function applyVaccine(data: any) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        const { 
            pet_id, 
            vaccine_id, 
            vaccine_batch_id, 
            application_date, 
            expiry_date, 
            notes, 
            payment_method,
            is_manual = false,
            manual_name = '',
            manual_batch = ''
        } = data

        let insertData: any = {
            pet_id,
            org_id: profile?.org_id,
            application_date,
            expiry_date,
            notes,
            applied_by: user.id
        }

        if (is_manual) {
            insertData.name = manual_name
            insertData.batch_number = manual_batch
        } else {
            // Get data from vaccine and batch
            const { data: vaccine } = await supabase.from('vaccines').select('name').eq('id', vaccine_id).single()
            const { data: batch } = await supabase.from('vaccine_batches').select('batch_number, selling_price').eq('id', vaccine_batch_id).single()
            
            insertData.name = vaccine?.name || 'Vacina'
            insertData.batch_number = batch?.batch_number || null
            insertData.vaccine_batch_id = vaccine_batch_id

            // Create financial transaction (INCOME) if selling_price > 0
            if (batch?.selling_price && batch.selling_price > 0) {
                const { data: transaction, error: transError } = await supabase.from('financial_transactions').insert({
                    org_id: profile?.org_id,
                    type: 'income',
                    category: 'Vacinas',
                    amount: batch.selling_price,
                    description: `Aplicação de Vacina: ${vaccine?.name} (Lote: ${batch.batch_number})`,
                    payment_method: payment_method || 'cash',
                    date: application_date || new Date().toISOString(),
                    created_by: user.id,
                    reference_id: pet_id
                }).select().single()

                if (!transError && transaction) {
                    insertData.financial_transaction_id = transaction.id
                }
            }
        }

        const { error } = await supabase
            .from('pet_vaccines')
            .insert(insertData)

        if (error) throw error

        revalidatePath('/owner/pets')
        return { success: true, message: 'Vacina registrada com sucesso.' }
    } catch (error: any) {
        console.error('Error applying vaccine:', error)
        return { success: false, message: error.message }
    }
}

export async function deletePetVaccination(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('pet_vaccines')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/owner/pets')
        return { success: true, message: 'Registro removido com sucesso.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}
