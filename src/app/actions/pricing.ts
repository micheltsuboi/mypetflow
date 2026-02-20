'use server'

import { createClient } from '@/lib/supabase/server'

export async function calculateDynamicPrice(petId: string, serviceId: string, date: string): Promise<number | null> {
    try {
        const supabase = await createClient()

        // Verifica autoria para segurança
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        // Tries to call the RPC 'get_price' which resides natively on the database
        // that gets the exact price mapping by day, size and weight.
        const { data, error } = await supabase.rpc('get_price', {
            p_pet_id: petId,
            p_service_id: serviceId,
            p_date: date
        })

        if (error) {
            console.error('Error fetching calculated price from RPC:', error)
            return null
        }

        return typeof data === 'number' ? data : null
    } catch (err) {
        console.error('Action error calculating dynamic price:', err)
        return null
    }
}
