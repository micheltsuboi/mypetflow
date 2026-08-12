'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

interface CreatePetState {
    message: string
    success: boolean
}

export async function createPet(prevState: CreatePetState, formData: FormData) {
    const supabase = await createClient()

    // 1. Verify Authentication & Authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { message: 'Não autorizado. Faça login primeiro.', success: false }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', user.id)
        .single()

    if (!profile || !['superadmin', 'admin', 'staff'].includes(profile.role)) {
        return { message: 'Permissão negada.', success: false }
    }

    // 2. Extract Data
    const customerId = formData.get('customerId') as string
    const name = formData.get('name') as string
    const species = formData.get('species') as string
    const breed = formData.get('breed') as string
    const gender = formData.get('gender') as string
    const size = formData.get('size') as string
    const weight = formData.get('weight') ? parseFloat(formData.get('weight') as string) : null
    const birthDateStr = formData.get('birthDate') as string
    const isNeutered = formData.get('isNeutered') === 'on'
    const existing_conditions = formData.get('existing_conditions') as string
    const vaccination_up_to_date = formData.get('vaccination_up_to_date') === 'on'
    const color = formData.get('color') as string
    const characteristics = formData.get('characteristics') as string

    if (!customerId || !name || !species || !gender || !size) {
        return { message: 'Campos obrigatórios faltando (Tutor, Nome, Espécie, Sexo, Porte).', success: false }
    }

    // 3. Create Pet Record (Using Admin Client to bypass complex policies if needed, though standard client should work for staff)
    const supabaseAdmin = createAdminClient()

    // Validate if customer belongs to org
    const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('org_id', profile.org_id)
        .single()

    if (!customer) {
        return { message: 'Tutor inválido ou não pertence à sua organização.', success: false }
    }

    const photo_url = formData.get('photo_url') as string
    const isAdapted = formData.get('is_adapted') === 'on'
    const isDeceased = formData.get('is_deceased') === 'on'

    const insertPayload: any = {
        customer_id: customerId,
        name: name,
        species: species as 'dog' | 'cat' | 'other',
        breed: breed || null,
        gender: gender as 'male' | 'female',
        size: size as 'small' | 'medium' | 'large' | 'giant',
        weight_kg: weight,
        birth_date: birthDateStr ? new Date(birthDateStr).toISOString() : null,
        is_neutered: isNeutered,
        existing_conditions: existing_conditions || null,
        vaccination_up_to_date: vaccination_up_to_date,
        photo_url: photo_url || null,
        is_adapted: isAdapted,
        color: color || null,
        characteristics: characteristics || null,
        is_deceased: isDeceased
    }

    let { error } = await supabaseAdmin
        .from('pets')
        .insert(insertPayload)

    if (error && error.message.includes('is_deceased')) {
        delete insertPayload.is_deceased
        const retry = await supabaseAdmin
            .from('pets')
            .insert(insertPayload)
        error = retry.error
    }

    if (error) {
        return { message: `Erro ao cadastrar pet: ${error.message}`, success: false }
    }

    revalidatePath('/owner/pets')
    return { message: 'Pet cadastrado com sucesso!', success: true }
}

