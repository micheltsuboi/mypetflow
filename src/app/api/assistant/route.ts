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

async function getVaccinesExpiringToday(supabase: any) {
    try {
        const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local

        const { data, error } = await supabase
            .from('pet_vaccines')
            .select(`
                name,
                expiry_date,
                pets (
                    name,
                    customers (
                        name,
                        phone_1
                    )
                )
            `)
            .eq('expiry_date', todayStr)

        if (error) throw error

        if (!data || data.length === 0) {
            return { message: 'Nenhuma vacina está programada para vencer na data de hoje.' }
        }

        return data.map((item: any) => ({
            vacina: item.name,
            vencimento: item.expiry_date,
            pet: item.pets?.name || 'Não informado',
            tutor: item.pets?.customers?.name || 'Não informado',
            whatsapp: item.pets?.customers?.phone_1 || 'Não informado'
        }))
    } catch (err: any) {
        console.error('Erro ao buscar vacinas:', err)
        return { error: 'Falha ao buscar vacinas vencendo hoje no banco de dados.' }
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

Regras de comportamento:
1. Seja sempre extremamente simpático, prestativo e profissional. Responda em Português do Brasil.
2. Para perguntas conceituais de como usar o sistema (ex: "como crio um serviço"), use a base de conhecimento de ajuda no fim desta instrução.
3. Se o usuário pedir para buscar dados em tempo real ou citar termos como "vacinas de hoje", "agendamentos de hoje" ou buscar informações de um pet específico (ex: "detalhes do pet Rex", "ficha do pet Mel", "buscar o pet Pipoca"), você deve OBRIGATORIAMENTE chamar a ferramenta correspondente disponível nas Tools. Não tente inventar os dados do pet ou dizer que não sabe se houver ferramenta adequada!
4. Se o usuário demonstrar a intenção de cadastrar um NOVO TUTOR (ex: "quero cadastrar o tutor João Silva, CPF 122.333.444-55" ou "cadastrar novo tutor chamado Maria"), você deve:
   - Extrair o nome do tutor e o CPF dele (caso informado).
   - Gerar uma resposta amigável e incluir OBRIGATORIAMENTE um link em formato markdown no seguinte formato exato de URL para abrir a tela de cadastro pré-preenchida no frontend: 
     [Clique aqui para cadastrar [Nome do Tutor]](/owner/tutors?new=true&name=[Nome_com_UrlEncode]&cpf=[CPF_ou_Vazio])
     Exemplo: [Clique aqui para abrir o cadastro de João Silva](/owner/tutors?new=true&name=João%20Silva&cpf=122.333.444-55)
   - Explique para o usuário que, ao clicar no link, o sistema abrirá a tela de cadastro com esses dados já preenchidos.
5. Sempre que instruir o usuário a ir para uma tela normal, inclua links markdown [Nome da Tela](/caminho) (ex: [Cadastro de Serviços](/owner/services), [Agenda](/owner/agenda), [Financeiro](/owner/financeiro)).
6. A página atual que o usuário visualiza no dashboard é: "${pathname || 'não informada'}".

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
                            name: 'get_vaccines_expiring_today',
                            description: 'Retorna a lista de vacinas de pets que expiram/vencem no dia de hoje na organização do usuário.'
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
                                        description: 'Nome do pet a ser pesquisado (ex: Rex, Pipoca)'
                                    }
                                },
                                required: ['petName']
                            }
                        }
                    ]
                }
            ]

            try {
                // Primeira chamada para o Gemini (com tools)
                let geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
                    if (functionName === 'get_vaccines_expiring_today') {
                        functionResult = await getVaccinesExpiringToday(supabase)
                    } else if (functionName === 'get_today_appointments') {
                        functionResult = await getTodayAppointments(supabase)
                    } else if (functionName === 'get_pet_details') {
                        functionResult = await getPetDetails(supabase, args.petName)
                    } else {
                        functionResult = { error: 'Função desconhecida.' }
                    }

                    // Enviar o resultado de volta para o Gemini formular a resposta final
                    const nextMessages = [
                        ...geminiMessages,
                        {
                            role: 'model',
                            parts: [
                                {
                                    functionCall: {
                                        name: functionName,
                                        args: args
                                    }
                                }
                            ]
                        },
                        {
                            role: 'function',
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

                    geminiRes = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

                    if (!geminiRes.ok) {
                        throw new Error(`Falha na segunda chamada do Gemini: ${await geminiRes.text()}`)
                    }

                    data = await geminiRes.json()
                    responsePart = data.candidates?.[0]?.content?.parts?.[0]
                }

                const replyText = responsePart?.text || 'Desculpe, não consegui obter uma resposta de dados agora.'
                return NextResponse.json({ content: replyText })

            } catch (err) {
                console.error('Erro no fluxo do Gemini com Function Calling, ativando Fallback local:', err)
                // Cai no fallback local abaixo
            }
        }

        // ==========================================
        // MODO FALLBACK LOCAL (BUSCA HEURÍSTICA E QUERIES FIXAS)
        // ==========================================
        
        // 1. Detecção de Intenção: Vacinas Vencendo Hoje
        if (normalizedQuery.includes('vacina') && (normalizedQuery.includes('hoje') || normalizedQuery.includes('vencendo'))) {
            const dataResult = await getVaccinesExpiringToday(supabase)
            if ('error' in dataResult) {
                return NextResponse.json({ content: `⚠️ ${dataResult.error}` })
            }
            if ('message' in dataResult) {
                return NextResponse.json({ content: `🐾 ${dataResult.message}` })
            }

            let msg = `### 💉 Vacinas Vencendo Hoje\n\nIdentifiquei as seguintes aplicações com expiração na data de hoje:\n\n`
            dataResult.forEach((item: any) => {
                msg += `- **Pet:** ${item.pet} | **Vacina:** ${item.vacina}\n`
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

        // 3. Detecção de Intenção: Função de Secretária (Cadastro de Tutor)
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
