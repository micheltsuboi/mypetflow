'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getHospitalWards() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('hospital_wards')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('order', { ascending: true })

    return data || []
}

export async function getHospitalBeds() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('hospital_beds')
        .select('*, hospital_wards(name, color)')
        .eq('org_id', profile.org_id)
        .order('order', { ascending: true })

    return data || []
}

export async function getActiveAdmissions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return []

    const { data } = await supabase
        .from('hospital_admissions')
        .select(`
            id, bed_id, pet_id, veterinarian_id, admitted_at, reason, severity, status,
            pets ( name, species, breed, weight_kg, customers ( name ) ),
            veterinarians ( name ),
            hospital_beds ( ward_id, name )
        `)
        .eq('org_id', profile.org_id)
        .eq('status', 'active')

    return data || []
}

export async function admitPet(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Organização não encontrada.' }

        const bed_id = formData.get('bedId') as string
        const pet_id = formData.get('petId') as string
        const veterinarian_id = formData.get('veterinarianId') as string || null
        const reason = formData.get('reason') as string
        const severity = formData.get('severity') as string

        if (!bed_id || !pet_id) {
            return { success: false, message: 'Leito e Pet são obrigatórios.' }
        }

        // Insert admission
        const { data: admission, error: admissionError } = await supabase
            .from('hospital_admissions')
            .insert({
                org_id: profile.org_id,
                bed_id,
                pet_id,
                veterinarian_id,
                reason,
                severity,
                created_by: user.id
            })
            .select()
            .single()

        if (admissionError) {
            console.error('admitPet admissionError', admissionError)
            return { success: false, message: 'Erro ao registrar internamento.' }
        }

        // Lock bed
        await supabase.from('hospital_beds').update({ status: 'occupied' }).eq('id', bed_id)

        revalidatePath('/owner/hospital')
        return { success: true, message: 'Pet internado com sucesso!' }
    } catch (error) {
        console.error('admitPet error:', error)
        return { success: false, message: 'Erro inesperado.' }
    }
}

export async function dischargePet(admissionId: string, bedId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        // Discharge admission
        const { error } = await supabase
            .from('hospital_admissions')
            .update({
                status: 'discharged',
                discharged_at: new Date().toISOString()
            })
            .eq('id', admissionId)

        if (error) return { success: false, message: 'Erro ao dar alta.' }

        // Free bed
        await supabase.from('hospital_beds').update({ status: 'available' }).eq('id', bedId)

        revalidatePath('/owner/hospital')
        return { success: true, message: 'Alta registrada com sucesso.' }
    } catch (error) {
        console.error('dischargePet error:', error)
        return { success: false, message: 'Erro inesperado.' }
    }
}

export async function movePetBed(admissionId: string, currentBedId: string, newBedId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada.' }

        // Check if new bed is available
        const { data: newBed } = await supabase.from('hospital_beds').select('status').eq('id', newBedId).single()
        if (newBed?.status !== 'available') {
            return { success: false, message: 'O leito de destino não está disponível.' }
        }

        // Assign new bed
        const { error: updError } = await supabase
            .from('hospital_admissions')
            .update({ bed_id: newBedId })
            .eq('id', admissionId)

        if (updError) throw updError

        // Log movement
        await supabase.from('hospital_bed_movements').insert({
            org_id: profile.org_id,
            admission_id: admissionId,
            from_bed_id: currentBedId,
            to_bed_id: newBedId,
            moved_by: user.id
        })

        // Free old bed, occupy new bed
        await supabase.from('hospital_beds').update({ status: 'available' }).eq('id', currentBedId)
        await supabase.from('hospital_beds').update({ status: 'occupied' }).eq('id', newBedId)

        revalidatePath('/owner/hospital')
        return { success: true, message: 'Pet movido.' }
    } catch (error) {
        console.error('movePetBed error:', error)
        return { success: false, message: 'Erro ao mover pet.' }
    }
}

// Config actions
export async function createWard(name: string, color: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Não autorizado.' }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { success: false, message: 'Org needed.' }

    const { error } = await supabase.from('hospital_wards').insert({
        org_id: profile.org_id,
        name,
        color
    })

    if (error) return { success: false, message: 'Erro ao salvar.' }
    revalidatePath('/owner/hospital/config')
    return { success: true, message: 'Criado.' }
}

export async function createBedsBatch(wardId: string, count: number, prefix: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Não autorizado.' }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { success: false, message: 'Org needed.' }

    const bedsToInsert = Array.from({ length: count }).map((_, i) => ({
        org_id: profile.org_id,
        ward_id: wardId,
        name: `${prefix}${String(i + 1).padStart(2, '0')}`,
        status: 'available',
        order: i
    }))

    const { error } = await supabase.from('hospital_beds').insert(bedsToInsert)

    if (error) return { success: false, message: 'Erro ao gerar leitos.' }
    revalidatePath('/owner/hospital/config')
    return { success: true, message: 'Leitos gerados.' }
}

