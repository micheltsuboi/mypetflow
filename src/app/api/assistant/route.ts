import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pageHelpData, PageHelpSection } from '@/config/pageHelpData'

// Mapeamento de termos para tópicos da base de conhecimento estática
const topicSynonyms: Record<string, string[]> = {
    services: ['servico', 'serviço', 'servicos', 'serviços', 'cadastro de servico', 'cadastro de serviço', 'criar servico', 'criar serviço', 'checklist', 'matriz de preco', 'matriz de preço', 'porte', 'peso'],
    packages: ['pacote', 'pacotes', 'contrato', 'contratos', 'credito', 'crédito', 'validade', 'sessoes', 'sessões', 'contratar pacote'],
    pets: ['pet', 'pets', 'animal', 'animais', 'cachorro', 'gato', 'cao', 'cão', 'raca', 'raça', 'prontuario', 'prontuário', 'peso', 'porte'],
    tutors: ['tutor', 'tutores', 'cliente', 'clientes', 'responsavel', 'responsável', 'whatsapp', 'cpf', 'cadastro de tutor', 'cadastro de cliente'],
    'banho-tosa': ['banho', 'tosa', 'banhista', 'tosador', 'kanban', 'diario de bordo', 'diário de bordo', 'pet pronto', 'estetica', 'estética'],
    creche: ['creche', 'daycare', 'recreacao', 'recreação', 'presenca', 'presença', 'check-in creche', 'check-out creche', 'relatorio diario', 'relatório diário'],
    hospedagem: ['hospedagem', 'hotel', 'hotelzinho', 'reserva', 'reservas', 'quarto', 'quartos', 'baia', 'baías', 'diaria', 'diária'],
    financeiro: ['financeiro', 'caixa', 'fluxo de caixa', 'pagar', 'receber', 'contas', 'despesa', 'despesas', 'receita', 'receitas', 'faturamento'],
    mensalidades: ['mensalidade', 'mensalidades', 'recorrente', 'recorrência', 'assinatura', 'assinaturas', 'fatura', 'faturas', 'cobranca', 'cobrança'],
    petshop: ['petshop', 'loja', 'produto', 'produtos', 'estoque', 'venda', 'vendas', 'pdv', 'frente de caixa', 'comanda', 'codigo de barras', 'código de barras'],
    cashback: ['cashback', 'fidelidade', 'pontos', 'programa de fidelidade', 'resgate', 'desconto cashback'],
    vacinas: ['vacina', 'vacinas', 'vacinacao', 'vacinação', 'reforco', 'reforço', 'antirrabica', 'antirrábica', 'v8', 'v10', 'carteira de vacina', 'carteira de vacinação'],
    veterinary: ['veterinario', 'veterinário', 'veterinarios', 'veterinários', 'crmv', 'medico', 'médico', 'comissao', 'comissão'],
    consultas: ['consulta', 'consultas', 'anamnese', 'receita', 'receitas', 'prescricao', 'prescrição', 'atestado', 'atestados', 'clinica', 'clínica'],
    exams: ['exame', 'exames', 'catalogo de exames', 'catálogo de exames', 'laudo', 'laudos', 'ultrassom', 'raio-x', 'hemograma'],
    hospital: ['hospital', 'internacao', 'internação', 'leito', 'leitos', 'canil', 'canis', 'evolucao', 'evolução', 'aprazamento', 'alta'],
    assessment: ['assessment', 'questionario', 'questionário', 'avaliacao', 'avaliação', 'comportamento', 'comportamental', 'sociabilidade', 'temperamento'],
    usuarios: ['usuario', 'usuário', 'usuarios', 'usuários', 'permissao', 'permissão', 'permissoes', 'permissões', 'convidar', 'papel', 'owner', 'admin', 'staff'],
    ponto: ['ponto', 'banco de horas', 'horas extras', 'espelho de ponto', 'trabalho', 'entrada', 'saida', 'saída'],
    integracoes: ['integracao', 'integração', 'integracoes', 'integrações', 'whatsapp bot', 'webhook', 'webhooks', 'n8n', 'qr code', 'zapi', 'z-api'],
    'disparo-massa': ['disparo', 'disparo em massa', 'marketing', 'comunicado', 'comunicados', 'mensagem em massa', 'mensagens em massa'],
    'nota-fiscal': ['nota', 'notas', 'nota fiscal', 'notas fiscais', 'nfs-e', 'emissao', 'emissão', 'fiscal', 'certificado digital'],
    agenda: ['agenda', 'agendamento', 'agendamentos', 'calendario', 'calendário', 'marcar', 'desmarcar', 'horario', 'horário'],
    laboratorio: ['laboratorio', 'laboratório', 'laudar', 'resultado de exame', 'resultados de exames', 'valores de referencia', 'valores de referência']
}

