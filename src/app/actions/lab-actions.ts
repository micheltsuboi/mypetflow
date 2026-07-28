'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface LabReferenceRange {
    id?: string
    species: string // 'dog' | 'cat' | 'other' | 'all'
    age_category: string // 'puppy' | 'adult' | 'senior' | 'all'
    min_value?: number | null
    max_value?: number | null
    text_reference?: string | null
}

export interface LabParameter {
    id: string
    exam_id: string
    name: string
    unit?: string | null
    order: number
    ranges: LabReferenceRange[]
}

export interface LabExam {
    id: string
    org_id: string
    name: string
    category: string
    base_price: number
    description?: string | null
    is_active: boolean
    parameters?: LabParameter[]
}

export async function getLabExamsCatalog(): Promise<LabExam[]> {
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

        const { data: exams, error } = await supabase
            .from('lab_exams')
            .select('*, lab_parameters(*, lab_reference_ranges(*))')
            .eq('org_id', profile.org_id)
            .eq('is_active', true)
            .order('name')

        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                console.warn('Tabela lab_exams ainda não criada no banco.')
                return []
            }
            console.error('Erro ao buscar catálogo de exames do laboratório:', error)
            return []
        }

        return (exams || []).map((e: any) => ({
            ...e,
            base_price: Number(e.base_price) || 0,
            parameters: (e.lab_parameters || []).map((p: any) => ({
                ...p,
                order: Number(p.order) || 0,
                ranges: (p.lab_reference_ranges || []).map((r: any) => ({
                    ...r,
                    min_value: r.min_value !== null ? Number(r.min_value) : null,
                    max_value: r.max_value !== null ? Number(r.max_value) : null
                }))
            })).sort((a: any, b: any) => a.order - b.order)
        }))
    } catch (err) {
        console.error('Erro de servidor em getLabExamsCatalog:', err)
        return []
    }
}

export async function saveLabExam(formData: FormData) {
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
        const category = (formData.get('category') as string || 'Geral').trim()
        const base_price = Math.max(0, parseFloat(formData.get('base_price') as string || '0'))
        const description = formData.get('description') as string || ''

        if (!name) return { success: false, message: 'Nome do exame é obrigatório.' }

        const payload: any = {
            org_id: profile.org_id,
            name,
            category,
            base_price,
            description: description.trim() || null,
            is_active: true,
            updated_at: new Date().toISOString()
        }

        if (id) {
            const { error } = await supabase
                .from('lab_exams')
                .update(payload)
                .eq('id', id)
                .eq('org_id', profile.org_id)
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('lab_exams')
                .insert([payload])
            if (error) throw error
        }

        revalidatePath('/owner/laboratorio')
        revalidatePath('/owner/laboratorio/parametros')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao salvar exame no laboratório:', err)
        return { success: false, message: err.message || 'Erro ao salvar exame' }
    }
}

export async function deleteLabExam(examId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        const { error } = await supabase
            .from('lab_exams')
            .update({ is_active: false })
            .eq('id', examId)
            .eq('org_id', profile.org_id)

        if (error) throw error

        revalidatePath('/owner/laboratorio')
        revalidatePath('/owner/laboratorio/parametros')
        return { success: true }
    } catch (err: any) {
        return { success: false, message: err.message || 'Erro ao desativar exame' }
    }
}

export async function saveLabParameter(examId: string, name: string, unit: string, ranges: any[]) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        const cleanName = (name || '').trim()
        if (!cleanName) return { success: false, message: 'Nome do parâmetro é obrigatório.' }

        // Insert parameter
        const { data: param, error: paramError } = await supabase
            .from('lab_parameters')
            .insert([{
                org_id: profile.org_id,
                exam_id: examId,
                name: cleanName,
                unit: (unit || '').trim() || null
            }])
            .select()
            .single()

        if (paramError) throw paramError

        // Insert ranges
        if (ranges && ranges.length > 0) {
            const rangesToInsert = ranges.map(r => ({
                org_id: profile.org_id,
                parameter_id: param.id,
                species: r.species || 'all',
                age_category: r.age_category || 'all',
                min_value: r.min_value !== undefined && r.min_value !== '' ? parseFloat(r.min_value) : null,
                max_value: r.max_value !== undefined && r.max_value !== '' ? parseFloat(r.max_value) : null,
                text_reference: r.text_reference || null
            }))

            await supabase.from('lab_reference_ranges').insert(rangesToInsert)
        }

        revalidatePath('/owner/laboratorio/parametros')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao salvar parâmetro:', err)
        return { success: false, message: err.message || 'Erro ao salvar parâmetro' }
    }
}