export async function updatePet(prevState: CreatePetState, formData: FormData) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const id = formData.get('id') as string
    if (!id) return { message: 'ID não fornecido.', success: false }

    const name = formData.get('name') as string
    const species = formData.get('species') as string
    const breed = formData.get('breed') as string
    const gender = formData.get('gender') as string
    const size = formData.get('size') as string
    const weight = formData.get('weight') ? parseFloat(formData.get('weight') as string) : null
    const birthDateStr = formData.get('birthDate') as string
    const isNeutered = formData.get('isNeutered') === 'on'
    const customerId = formData.get('customerId') as string
    const existing_conditions = formData.get('existing_conditions') as string
    const vaccination_up_to_date = formData.get('vaccination_up_to_date') === 'on'
    const photo_url = formData.get('photo_url') as string
    const isAdapted = formData.get('is_adapted') === 'on'
    const color = formData.get('color') as string
    const characteristics = formData.get('characteristics') as string
    const isDeceased = formData.get('is_deceased') === 'on'


    const supabaseAdmin = createAdminClient()

    const updatePayload: any = {
        name,
        species: species as 'dog' | 'cat' | 'other',
        breed: breed || null,
        gender: gender as 'male' | 'female',
        size: size as 'small' | 'medium' | 'large' | 'giant',
        weight_kg: weight,
        birth_date: birthDateStr ? new Date(birthDateStr).toISOString() : null,
        is_neutered: isNeutered,
        customer_id: customerId,
        existing_conditions: existing_conditions || null,
        vaccination_up_to_date: vaccination_up_to_date,
        photo_url: photo_url || null,
        is_adapted: isAdapted,
        color: color || null,
        characteristics: characteristics || null,
        is_deceased: isDeceased
    }

    // Update
    let { error } = await supabaseAdmin
        .from('pets')
        .update(updatePayload)
        .eq('id', id)

    if (error && error.message.includes('is_deceased')) {
        delete updatePayload.is_deceased
        const retry = await supabaseAdmin
            .from('pets')
            .update(updatePayload)
            .eq('id', id)
        error = retry.error
    }

    if (error) {
        return { message: `Erro ao atualizar pet: ${error.message}`, success: false }
    }

    if (isDeceased) {
        // Cancelar todos os agendamentos pendentes ou confirmados do pet falecido
        const { error: cancelError } = await supabaseAdmin
            .from('appointments')
            .update({ 
                status: 'canceled',
                notes: '🚫 Agendamento cancelado automaticamente (Pet marcado como falecido)'
            })
            .eq('pet_id', id)
            .in('status', ['pending', 'confirmed'])

        if (cancelError) {
            console.error('Erro ao cancelar agendamentos do pet falecido:', cancelError)
        }
    }

    revalidatePath('/owner/pets')
    revalidatePath('/tutor/avaliacoes')
    return { message: 'Pet atualizado com sucesso!', success: true }
}

export async function deletePet(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { message: 'Não autorizado.', success: false }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from('pets').delete().eq('id', id)

    if (error) {
        return { message: `Erro ao excluir: ${error.message}`, success: false }
    }

    revalidatePath('/owner/pets')
    return { message: 'Pet excluído com sucesso!', success: true }
}

export async function createPetByTutor(prevState: CreatePetState, formData: FormData) {
    const supabase = await createClient()

    // 1. Verify Authentication & Authorization (Customer)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { message: 'Não autorizado. Faça login primeiro.', success: false }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return { message: 'Erro ao verificar permissão.', success: false }
    }

    // 2. Get Customer Record
    const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!customer) {
        return { message: 'Cadastro de tutor incompleto.', success: false }
    }

    // 3. Extract Data
    const name = formData.get('name') as string
    const species = formData.get('species') as string
    const breed = formData.get('breed') as string
    const gender = formData.get('gender') as string
    const size = formData.get('size') as string
    const weight = formData.get('weight') ? parseFloat(formData.get('weight') as string) : null
    const birthDateStr = formData.get('birthDate') as string
    const isNeutered = formData.get('isNeutered') === 'on'
    const existing_conditions = formData.get('existing_conditions') as string
    const vaccination_up_to_date = formData.get('vaccination_up_to_date') === 'on'
    const photo_url = formData.get('photo_url') as string
    const color = formData.get('color') as string
    const characteristics = formData.get('characteristics') as string

    if (!name || !species || !gender || !size) {
        return { message: 'Nome, Espécie, Sexo e Porte são obrigatórios.', success: false }
    }

    const supabaseAdmin = createAdminClient()

    // 4. Create Pet
    const { error } = await supabaseAdmin
        .from('pets')
        .insert({
            customer_id: customer.id,
            name: name,
            species: species as 'dog' | 'cat' | 'other',
            breed: breed || null,
            gender: gender as 'male' | 'female',
            size: size as 'small' | 'medium' | 'large' | 'giant',
            weight_kg: weight,
            birth_date: birthDateStr ? new Date(birthDateStr).toISOString() : null,
            is_neutered: isNeutered,
            existing_conditions: existing_conditions || null,
            vaccination_up_to_date: vaccination_up_to_date,
            photo_url: photo_url || null,
            color: color || null,
            characteristics: characteristics || null
        })

    if (error) {
        return { message: `Erro ao cadastrar pet: ${error.message}`, success: false }
    }

    revalidatePath('/tutor')
    return { message: 'Seu pet foi cadastrado com sucesso!', success: true }
}

export async function getHotelHistory(petId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, scheduled_at, status, 
            services!inner(name, category)
        `)
        .eq('pet_id', petId)
        .eq('services.category', 'Hospedagem')
        .order('scheduled_at', { ascending: false })

    if (error) return { success: false, message: error.message }
    return { success: true, data }
}

export async function getCrecheHistory(petId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, scheduled_at, status, 
            services!inner(name, category)
        `)
        .eq('pet_id', petId)
        .eq('services.category', 'Creche')
        .order('scheduled_at', { ascending: false })

    if (error) return { success: false, message: error.message }
    return { success: true, data }
}