// Helper para normalizar o texto para busca (remover acentos e colocar em minúsculas)
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[?.,!;\(\)]/g, ' ') // Remove pontuação
        .trim()
}

// ==========================================
// FUNÇÕES DE BANCO DE DADOS (SUPABASE QUERIES)
// ==========================================

async function getVaccinesExpiring(supabase: any, days: number = 7) {
    try {
        const today = new Date()
        const todayStr = today.toLocaleDateString('en-CA') // YYYY-MM-DD local
        
        const futureDate = new Date()
        futureDate.setDate(today.getDate() + days)
        const futureStr = futureDate.toLocaleDateString('en-CA')

        const { data, error } = await supabase
            .from('pet_vaccines')
            .select(`
                name,
                expiry_date,
                pets (
                    name,
                    is_deceased,
                    customers (
                        name,
                        phone_1
                    )
                )
            `)
            .gte('expiry_date', todayStr)
            .lte('expiry_date', futureStr)

        console.log(`getVaccinesExpiring raw data for ${days} days:`, JSON.stringify(data, null, 2), 'error:', error)

        if (error) throw error

        const filteredData = (data || []).filter((item: any) => {
            const pet = Array.isArray(item.pets) ? item.pets[0] : item.pets
            return pet && !pet.is_deceased
        })

        if (filteredData.length === 0) {
            return { message: `Nenhuma vacina de pets ativos está programada para vencer nos próximos ${days} dias.` }
        }

        return filteredData.map((item: any) => {
            const pet = Array.isArray(item.pets) ? item.pets[0] : item.pets
            return {
                vacina: item.name,
                vencimento: item.expiry_date,
                pet: pet?.name || 'Não informado',
                tutor: pet?.customers?.name || 'Não informado',
                whatsapp: pet?.customers?.phone_1 || 'Não informado'
            }
        })
    } catch (err: any) {
        console.error('Erro ao buscar vacinas:', err)
        return { error: `Falha ao buscar vacinas a vencer nos próximos ${days} dias.` }
    }
}

async function getTodayAppointments(supabase: any) {
    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
            .from('appointments')
            .select(`
                id,
                scheduled_at,
                status,
                pets (name),
                services (name)
            `)
            .gte('scheduled_at', startOfDay.toISOString())
            .lte('scheduled_at', endOfDay.toISOString())
            .order('scheduled_at', { ascending: true })

        if (error) throw error

        if (!data || data.length === 0) {
            return { message: 'Não há agendamentos agendados para a data de hoje.' }
        }

        const statusMap: Record<string, string> = {
            pending: 'Pendente',
            confirmed: 'Confirmado',
            in_progress: 'Em Andamento',
            done: 'Concluído',
            canceled: 'Cancelado',
            no_show: 'Falta'
        }

        return data.map((item: any) => ({
            horario: new Date(item.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            pet: item.pets?.name || 'Não informado',
            servico: item.services?.name || 'Não informado',
            status: statusMap[item.status] || item.status
        }))
    } catch (err: any) {
        console.error('Erro ao buscar agendamentos:', err)
        return { error: 'Falha ao buscar agendamentos do dia no banco de dados.' }
    }
}

async function getPetDetails(supabase: any, petName: string) {
    try {
        if (!petName || petName.length < 2) {
            return { error: 'Por favor, informe um nome de pet válido com pelo menos 2 caracteres para busca.' }
        }

        const { data, error } = await supabase
            .from('pets')
            .select(`
                name,
                species,
                breed,
                size,
                weight_kg,
                gender,
                medical_notes,
                allergies,
                temperament,
                special_care,
                customers (
                    name,
                    phone_1
                )
            `)
            .ilike('name', `%${petName}%`)
            .limit(5)

        console.log(`getPetDetails raw data for "${petName}":`, JSON.stringify(data, null, 2), 'error:', error)

        if (error) throw error

        if (!data || data.length === 0) {
            return { message: `Nenhum pet encontrado com o nome contendo "${petName}".` }
        }

        const speciesMap: Record<string, string> = {
            dog: 'Cão',
            cat: 'Gato',
            other: 'Outro'
        }

        const sizeMap: Record<string, string> = {
            small: 'Pequeno',
            medium: 'Médio',
            large: 'Grande',
            giant: 'Gigante'
        }

        const genderMap: Record<string, string> = {
            male: 'Macho',
            female: 'Fêmea'
        }

        return data.map((item: any) => ({
            nome: item.name,
            especie: speciesMap[item.species] || item.species,
            raca: item.breed || 'Não informada',
            porte: sizeMap[item.size] || 'Não informado',
            peso: item.weight_kg ? `${item.weight_kg} kg` : 'Não informado',
            genero: genderMap[item.gender] || 'Não informado',
            temperamento: item.temperament || 'Não informado',
            alergias: item.allergies || 'Nenhuma registrada',
            cuidados_especiais: item.special_care || 'Nenhum registrado',
            notas_medicas: item.medical_notes || 'Nenhuma registrada',
            tutor: item.customers?.name || 'Não cadastrado',
            whatsapp_tutor: item.customers?.phone_1 || 'Não cadastrado'
        }))
    } catch (err: any) {
        console.error('Erro ao buscar pet:', err)
        return { error: 'Falha ao buscar ficha do pet no banco de dados.' }
    }
}