export async function deleteLabParameter(parameterId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        const { error } = await supabase
            .from('lab_parameters')
            .delete()
            .eq('id', parameterId)
            .eq('org_id', profile.org_id)

        if (error) throw error

        revalidatePath('/owner/laboratorio/parametros')
        return { success: true }
    } catch (err: any) {
        return { success: false, message: err.message || 'Erro ao excluir parâmetro' }
    }
}

export async function getLabRequests(filters?: { pet_id?: string; status?: string }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return []

        let query = supabase
            .from('lab_requests')
            .select('*, pets(name, species, breed, birth_date, gender, physical_file_number), customers(name, phone_1), lab_exams(name, category), veterinarians(name, crmv)')
            .eq('org_id', profile.org_id)
            .order('requested_at', { ascending: false })

        if (filters?.pet_id) {
            query = query.eq('pet_id', filters.pet_id)
        }
        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        const { data, error } = await query
        if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
                return []
            }
            console.error('Erro ao buscar requisições de laboratório:', error)
            return []
        }

        return data || []
    } catch (err) {
        console.error('Erro em getLabRequests:', err)
        return []
    }
}

export async function createLabRequest(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        const pet_id = formData.get('pet_id') as string
        const exam_id = formData.get('exam_id') as string
        const veterinarian_id = (formData.get('veterinarian_id') as string) || null
        const notes = (formData.get('notes') as string) || ''

        if (!pet_id || !exam_id) {
            return { success: false, message: 'Pet e Exame são obrigatórios.' }
        }

        // Buscar tutor do pet
        const { data: pet } = await supabase
            .from('pets')
            .select('customer_id')
            .eq('id', pet_id)
            .single()

        const { error } = await supabase
            .from('lab_requests')
            .insert([{
                org_id: profile.org_id,
                pet_id,
                tutor_id: pet?.customer_id || null,
                exam_id,
                veterinarian_id,
                status: 'pending',
                notes: notes.trim() || null,
                created_by: user.id
            }])

        if (error) throw error

        revalidatePath('/owner/laboratorio')
        revalidatePath('/owner/pets')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao criar requisição de exame:', err)
        return { success: false, message: err.message || 'Erro ao criar requisição' }
    }
}

export async function saveLabResults(requestId: string, resultsMap: Record<string, string>, conclusion: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, message: 'Não autorizado' }

        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) return { success: false, message: 'Org não encontrada' }

        // Fetch request, pet species/birth_date and parameter ranges
        const { data: request } = await supabase
            .from('lab_requests')
            .select('*, pets(species, birth_date), lab_exams(*, lab_parameters(*, lab_reference_ranges(*)))')
            .eq('id', requestId)
            .single()

        if (!request) return { success: false, message: 'Requisição não encontrada.' }

        // Calculate pet species and age category
        const species = (request.pets?.species || '').toLowerCase().includes('cat') || (request.pets?.species || '').toLowerCase().includes('gato') ? 'cat' : 'dog'
        let ageCategory = 'adult'
        if (request.pets?.birth_date) {
            const birth = new Date(request.pets.birth_date)
            const ageYears = (new Date().getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            if (ageYears < 1) ageCategory = 'puppy'
            else if (ageYears >= 7) ageCategory = 'senior'
        }

        // Process results
        const resultsToInsert: any[] = []

        const paramsList = request.lab_exams?.lab_parameters || []

        for (const p of paramsList) {
            const valStr = resultsMap[p.id]
            if (valStr !== undefined && valStr !== null && valStr.trim() !== '') {
                const observedNum = parseFloat(valStr.replace(',', '.'))
                let isAbnormal = false
                let abnormalType: string | null = null

                // Find matching reference range
                const ranges = p.lab_reference_ranges || []
                const matchedRange = ranges.find((r: any) =>
                    (r.species === species || r.species === 'all') &&
                    (r.age_category === ageCategory || r.age_category === 'all')
                ) || ranges[0]

                if (matchedRange && !isNaN(observedNum)) {
                    if (matchedRange.min_value !== null && observedNum < Number(matchedRange.min_value)) {
                        isAbnormal = true
                        abnormalType = 'low'
                    } else if (matchedRange.max_value !== null && observedNum > Number(matchedRange.max_value)) {
                        isAbnormal = true
                        abnormalType = 'high'
                    }
                }

                resultsToInsert.push({
                    org_id: profile.org_id,
                    request_id: requestId,
                    parameter_id: p.id,
                    observed_value: valStr.trim(),
                    is_abnormal: isAbnormal,
                    abnormal_type: abnormalType
                })
            }
        }

        // Delete old results for this request if re-laudando
        await supabase.from('lab_results').delete().eq('request_id', requestId)

        if (resultsToInsert.length > 0) {
            await supabase.from('lab_results').insert(resultsToInsert)
        }

        // Update request status to completed
        await supabase
            .from('lab_requests')
            .update({
                status: 'completed',
                conclusion: (conclusion || '').trim() || null,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId)

        revalidatePath('/owner/laboratorio')
        revalidatePath('/owner/pets')
        return { success: true }
    } catch (err: any) {
        console.error('Erro ao salvar laudo laboratorial:', err)
        return { success: false, message: err.message || 'Erro ao salvar resultados do laudo' }
    }
}