export async function deleteWard(wardId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Não autorizado.' }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { success: false, message: 'Org needed.' }

    const { error } = await supabase.from('hospital_wards').delete().eq('id', wardId).eq('org_id', profile.org_id)
    if (error) return { success: false, message: 'Não é possível excluir um setor que possui leitos ocupados ou histórico.' }

    revalidatePath('/owner/hospital/config')
    return { success: true, message: 'Setor removido com sucesso.' }
}

export async function deleteBed(bedId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Não autorizado.' }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return { success: false, message: 'Org needed.' }

    const { error } = await supabase.from('hospital_beds').delete().eq('id', bedId).eq('org_id', profile.org_id)
    if (error) return { success: false, message: 'Leito não pode ser excluído no momento.' }

    revalidatePath('/owner/hospital/config')
    return { success: true, message: 'Leito removido.' }
}

export async function getAdmissionMedications(admissionId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('hospital_medications')
        .select('*')
        .eq('admission_id', admissionId)
        .eq('is_active', true)
        .order('next_dose_at', { ascending: true })

    return data || []
}

export async function prescreverMedicacao(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org needed.' }

        const admissionId = formData.get('admissionId') as string
        const petId = formData.get('petId') as string
        const name = formData.get('name') as string
        const dosage = formData.get('dosage') as string
        const freq = formData.get('frequencyHours')
        const frequencyHours = freq ? parseInt(freq as string) : null
        const notes = formData.get('notes') as string

        const initialDoseAt = new Date()
        initialDoseAt.setHours(initialDoseAt.getHours() + (frequencyHours || 0))

        const { error } = await supabase.from('hospital_medications').insert({
            org_id: profile.org_id,
            admission_id: admissionId,
            pet_id: petId,
            name,
            dosage,
            frequency_hours: frequencyHours,
            next_dose_at: frequencyHours ? initialDoseAt.toISOString() : null,
            notes,
            created_by: user.id
        })

        if (error) throw error

        return { success: true, message: 'Prescrito com sucesso.' }
    } catch (e) {
        console.error(e)
        return { success: false, message: 'Erro.' }
    }
}

export async function applyMedicationDose(medicationId: string, admissionId: string, notes?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

        // log dose
        await supabase.from('hospital_medication_logs').insert({
            org_id: profile!.org_id,
            medication_id: medicationId,
            admission_id: admissionId,
            applied_by: user.id,
            notes: notes || null
        })

        // calculate next dose
        const { data: med } = await supabase.from('hospital_medications').select('frequency_hours').eq('id', medicationId).single()
        if (med && med.frequency_hours) {
            const next = new Date()
            next.setHours(next.getHours() + med.frequency_hours)
            await supabase.from('hospital_medications').update({ next_dose_at: next.toISOString() }).eq('id', medicationId)
        } else {
            // single dose, maybe inactive it
            await supabase.from('hospital_medications').update({ is_active: false }).eq('id', medicationId)
        }

        revalidatePath('/owner/hospital')
        return { success: true, message: 'Dose aplicada com sucesso!' }
    } catch (e) {
        return { success: false, message: 'Erro.' }
    }
}

export async function getMedicationLogs(admissionId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('hospital_medication_logs')
        .select(`
            id,
            applied_at,
            notes,
            hospital_medications (name, dosage),
            profiles:applied_by (full_name)
        `)
        .eq('admission_id', admissionId)
        .order('applied_at', { ascending: false })

    if (error) console.error('getMedicationLogs ERROR:', error)
    return data || []
}

export async function getHospitalObservations(admissionId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('hospital_observations')
        .select(`
            id,
            observation,
            created_at,
            profiles:created_by (full_name)
        `)
        .eq('admission_id', admissionId)
        .order('created_at', { ascending: false })
    return data || []
}

export async function addHospitalObservation(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado.' }
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

        const admissionId = formData.get('admissionId') as string
        const observation = formData.get('observation') as string

        const { error } = await supabase.from('hospital_observations').insert({
            org_id: profile!.org_id,
            admission_id: admissionId,
            observation,
            created_by: user.id
        })

        if (error) throw error
        return { success: true, message: 'Observação salva com sucesso.' }
    } catch {
        return { success: false, message: 'Erro ao salvar.' }
    }
}

export async function getPetAdmissionsHistory(petId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('hospital_admissions')
        .select(`
            *,
            pets (*, customers (name)),
            hospital_beds (name, hospital_wards(name))
        `)
        .eq('pet_id', petId)
        .order('admitted_at', { ascending: false })

    if (error) console.error('getPetAdmissionsHistory', error)
    return data || []
}

export async function getAllAdmissionMedications(admissionId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('hospital_medications')
        .select('*')
        .eq('admission_id', admissionId)
        .order('created_at', { ascending: true })

    return data || []
}