async function scheduleAppointmentAI(supabase: any, petName: string, serviceName: string, scheduledAt: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Usuário não autenticado.' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()
            
        if (!profile?.org_id) return { error: 'Organização não encontrada.' }
        const org_id = profile.org_id

        const { data: pets, error: petError } = await supabase
            .from('pets')
            .select('id, name, customer_id, customers(name)')
            .ilike('name', `%${petName}%`)

        if (petError) {
            console.error('Pet fetch error:', petError)
        }

        if (!pets || pets.length === 0) return { error: `Nenhum pet encontrado com o nome "${petName}".` }
        if (pets.length > 1) {
            const petList = pets.map((p:any) => `${p.name} (Tutor: ${p.customers?.name})`).join(', ')
            return { error: `Encontrei múltiplos pets com nome "${petName}": ${petList}. Por favor, especifique o tutor ou seja mais específico.` }
        }
        const pet = pets[0]

        const { data: services, error: serviceError } = await supabase
            .from('services')
            .select('id, name, category_id, base_price, checklist_template')
            .ilike('name', `%${serviceName}%`)
            .eq('org_id', org_id)

        if (serviceError) {
            console.error('Service fetch error:', serviceError)
        }

        if (!services || services.length === 0) return { error: `Nenhum serviço encontrado contendo "${serviceName}".` }
        const service = services[0]
        
        const finalChecklist = Array.isArray(service.checklist_template) ? service.checklist_template.map((item: string) => ({
            text: item,
            completed: false,
            completed_at: null
        })) : []

        const { error: insertError } = await supabase
            .from('appointments')
            .insert({
                org_id: org_id,
                pet_id: pet.id,
                service_id: service.id,
                service_category_id: service.category_id,
                customer_id: pet.customer_id,
                scheduled_at: scheduledAt,
                status: 'pending',
                checklist: finalChecklist,
                calculated_price: service.base_price || 0,
                final_price: service.base_price || 0,
                payment_status: 'pending'
            })

        if (insertError) {
            console.error('Erro ao agendar:', insertError)
            return { error: `Falha ao salvar agendamento: ${insertError.message}` }
        }

        const dateFormatted = new Date(scheduledAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        return { message: `Agendamento de "${service.name}" para o pet ${pet.name} (Tutor: ${pet.customers?.name || 'Sem tutor'}) marcado com sucesso para ${dateFormatted}!` }

    } catch (err: any) {
        console.error('Erro no scheduleAppointmentAI:', err)
        return { error: 'Ocorreu um erro inesperado ao agendar.' }
    }
}