export async function getLabReportData(requestId: string) {
    try {
        const supabase = await createClient()

        const { data: request } = await supabase
            .from('lab_requests')
            .select(`
                *,
                organizations(name, logo_url, wa_api_url),
                pets(id, name, species, breed, gender, birth_date, physical_file_number),
                customers(name, phone_1, document),
                veterinarians(name, crmv),
                lab_exams(id, name, category, description, lab_parameters(*, lab_reference_ranges(*))),
                lab_results(*)
            `)
            .eq('id', requestId)
            .single()

        if (!request) return null

        // Map results to parameters
        const resultsMap = new Map<string, any>()
        if (request.lab_results) {
            request.lab_results.forEach((r: any) => {
                resultsMap.set(r.parameter_id, r)
            })
        }

        // Determine pet age & species for reference ranges
        const species = (request.pets?.species || '').toLowerCase().includes('cat') || (request.pets?.species || '').toLowerCase().includes('gato') ? 'cat' : 'dog'
        let ageCategory = 'adult'
        let ageText = 'N/I'

        if (request.pets?.birth_date) {
            const birth = new Date(request.pets.birth_date)
            const ageYears = (new Date().getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            if (ageYears < 1) {
                ageCategory = 'puppy'
                const months = Math.max(1, Math.round(ageYears * 12))
                ageText = `${months} mes(es)`
            } else if (ageYears >= 7) {
                ageCategory = 'senior'
                ageText = `${Math.floor(ageYears)} ano(s) (Sênior)`
            } else {
                ageCategory = 'adult'
                ageText = `${Math.floor(ageYears)} ano(s)`
            }
        }

        const parametersWithResults = (request.lab_exams?.lab_parameters || []).map((p: any) => {
            const res = resultsMap.get(p.id)
            const ranges = p.lab_reference_ranges || []
            const ref = ranges.find((r: any) =>
                (r.species === species || r.species === 'all') &&
                (r.age_category === ageCategory || r.age_category === 'all')
            ) || ranges[0]

            return {
                id: p.id,
                name: p.name,
                unit: p.unit,
                observedValue: res ? res.observed_value : '',
                isAbnormal: res ? Boolean(res.is_abnormal) : false,
                abnormalType: res ? res.abnormal_type : null,
                referenceText: ref ? (
                    ref.text_reference ? ref.text_reference : (
                        ref.min_value !== null && ref.max_value !== null ? `${ref.min_value} - ${ref.max_value}` :
                        ref.min_value !== null ? `>= ${ref.min_value}` :
                        ref.max_value !== null ? `<= ${ref.max_value}` : 'Sem ref.'
                    )
                ) : 'Sem ref.'
            }
        })

        return {
            request,
            org: request.organizations,
            pet: {
                ...request.pets,
                ageText
            },
            tutor: request.customers,
            vet: request.veterinarians,
            exam: request.lab_exams,
            parametersWithResults
        }
    } catch (err) {
        console.error('Erro em getLabReportData:', err)
        return null
    }
}