export async function searchPets(query: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Não autorizado', data: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()
    
    if (!profile?.org_id) return { success: false, message: 'Org não encontrada', data: [] }

    try {
        const words = query.trim().split(/\s+/).filter(w => w.length > 0)
        if (words.length === 0) return { success: true, data: [] }

        // Normalização de string para busca case-insensitive e acento-insensitive
        const normalizeStr = (str: string) => {
            if (!str) return ""
            return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        }

        const petNameFilters = words.map(w => `name.ilike.%${w}%`).join(",")
        const custFilters = words.map(w => `name.ilike.%${w}%,physical_file_number.ilike.%${w}%`).join(",")

        // 1. Buscar pets candidatos pelo nome do pet
        let petsCandidate: any[] = []
        let petsByCustomer: any[] = []
        let hasDeceasedColumn = true

        // Tentamos buscar com a coluna is_deceased
        const resPets = await supabase
            .from('pets')
            .select(`
                id, name, species, breed, is_deceased,
                customers!inner(name, physical_file_number, org_id)
            `)
            .eq('customers.org_id', profile.org_id)
            .or(petNameFilters)
            .limit(50)

        if (resPets.error) {
            if (resPets.error.message.includes('is_deceased')) {
                hasDeceasedColumn = false
                // Fallback sem is_deceased
                const fallbackPets = await supabase
                    .from('pets')
                    .select(`
                        id, name, species, breed,
                        customers!inner(name, physical_file_number, org_id)
                    `)
                    .eq('customers.org_id', profile.org_id)
                    .or(petNameFilters)
                    .limit(50)
                if (fallbackPets.error) throw fallbackPets.error
                petsCandidate = fallbackPets.data || []
            } else {
                throw resPets.error
            }
        } else {
            petsCandidate = resPets.data || []
        }

        // 2. Buscar tutores candidatos pelo nome do tutor ou número da ficha
        const resCust = await supabase
            .from('customers')
            .select('id')
            .eq('org_id', profile.org_id)
            .or(custFilters)
            .limit(50)

        if (resCust.error) throw resCust.error
        const customers = resCust.data || []

        if (customers.length > 0) {
            const customerIds = customers.map(c => c.id)
            
            // Buscar pets dos tutores candidatos
            let resPetsByCust
            if (hasDeceasedColumn) {
                resPetsByCust = await supabase
                    .from('pets')
                    .select(`
                        id, name, species, breed, is_deceased,
                        customers!inner(name, physical_file_number, org_id)
                    `)
                    .eq('customers.org_id', profile.org_id)
                    .in('customer_id', customerIds)
                    .limit(50)
            } else {
                resPetsByCust = await supabase
                    .from('pets')
                    .select(`
                        id, name, species, breed,
                        customers!inner(name, physical_file_number, org_id)
                    `)
                    .eq('customers.org_id', profile.org_id)
                    .in('customer_id', customerIds)
                    .limit(50)
            }

            if (resPetsByCust.error) throw resPetsByCust.error
            petsByCustomer = resPetsByCust.data || []
        }

        // 3. Unir e remover duplicados
        const candidatesMap = new Map()
        ;[...petsCandidate, ...petsByCustomer].forEach(p => {
            if (p && p.id) candidatesMap.set(p.id, p)
        })

        const candidates = Array.from(candidatesMap.values())

        // 4. Filtrar em memória: todas as palavras devem constar em pelo menos um campo do pet/tutor
        const normalizedWords = words.map(w => normalizeStr(w))

        const filtered = candidates.filter(pet => {
            // Se tiver a coluna, filtrar pets falecidos para não permitir agendamentos
            if (hasDeceasedColumn && pet.is_deceased) {
                return false
            }

            const petName = normalizeStr(pet.name)
            const petBreed = normalizeStr(pet.breed || "")
            const custName = normalizeStr(pet.customers?.name || "")
            const custFile = normalizeStr(pet.customers?.physical_file_number || "")

            return normalizedWords.every(word => {
                return petName.includes(word) || 
                       petBreed.includes(word) || 
                       custName.includes(word) || 
                       custFile.includes(word)
            })
        })

        // Retornamos no máximo 10 resultados para otimizar o dropdown do frontend
        return { success: true, data: filtered.slice(0, 10) }

    } catch (error: any) {
        console.error('Error searching pets:', error)
        return { success: false, message: error.message, data: [] }
    }
}
