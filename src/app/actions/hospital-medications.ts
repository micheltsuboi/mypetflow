'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface HospitalMedicationItem {
    id: string
    org_id: string
    name: string
    volume_ml: number
    cost_price: number
    cost_price_per_ml: number
    default_markup_percent: number
    sale_price_per_ml: number
    is_active: boolean
    notes?: string | null
    created_at?: string
    updated_at?: string
}

export async function getHospitalMedicationCatalog(): Promise<HospitalMedicationItem[]> {
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
            .from('hospital_medication_catalog')
            .select('*')
            .eq('org_id', profile.org_id)
            .order('name', { ascending: true })

        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                console.warn('Tabela hospital_medication_catalog ainda não existe no Supabase.')
                return []
            }
            console.error('Erro ao buscar catálogo de medicações:', error)
            return []
        }

        return (data || []).map(item => {
            const vol = Number(item.volume_ml) || 1
            const cost = Number(item.cost_price) || 0
            const costPerMl = item.cost_price_per_ml ? Number(item.cost_price_per_ml) : (cost / vol)
            return {
                ...item,
                volume_ml: vol,
                cost_price: cost,
                cost_price_per_ml: costPerMl,
                default_markup_percent: Number(item.default_markup_percent) || 100,
                sale_price_per_ml: Number(item.sale_price_per_ml) || (costPerMl * 2),
                is_active: Boolean(item.is_active)
            }
        })
    } catch (err) {
        console.error('Erro de servidor em getHospitalMedicationCatalog:', err)
        return []
    }
}

export async function saveHospitalMedication(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

        const id = formData.get('id') as string | null
        const name = (formData.get('name') as string || '').trim()
        const volume_ml = Math.max(0.01, parseFloat(formData.get('volume_ml') as string || '1'))
        const cost_price = Math.max(0, parseFloat(formData.get('cost_price') as string || '0'))
        const default_markup_percent = parseFloat(formData.get('default_markup_percent') as string || '100')
        const custom_sale_price_per_ml = formData.get('custom_sale_price_per_ml') as string | null
        const notes = formData.get('notes') as string || ''

        if (!name) {
            return { success: false, message: 'O nome do medicamento é obrigatório.' }
        }

        const costPerMl = cost_price / volume_ml
        let salePricePerMl = costPerMl * (1 + default_markup_percent / 100)

        if (custom_sale_price_per_ml && parseFloat(custom_sale_price_per_ml) > 0) {
            salePricePerMl = parseFloat(custom_sale_price_per_ml)
        }

        const payload: any = {
            org_id: profile.org_id,
            name,
            volume_ml,
            cost_price,
            default_markup_percent,
            sale_price_per_ml: Number(salePricePerMl.toFixed(4)),
            notes: notes.trim() || null,
            is_active: true,
            updated_at: new Date().toISOString()
        }

        if (id) {
            const { error } = await supabase
                .from('hospital_medication_catalog')
                .update(payload)
                .eq('id', id)
                .eq('org_id', profile.org_id)

            if (error) throw error
        } else {
            const { error } = await supabase
                .from('hospital_medication_catalog')
                .insert([payload])

            if (error) throw error
        }

        revalidatePath('/owner/hospital/medicacoes')
        revalidatePath('/owner/hospital')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao salvar medicamento:', err)
        return { success: false, message: err.message || 'Erro ao salvar medicamento no catálogo' }
    }
}

export async function deleteHospitalMedication(id: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada' }

        const { error } = await supabase
            .from('hospital_medication_catalog')
            .delete()
            .eq('id', id)
            .eq('org_id', profile.org_id)

        if (error) throw error

        revalidatePath('/owner/hospital/medicacoes')
        revalidatePath('/owner/hospital')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao deletar medicamento:', err)
        return { success: false, message: err.message || 'Erro ao excluir medicamento' }
    }
}
