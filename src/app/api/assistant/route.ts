import { NextResponse } from 'next/server'
import { pageHelpData, PageHelpSection } from '@/config/pageHelpData'

// Mapeamento de termos para tópicos da base de conhecimento
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

// Gera a resposta em formato markdown a partir dos dados do tópico
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

    // Adiciona link de navegação dependendo do tópico
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

        const apiKey = process.env.GEMINI_API_KEY

        if (apiKey) {
            // ==========================================
            // MODO DE IA REAL (GEMINI API)
            // ==========================================
            
            // Construir o contexto para injetar no sistema
            let helpContextText = "Aqui está a base de conhecimento de ajuda do sistema MyPet Flow que você DEVE usar para orientar o usuário:\n\n"
            Object.entries(pageHelpData).forEach(([key, section]) => {
                helpContextText += `TÓPICO: ${key}\n`
                helpContextText += `Título: ${section.title}\n`
                helpContextText += `Descrição: ${section.description}\n`
                if (section.steps) helpContextText += `Passos: ${section.steps.join(' | ')}\n`
                if (section.rules) helpContextText += `Regras: ${section.rules.join(' | ')}\n`
                if (section.tips) helpContextText += `Dicas: ${section.tips.join(' | ')}\n`
                helpContextText += `---\n`
            })

            const systemPrompt = `Você é o "Guia MyPet Flow", um assistente virtual integrado no sistema de gestão de petshops e clínicas veterinárias MyPet Flow.
Sua missão é ajudar os usuários (proprietários e funcionários do petshop/clínica) a operarem o sistema.

Regras de comportamento:
1. Seja sempre extremamente simpático, prestativo e profissional.
2. Responda SEMPRE em Português do Brasil.
3. Use a base de conhecimento fornecida abaixo para dar respostas precisas. Não invente passos que não existem no sistema.
4. Sempre que instruir o usuário a ir para uma tela, você pode incluir links no formato markdown [Nome da Tela](/caminho). Exemplo: [Cadastro de Serviços](/owner/services), [Agenda](/owner/agenda), [Financeiro](/owner/financeiro), [Pacotes](/owner/packages), [Tutores](/owner/tutors), [Pets](/owner/pets).
5. O usuário está atualmente visualizando a página com a rota: "${pathname || 'não informada'}". Use isso para contextualizar se necessário.
6. Mantenha as respostas claras, organizadas em tópicos ou passos, usando formatação Markdown (negrito, listas, etc.).

${helpContextText}`

            // Converter mensagens para o formato da API do Gemini
            // O formato do Gemini espera array de { role: 'user'|'model', parts: [{ text: string }] }
            const geminiMessages = messages.map((m: any) => {
                const role = m.role === 'assistant' ? 'model' : 'user'
                return {
                    role,
                    parts: [{ text: m.content }]
                }
            })

            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: geminiMessages,
                            systemInstruction: {
                                parts: [{ text: systemPrompt }]
                            },
                            generationConfig: {
                                temperature: 0.3,
                                maxOutputTokens: 1000,
                            }
                        }),
                    }
                )

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('Erro na API do Gemini:', errorText)
                    throw new Error('Falha na resposta do Gemini API')
                }

                const data = await response.json()
                const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui formular uma resposta no momento.'

                return NextResponse.json({ content: replyText })
            } catch (err) {
                console.error('Erro ao chamar o Gemini, aplicando Fallback local:', err)
                // Se der erro na API externa, cai no fallback local
            }
        }

        // ==========================================
        // MODO FALLBACK LOCAL (BUSCA HEURÍSTICA)
        // ==========================================
        
        let bestMatchTopic: string | null = null
        let maxMatchCount = 0

        // Varre todos os tópicos e seus sinônimos para encontrar a melhor correspondência
        Object.entries(topicSynonyms).forEach(([topicKey, keywords]) => {
            let matchCount = 0
            keywords.forEach(keyword => {
                const normalizedKeyword = normalizeText(keyword)
                // Se a query contém a palavra-chave inteira ou vice-versa
                if (normalizedQuery.includes(normalizedKeyword)) {
                    matchCount += normalizedKeyword.split(' ').length // Peso maior para termos mais longos
                }
            })

            if (matchCount > maxMatchCount) {
                maxMatchCount = matchCount
                bestMatchTopic = topicKey
            }
        })

        // Se encontrou um tópico correspondente
        if (bestMatchTopic && pageHelpData[bestMatchTopic]) {
            const section = pageHelpData[bestMatchTopic]
            const formattedContent = formatHelpSection(section, bestMatchTopic)
            
            const intro = `Olá! Identifiquei que sua dúvida é sobre **${section.title.split(' ').slice(1).join(' ')}** (tópico de ajuda do MyPet Flow). Aqui está um guia prático para te ajudar:\n\n`
            
            return NextResponse.json({
                content: intro + formattedContent
            })
        }

        // Se for um cumprimento simples
        if (normalizedQuery.match(/\b(ola|oi|bom dia|boa tarde|boa noite|tudo bem|ei|hey)\b/)) {
            return NextResponse.json({
                content: `Olá! Sou o **Guia MyPet Flow**, seu assistente para uso do sistema. 🐾\n\nComo posso te ajudar hoje? Você pode me perguntar sobre:\n\n- ✂️ [Cadastro de Serviços](/owner/services)\n- 📦 [Gestão de Pacotes](/owner/packages)\n- 📅 [Uso da Agenda](/owner/agenda)\n- 💰 [Módulo Financeiro](/owner/financeiro)\n- 🛁 [Fila de Banho & Tosa](/owner/banho-tosa)\n- 🏨 [Hospedagem / Hotel Pet](/owner/hospedagem)\n\nDigite qual sua dúvida ou escolha uma das opções acima!`
            })
        }

        // Caso padrão se não encontrar correspondência
        return NextResponse.json({
            content: `Desculpe, não entendi muito bem sua pergunta sobre "${userQuery}".\n\nSou um assistente focado em ajudar você a navegar e configurar o **MyPet Flow**. \n\nPosso ajudar você com os seguintes tópicos:\n\n- ✂️ **Serviços** (Cadastro, Checklist e Matriz de Preço)\n- 📦 **Pacotes** (Criação de modelos e Contratos de Pets)\n- 📅 **Agenda** (Agendamentos e Filtros)\n- 💰 **Financeiro** (Fluxo de caixa, Entradas/Saídas)\n- 🛁 **Banho e Tosa** (Controle do fluxo de banhos)\n- 🐾 **Creche** e 🏨 **Hospedagem** (Check-in, Check-out e Diárias)\n- 💉 **Vacinas** (Carteira de vacinação)\n- 🩺 **Clínica e Prontuários** (Consultas e Exames)\n- 🔌 **Integrações** (WhatsApp Bot)\n- 🔬 **Laboratório** (Laudos e Exames)\n\nQual desses assuntos você gostaria de entender melhor? Se preferir, tente formular a pergunta de outra forma (ex: "como crio um serviço?" ou "como funciona o pacote?").`
        })

    } catch (error) {
        console.error('Erro na API do Assistente:', error)
        return NextResponse.json({ error: 'Ocorreu um erro ao processar sua solicitação.' }, { status: 500 })
    }
}