// Gera a resposta em formato markdown a partir dos dados do tópico estático de ajuda
function formatHelpSection(section: PageHelpSection, topicKey: string): string {
    let response = `### ${section.title}\n\n`
    response += `${section.description}\n\n`

    if (section.steps && section.steps.length > 0) {
        response += `#### 📋 Passo a Passo:\n`
        section.steps.forEach(step => {
            response += `- ${step}\n`
        })
        response += `\n`
    }

    if (section.rules && section.rules.length > 0) {
        response += `#### ⚠️ Regras & Avisos:\n`
        section.rules.forEach(rule => {
            response += `- ${rule}\n`
        })
        response += `\n`
    }

    if (section.tips && section.tips.length > 0) {
        response += `#### 💡 Dicas Práticas:\n`
        section.tips.forEach(tip => {
            response += `- ${tip}\n`
        })
        response += `\n`
    }

    const routeMap: Record<string, string> = {
        services: '/owner/services',
        packages: '/owner/packages',
        pets: '/owner/pets',
        tutors: '/owner/tutors',
        'banho-tosa': '/owner/banho-tosa',
        creche: '/owner/creche',
        hospedagem: '/owner/hospedagem',
        financeiro: '/owner/financeiro',
        mensalidades: '/owner/mensalidades',
        petshop: '/owner/petshop',
        cashback: '/owner/cashback',
        vacinas: '/owner/vacinas',
        veterinary: '/owner/veterinary',
        consultas: '/owner/consultas',
        exams: '/owner/exams',
        hospital: '/owner/hospital',
        assessment: '/owner/assessment',
        usuarios: '/owner/usuarios',
        ponto: '/owner/ponto',
        integracoes: '/owner/integracoes',
        'disparo-massa': '/owner/disparo-massa',
        'nota-fiscal': '/owner/nota-fiscal',
        agenda: '/owner/agenda',
        laboratorio: '/owner/laboratorio'
    }

    const route = routeMap[topicKey]
    if (route) {
        response += `🔗 **[Ir para esta tela no sistema](${route})**\n`
    }

    return response
}

export async function POST(req: Request) {
    try {
        const { messages, pathname } = await req.json()

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Mensagens não informadas.' }, { status: 400 })
        }

        const lastMessage = messages[messages.length - 1]
        const userQuery = lastMessage.content || ''
        const normalizedQuery = normalizeText(userQuery)

        // Criar o client do Supabase que lê automaticamente a sessão do cookie do usuário
        const supabase = await createClient()

        // Depurar autenticação do usuário na rota
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('AI Assistant Route Handler - User logged in:', user ? { id: user.id, email: user.email } : 'NONE', 'Auth error:', authError)

        const apiKey = process.env.GEMINI_API_KEY

        if (apiKey) {
            // ==========================================
            // MODO DE IA REAL (GEMINI API) COM FUNCTION CALLING
            // ==========================================
            
            // 1. Construir a base de dados de ajuda estática como instruções de sistema
            let helpContextText = "Aqui está a base de conhecimento de ajuda do sistema MyPet Flow que você DEVE usar para orientar o usuário sobre as telas do sistema:\n\n"
            Object.entries(pageHelpData).forEach(([key, section]) => {
                helpContextText += `TÓPICO: ${key}\n`
                helpContextText += `Título: ${section.title}\n`
                helpContextText += `Descrição: ${section.description}\n`
                if (section.steps) helpContextText += `Passos: ${section.steps.join(' | ')}\n`
                if (section.rules) helpContextText += `Regras: ${section.rules.join(' | ')}\n`
                if (section.tips) helpContextText += `Dicas: ${section.tips.join(' | ')}\n`
                helpContextText += `---\n`
            })

            const systemPrompt = `Você é o "Guia MyPet Flow", um assistente virtual e secretária administrativa integrado no sistema de gestão de petshops e clínicas veterinárias MyPet Flow.
Sua missão é ajudar os usuários a operarem o sistema e buscar dados em tempo real quando solicitado.

Regras de comportamento e segurança de dados:
1. Seja sempre extremamente simpático, prestativo e profissional. Responda em Português do Brasil.
2. Para perguntas conceituais de como usar o sistema (ex: "como crio um serviço"), use a base de conhecimento de ajuda no fim desta instrução.
3. Se o usuário pedir para buscar dados em tempo real (como vacinas vencendo hoje/esta semana, agendamentos de hoje ou buscar informações de um pet específico), você deve OBRIGATORIAMENTE chamar a ferramenta correspondente nas Tools.
4. REGRA CRÍTICA ANTI-ALUCINAÇÃO: Você NUNCA deve inventar dados de vacinas, pets, tutores ou agendamentos. Se as ferramentas retornarem que não há dados, que está vazia ou que nenhuma vacina foi encontrada, responda exatamente que não há registros correspondentes para a data ou termo pesquisado. Nunca invente nomes como "V10", "Theodor" ou invente que encontrou dados se a ferramenta retornou vazio!
5. Se o usuário demonstrar a intenção de cadastrar um NOVO TUTOR (ex: "quero cadastrar o tutor João Silva, CPF 122.333.444-55" ou "cadastrar novo tutor chamado Maria"), você deve:
   - Extrair o nome do tutor e o CPF dele (caso informado).
   - Gerar uma resposta amigável e incluir OBRIGATORIAMENTE um link em formato markdown no seguinte formato exato de URL para abrir a tela de cadastro pré-preenchida no frontend: 
     [Clique aqui para cadastrar [Nome do Tutor]](/owner/tutors?new=true&name=[Nome_com_UrlEncode]&cpf=[CPF_ou_Vazio])
     Exemplo: [Clique aqui para abrir o cadastro de João Silva](/owner/tutors?new=true&name=João%20Silva&cpf=122.333.444-55)
   - Explique para o usuário que, ao clicar no link, o sistema abrirá a tela de cadastro com esses dados já preenchidos.
6. Sempre que instruir o usuário a ir para uma tela normal, inclua links markdown [Nome da Tela](/caminho) (ex: [Cadastro de Serviços](/owner/services), [Agenda](/owner/agenda), [Financeiro](/owner/financeiro)).
7. Se o usuário pedir para AGENDAR ou MARCAR um serviço para um pet, você DEVE usar a ferramenta schedule_appointment. Extraia o nome do pet, o nome do serviço e a data/hora solicitada (formatada em ISO 8601 COM O FUSO HORÁRIO DE BRASÍLIA -03:00). Exemplo: "Agendar banho e tosa para o Theo dia 10 as 14 horas" -> petName="Theo", serviceName="banho e tosa", scheduledAt="2026-09-10T14:00:00-03:00". Atenção: NÃO esqueça do horário, se o usuário disse 15h, o campo deve ser T15:00:00-03:00. Use o ano atual (2026) a menos que especificado.
8. A página atual que o usuário visualiza no dashboard é: "${pathname || 'não informada'}".

${helpContextText}`

            // Converter o histórico para mensagens do Gemini API
            const geminiMessages = messages.map((m: any) => {
                const role = m.role === 'assistant' ? 'model' : 'user'
                return {
                    role,
                    parts: [{ text: m.content }]
                }
            })

            // Definição das Ferramentas (Functions Declarations)
            const tools = [
                {
                    functionDeclarations: [
                        {
                            name: 'get_vaccines_expiring',
                            description: 'Retorna a lista de vacinas de pets que expiram/vencem no período dos próximos X dias na organização do usuário.',
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    days: {
                                        type: 'INTEGER',
                                        description: 'Número de dias para frente a partir de hoje a serem buscados (ex: 1 para hoje, 7 para uma semana, 30 para um mês). Padrão é 7 se não informado.'
                                    }
                                }
                            }
                        },
                        {
                            name: 'get_today_appointments',
                            description: 'Retorna a lista de agendamentos agendados para o dia de hoje, incluindo horário, pet, serviço e status.'
                        },
                        {
                            name: 'get_pet_details',
                            description: 'Busca os dados cadastrais detalhados de um ou mais pets pelo nome, incluindo raça, peso, restrições e o nome/WhatsApp do tutor.',
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    petName: {
                                        type: 'STRING',
                                        description: 'Nome do pet a ser pesquisado (ex: Rex, Pipoca, Theo)'
                                    }
                                },
                                required: ['petName']
                            }
                        },
                        {
                            name: 'schedule_appointment',
                            description: 'Agenda um serviço para um pet em uma data e hora específicas.',
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    petName: {
                                        type: 'STRING',
                                        description: 'Nome do pet a ser agendado (ex: Theo)'
                                    },
                                    serviceName: {
                                        type: 'STRING',
                                        description: 'Nome do serviço a ser agendado (ex: Banho e Tosa, Consulta)'
                                    },
                                    scheduledAt: {
                                        type: 'STRING',
                                        description: 'Data e hora do agendamento no formato ISO 8601 COM fuso horário -03:00 (ex: 2026-09-10T14:00:00-03:00). Nunca esqueça de incluir as horas.'
                                    }
                                },
                                required: ['petName', 'serviceName', 'scheduledAt']
                            }
                        }
                    ]
                }
            ]

            try {
                // Primeira chamada para o Gemini (com tools)
                let geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: geminiMessages,
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            tools: tools,
                            generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
                        })
                    }
                )

                if (!geminiRes.ok) {
                    throw new Error(`Gemini API retornou erro: ${await geminiRes.text()}`)
                }

                let data = await geminiRes.json()
                let responsePart = data.candidates?.[0]?.content?.parts?.[0]

                // Se o Gemini decidir chamar uma função (Function Calling)
                if (responsePart?.functionCall) {
                    const call = responsePart.functionCall
                    const functionName = call.name
                    const args = call.args || {}

                    let functionResult: any

                    // Executar a consulta local apropriada baseada na chamada da IA
                    if (functionName === 'get_vaccines_expiring') {
                        const daysParam = typeof args.days === 'number' ? args.days : 7
                        functionResult = await getVaccinesExpiring(supabase, daysParam)
                    } else if (functionName === 'get_today_appointments') {
                        functionResult = await getTodayAppointments(supabase)
                    } else if (functionName === 'get_pet_details') {
                        functionResult = await getPetDetails(supabase, args.petName)
                    } else if (functionName === 'schedule_appointment') {
                        functionResult = await scheduleAppointmentAI(supabase, args.petName, args.serviceName, args.scheduledAt)
                    } else {
                        functionResult = { error: 'Função desconhecida.' }
                    }

                    // Enviar o resultado de volta para o Gemini formular a resposta final
                    const nextMessages = [
                        ...geminiMessages,
                        data.candidates[0].content,
                        {
                            role: 'user',
                            parts: [
                                {
                                    functionResponse: {
                                        name: functionName,
                                        response: { output: functionResult }
                                    }
                                }
                            ]
                        }
                    ]

                    // Segunda chamada para o Gemini (com o resultado da ferramenta)
                    const finalRes = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: nextMessages,
                                systemInstruction: { parts: [{ text: systemPrompt }] },
                                tools: tools,
                                generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
                            })
                        }
                    )

                    const finalData = await finalRes.json()
                    const finalResponse = finalData.candidates?.[0]?.content?.parts?.[0]?.text

                    return NextResponse.json({ content: finalResponse || 'Erro ao processar resposta final.' })
                }

                // Resposta padrão sem function calling
                return NextResponse.json({ content: responsePart?.text || 'Olá! Como posso ajudar hoje?' })

            } catch (aiError) {
                console.error('Erro na chamada ao Gemini:', aiError)
            }
        }

        // ==========================================
        // MODO FALLBACK LOCAL (BUSCA HEURÍSTICA E QUERIES FIXAS)
        // ==========================================
        
        // 1. Detecção de Intenção: Vacinas Vencendo
        if (normalizedQuery.includes('vacina') && (normalizedQuery.includes('hoje') || normalizedQuery.includes('vencendo') || normalizedQuery.includes('semana') || normalizedQuery.includes('mes') || normalizedQuery.includes('mês') || normalizedQuery.includes('dia'))) {
            let days = 7
            let periodText = 'nos próximos 7 dias'
            
            if (normalizedQuery.includes('hoje')) {
                days = 0
                periodText = 'hoje'
            } else if (normalizedQuery.includes('semana') || normalizedQuery.includes('7 dia')) {
                days = 7
                periodText = 'nos próximos 7 dias'
            } else if (normalizedQuery.includes('mes') || normalizedQuery.includes('mês') || normalizedQuery.includes('30 dia')) {
                days = 30
                periodText = 'nos próximos 30 dias'
            } else {
                // Tenta extrair qualquer número antes de "dia"
                const daysMatch = normalizedQuery.match(/(\d+)\s*dia/)
                if (daysMatch) {
                    days = parseInt(daysMatch[1])
                    periodText = `nos próximos ${days} dias`
                }
            }

            const dataResult = await getVaccinesExpiring(supabase, days)
            if ('error' in dataResult) {
                return NextResponse.json({ content: `⚠️ ${dataResult.error}` })
            }
            if ('message' in dataResult) {
                return NextResponse.json({ content: `🐾 ${dataResult.message}` })
            }

            let msg = `### 💉 Vacinas Vencendo (${periodText.toUpperCase()})\n\nIdentifiquei as seguintes aplicações com expiração nesse período:\n\n`
            dataResult.forEach((item: any) => {
                msg += `- **Pet:** ${item.pet} | **Vacina:** ${item.vacina} | **Vencimento:** ${new Date(item.vencimento).toLocaleDateString('pt-BR')}\n`
                msg += `  - **Tutor:** ${item.tutor} (WhatsApp: [${item.whatsapp}](https://wa.me/55${item.whatsapp.replace(/\D/g, '')}))\n`
            })
            return NextResponse.json({ content: msg })
        }

        // 2. Detecção de Intenção: Agendamentos de Hoje
        if ((normalizedQuery.includes('agenda') || normalizedQuery.includes('agendamento') || normalizedQuery.includes('servico')) && normalizedQuery.includes('hoje')) {
            const dataResult = await getTodayAppointments(supabase)
            if ('error' in dataResult) {
                return NextResponse.json({ content: `⚠️ ${dataResult.error}` })
            }
            if ('message' in dataResult) {
                return NextResponse.json({ content: `📅 ${dataResult.message}` })
            }

            let msg = `### 📅 Agendamentos de Hoje\n\nAqui está a lista de execuções do dia de hoje:\n\n`
            dataResult.forEach((item: any) => {
                msg += `- **${item.horario}** - **Pet:** ${item.pet} | **Serviço:** ${item.servico} | **Status:** *${item.status}*\n`
            })
            msg += `\n🔗 **[Ver Agenda Completa](/owner/agenda)**`
            return NextResponse.json({ content: msg })
        }

        if (normalizedQuery.includes('cadastrar') || normalizedQuery.includes('cadastro') || normalizedQuery.includes('novo tutor') || normalizedQuery.includes('criar tutor') || normalizedQuery.includes('inserir tutor')) {
            // Regex para buscar CPF na string
            const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/
            const cpfMatch = userQuery.match(cpfRegex)
            const cpf = cpfMatch ? cpfMatch[0] : ''

            // Extrair o nome limpando palavras de comando e CPF
            let tutorName = userQuery
                .replace(/quero cadastrar (o|um)?\s*tutor/i, '')
                .replace(/cadastrar (o|um)?\s*tutor/i, '')
                .replace(/cadastro de tutor/i, '')
                .replace(/cadastro/i, '')
                .replace(/novo tutor chamado/i, '')
                .replace(/novo tutor/i, '')
                .replace(/criar tutor/i, '')
                .replace(/inserir tutor/i, '')
                .replace(cpfRegex, '')
                .replace(/cpf/i, '')
                .replace(/com o/i, '')
                .replace(/chamado/i, '')
                .replace(/[.,:;]/g, '')
                .replace(/\s+/g, ' ')
                .trim()

            // Filtro caso a extração resulte em palavras vazias ou sem sentido
            if (tutorName.toLowerCase() === 'tutor' || tutorName.length < 2) {
                tutorName = ''
            }

            if (tutorName) {
                const queryName = encodeURIComponent(tutorName)
                const queryCpf = encodeURIComponent(cpf)
                
                return NextResponse.json({
                    content: `Entendi! Você quer cadastrar um novo tutor chamado **${tutorName}**${cpf ? ` com o CPF **${cpf}**` : ''}.\n\nGerando link de preenchimento automático:\n\n🔗 [Clique aqui para abrir o cadastro de ${tutorName}](/owner/tutors?new=true&name=${queryName}&cpf=${queryCpf})\n\nAo clicar, a tela de tutores se abrirá e o modal de cadastro será preenchido automaticamente com esses dados.`
                })
            }
        }

        // 4. Detecção de Intenção Flexível: Buscar Ficha de Pet (com tolerância a erros comuns, ex: 'detlahes')
        const isPetSearchIntention = 
            (normalizedQuery.includes('pet') || normalizedQuery.includes('cao') || normalizedQuery.includes('cão') || normalizedQuery.includes('gato') || normalizedQuery.includes('cachorro') || normalizedQuery.includes('animal')) &&
            (
                normalizedQuery.includes('detalhe') || 
                normalizedQuery.includes('detlahe') || 
                normalizedQuery.includes('ficha') || 
                normalizedQuery.includes('busca') || 
                normalizedQuery.includes('procura') || 
                normalizedQuery.includes('info') || 
                normalizedQuery.includes('dado') || 
                normalizedQuery.includes('ver') || 
                normalizedQuery.includes('mostr') || 
                normalizedQuery.includes('exibir')
            );

        if (isPetSearchIntention) {
            // Extrai o nome do pet limpando termos de ação e erros de digitação comuns
            let petSearchName = userQuery
                .replace(/quero ver/i, '')
                .replace(/ver ficha/i, '')
                .replace(/ficha do pet/i, '')
                .replace(/ficha de/i, '')
                .replace(/ficha/i, '')
                .replace(/detalhes do pet/i, '')
                .replace(/detlahes do pet/i, '')
                .replace(/detalhes de/i, '')
                .replace(/detlahes de/i, '')
                .replace(/detalhes/i, '')
                .replace(/detlahes/i, '')
                .replace(/buscar pet/i, '')
                .replace(/buscar/i, '')
                .replace(/procurar pet/i, '')
                .replace(/procurar/i, '')
                .replace(/info do pet/i, '')
                .replace(/info de/i, '')
                .replace(/informacoes do pet/i, '')
                .replace(/informações do pet/i, '')
                .replace(/informações de/i, '')
                .replace(/informações/i, '')
                .replace(/informacao/i, '')
                .replace(/dados do pet/i, '')
                .replace(/dados de/i, '')
                .replace(/dados/i, '')
                .replace(/sobre o/i, '')
                .replace(/sobre a/i, '')
                .replace(/pet/i, '')
                .replace(/cão/i, '')
                .replace(/cao/i, '')
                .replace(/gato/i, '')
                .replace(/[.,:;]/g, '')
                .replace(/\s+/g, ' ')
                .trim()

            if (petSearchName.length >= 2) {
                const dataResult = await getPetDetails(supabase, petSearchName)
                if ('error' in dataResult) {
                    return NextResponse.json({ content: `⚠️ ${dataResult.error}` })
                }
                if ('message' in dataResult) {
                    return NextResponse.json({ content: `🐾 ${dataResult.message}` })
                }

                let msg = `### 🐾 Ficha de Pets Encontrados\n\n`
                dataResult.forEach((pet: any) => {
                    msg += `#### Pet: ${pet.nome}\n`
                    msg += `- **Espécie:** ${pet.especie} | **Raça:** ${pet.raca}\n`
                    msg += `- **Porte:** ${pet.porte} | **Peso:** ${pet.peso} | **Gênero:** ${pet.genero}\n`
                    msg += `- **Temperamento:** ${pet.temperamento}\n`
                    msg += `- **Alergias:** *${pet.alergias}*\n`
                    msg += `- **Cuidados Especiais:** *${pet.cuidados_especiais}*\n`
                    msg += `- **Notas Médicas:** *${pet.notas_medicas}*\n`
                    msg += `- **Tutor:** ${pet.tutor} (WhatsApp: [${pet.whatsapp_tutor}](https://wa.me/55${pet.whatsapp_tutor.replace(/\D/g, '')}))\n\n`
                })
                return NextResponse.json({ content: msg })
            }
        }

        // 5. Fallback Padrão: Tópico de Ajuda Geral / Base Estática
        let bestMatchTopic: string | null = null
        let maxMatchCount = 0

        Object.entries(topicSynonyms).forEach(([topicKey, keywords]) => {
            let matchCount = 0
            keywords.forEach(keyword => {
                const normalizedKeyword = normalizeText(keyword)
                if (normalizedQuery.includes(normalizedKeyword)) {
                    matchCount += normalizedKeyword.split(' ').length
                }
            })

            if (matchCount > maxMatchCount) {
                maxMatchCount = matchCount
                bestMatchTopic = topicKey
            }
        })

        if (bestMatchTopic && pageHelpData[bestMatchTopic]) {
            const section = pageHelpData[bestMatchTopic]
            const formattedContent = formatHelpSection(section, bestMatchTopic)
            
            const intro = `Olá! Identifiquei que sua dúvida é sobre **${section.title.split(' ').slice(1).join(' ')}** (tópico de ajuda do MyPet Flow). Aqui está um guia prático para te ajudar:\n\n`
            
            return NextResponse.json({ content: intro + formattedContent })
        }

        // Cumprimento simples
        if (normalizedQuery.match(/\b(ola|oi|bom dia|boa tarde|boa noite|tudo bem|ei|hey)\b/)) {
            return NextResponse.json({
                content: `Olá! Sou o **Guia MyPet Flow**, seu assistente e secretária administrativa. 🐾\n\nComo posso te ajudar hoje? Você pode me fazer perguntas de uso ou consultas como:\n\n- 💉 *"Quer ver as vacinas vencendo hoje"* ou *"vacinas de hoje"*\n- 📅 *"Quais são os agendamentos de hoje?"*\n- 👤 *"Quero cadastrar o tutor João Silva, CPF 123.456.789-10"*\n- 🐾 *"Buscar pet Pipoca"*\n\nAlém de tirar dúvidas sobre qualquer tela do sistema! O que você precisa agora?`
            })
        }

        // Caso padrão se não encontrar correspondência
        return NextResponse.json({
            content: `Desculpe, não entendi muito bem sua pergunta sobre "${userQuery}".\n\nSou um assistente focado em ajudar você a navegar no **MyPet Flow** e consultar dados em tempo real.\n\nExperimente me perguntar:\n\n- 💉 *"Vacinas vencendo hoje"* ou *"vacinas de hoje"*\n- 📅 *"Agendamentos de hoje"*\n- 👤 *"Cadastrar tutor Roberto Santos CPF 122.333.444-55"*\n- 🔍 *"Buscar pet Pipoca"*\n- ✂️ *"Como cadastrar um serviço?"*\n\nQual desses assuntos você gostaria de tratar?`
        })

    } catch (error) {
        console.error('Erro na API do Assistente:', error)
        return NextResponse.json({ error: 'Ocorreu um erro ao processar sua solicitação.' }, { status: 500 })
    }
}
