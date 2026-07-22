export interface PageHelpSection {
    title: string
    description: string
    categoryBadge?: string
    steps?: string[]
    rules?: string[]
    tips?: string[]
}

export const pageHelpData: Record<string, PageHelpSection> = {
    services: {
        title: '✂️ Cadastro & Gestão de Serviços',
        categoryBadge: 'Serviços & Preços',
        description: 'Aqui você cadastra e gerencia todos os serviços oferecidos pelo seu petshop ou clínica (como Banho, Tosa Higiênica, Tosa Tesoura, Hidratação, Corte de Unha, etc.).',
        steps: [
            'Clique em "+ Novo Serviço" para cadastrar um serviço com nome, categoria, preço base e duração.',
            'Defina a espécie alvo (Cão, Gato ou Ambos).',
            'Configure um Checklist de Execução padrão (ex: verificar ouvidos, escovar dentes) que aparecerá para os tosadores/atendentes.',
            'Configure a Matriz de Preço caso queira valores diferenciados por porte/peso ou por dia da semana.'
        ],
        rules: [
            'O Preço Base é o valor padrão cobrado caso nenhuma regra de matriz se aplique.',
            'As Regras de Preço sobressaem ao Preço Base quando o pet se encaixa no peso/porte ou no dia da semana selecionado.',
            'Serviços inativos deixam de aparecer nas opções de agendamento automático.'
        ],
        tips: [
            '💡 Dica: Ao vincular um checklist ao serviço, os tosadores receberão a lista de tarefas durante a execução do banho/tosa.',
            '💡 Pacotes: Lembre-se de que os serviços cadastrados aqui servem de base para a montagem dos Pacotes de Serviços.'
        ]
    },
    packages: {
        title: '📦 Cadastro & Gestão de Pacotes',
        categoryBadge: 'Vendas & Contratos',
        description: 'Nesta tela você cria os modelos de Pacotes de Serviços (ex: Pacote Mensal de 4 Banhos, Pacote Creche 2x por semana).',
        steps: [
            '1. Na aba "Modelos de Pacotes", clique em "+ Novo Pacote" e defina o nome, valor total, categoria e tipo de validade (Semanal, Mensal ou Sem Expiração).',
            '2. Adicione os serviços que compõem o pacote e suas respetivas quantidades (ex: 4 banhos + 1 hidratação).',
            '3. IMPORTANTE: Após cadastrar o modelo do pacote nesta tela, você precisa ir no cadastro do PET (ou na aba Contratos) e CONTRATAR o pacote para o pet desejado!',
            '4. Na aba "Contratos Ativos", você acompanha quais pets possuem pacotes vigentes e o saldo de sessões disponíveis.'
        ],
        rules: [
            'Pacotes com validade semanal/mensal podem gerar renovações e cobranças automáticas.',
            'Cada agendamento feito utilizando um pacote desconta 1 crédito do saldo de sessões do pet.',
            'Se um pet faltar sem remarcação dentro do prazo, a sessão pode ser marcada como "Falta" consumindo a sessão conforme a política do seu estabelecimento.'
        ],
        tips: [
            '💡 Como usar o Pacote na Prática: Passo 1: Crie o Modelo do Pacote aqui nesta tela. ➔ Passo 2: Vá no cadastro do Tutor/Pet e clique em "Contratar Pacote" para vincular ao pet do cliente. ➔ Passo 3: Os agendamentos do pet passarão a consumir os créditos desse pacote automaticamente!'
        ]
    },
    pets: {
        title: '🐶 Cadastro & Prontuários dos Pets',
        categoryBadge: 'Base de Dados',
        description: 'Gerencie o cadastro completo dos animais de estimação, incluindo raça, porte, idade, restrições médicas, pacotes contratados e histórico de atendimento.',
        steps: [
            'Clique em "+ Novo Pet" para registrar um novo animal e vinculá-lo ao Tutor responsável.',
            'Preencha dados essenciais como Nome, Espécie, Raça, Peso, Data de Nascimento e Porte.',
            'Adicione observações importantes (ex: alergias, comportamento com outros cães, medos).',
            'Acesse o perfil do Pet para ver o Histórico de Serviços, Carteira de Vacinas e Contratar Pacotes.'
        ],
        rules: [
            'Todo Pet deve estar obrigatoriamente associado a pelo menos um Tutor cadastrado.',
            'O Peso e Porte do pet influenciam no cálculo de preço dinâmico dos serviços.',
            'Pets com restrições agressivas ou comportamentais exibirão alertas visuais nos módulos de Creche, Hospedagem e Banho.'
        ],
        tips: [
            '💡 Dica: Para contratar um pacote para o pet, abra as opções do pet e selecione "Contratar Pacote".'
        ]
    },
    tutors: {
        title: '👤 Cadastro de Tutores (Clientes)',
        categoryBadge: 'Base de Dados',
        description: 'Cadastre e consulte as informações dos tutores dos pets, seus dados de contato, endereço, débitos e histórico financeiro.',
        steps: [
            'Clique em "+ Novo Tutor" para cadastrar um cliente.',
            'Informe WhatsApp, CPF, E-mail e Endereço para permitir contatos e emissão de notas/faturas.',
            'Ao abrir o cadastro do tutor, veja a lista de todos os pets pertencentes a ele e seu saldo de cashback.'
        ],
        rules: [
            'O número de WhatsApp é o canal principal usado pelo sistema para envio de lembretes automáticos e comprovantes.',
            'Tutores podem acessar a Área do Tutor caso tenham e-mail e senha configurados.'
        ],
        tips: [
            '💡 Dica: Mantenha o telefone com DDD atualizado para garantir o envio correto de notificações via WhatsApp.'
        ]
    },
    'banho-tosa': {
        title: '🛁 Fila e Agendamento de Banho & Tosa',
        categoryBadge: 'Operacional',
        description: 'Painel operacional em tempo real para controle do fluxo de Banho e Tosa, desde a recepção/check-in do pet até a finalização e aviso ao tutor.',
        steps: [
            'Agende atendimentos selecionando Pet, Serviço, Data/Hora e Tosador responsável.',
            'Utilize as colunas do Kanban (Aguardando, Em Andamento, Concluído, Entregue) para movimentar os pets.',
            'Preencha o Checklist do Serviço e envie fotos/vídeos pelo Diário de Bordo para o WhatsApp do Tutor.'
        ],
        rules: [
            'Ao colocar o atendimento em "Concluído", um aviso automático pode ser disparado para o tutor informando que o pet está pronto.',
            'Agendamentos vinculados a pacotes ativos consomem o saldo de sessões do pet automaticamente.'
        ],
        tips: [
            '💡 Dica: Utilize a busca rápida por nome do pet ou filtro por profissional para organizar a rotina do dia.'
        ]
    },
    creche: {
        title: '🐾 Controle de Creche (Daycare)',
        categoryBadge: 'Operacional',
        description: 'Gerencie os pets que frequentam a creche diária, controle de presenças (check-in/check-out), relatórios de comportamento e refeições.',
        steps: [
            'Faça o Check-in do pet na chegada indicando os pertences deixados (guia, ração, medicação).',
            'Registre durante o dia as atividades, fotos, alimentação e se o pet fez necessidades.',
            'Ao final do dia, faça o Check-out e gere o Relatório Diário para o tutor.'
        ],
        rules: [
            'Pets que frequentam a creche por mensalidade ou pacote avulso devem ter suas frequências registradas no check-in.',
            'Somente pets com avaliação comportamental aprovada devem ser admitidos na creche em grupo.'
        ],
        tips: [
            '💡 Dica: Envie o relatório diário diretamente pelo WhatsApp para manter os tutores engajados e tranquilos!'
        ]
    },
    hospedagem: {
        title: '🏨 Gestão de Hospedagem / Hotel Pet',
        categoryBadge: 'Operacional',
        description: 'Controle de reservas de hotelzinho, ocupação de baías/quartos, check-in, check-out, diárias e acompanhamento dos hóspedes.',
        steps: [
            'Clique em "+ Nova Reserva" escolhendo o Pet, Período de Entrada/Saída e Baía/Quarto.',
            'Cadastre os pertences, ração e horários de medicação trazidos pelo tutor.',
            'Acompanhe o mapa visual de ocupação dos quartos em tempo real.'
        ],
        rules: [
            'O cálculo de diárias considera a data/hora de entrada e saída.',
            'Verifique se a vacinação do pet está em dia antes de confirmar o check-in no hotel.'
        ],
        tips: [
            '💡 Dica: Você pode lançar serviços adicionais (ex: banho de saída) diretamente na reserva de hospedagem.'
        ]
    },
    financeiro: {
        title: '💰 Gestão Financeira & Fluxo de Caixa',
        categoryBadge: 'Financeiro',
        description: 'Controle total das contas a receber, contas a pagar, vendas do petshop, recebimentos de serviços e relatórios de faturamento.',
        steps: [
            'Registre entradas e saídas avulsas ou consulte os lançamentos gerados automaticamente pelas vendas e atendimentos.',
            'Filtre por período (dia, semana, mês) e por categoria de receita/despesa.',
            'Dê baixa em pagamentos pendentes selecionando a forma de pagamento (PIX, Cartão, Dinheiro).'
        ],
        rules: [
            'Vendas no Petshop e agendamentos pagos alimentam o fluxo de caixa automaticamente.',
            'Lançamentos confirmados afetam o saldo atual da empresa.'
        ],
        tips: [
            '💡 Dica: Utilize o gráfico de evolução financeira para acompanhar o faturamento comparativo entre meses.'
        ]
    },
    mensalidades: {
        title: '🔄 Mensalidades e Planos Recorrentes',
        categoryBadge: 'Financeiro',
        description: 'Gerencie as assinaturas recorrentes dos clientes (ex: Plano Creche VIP 3x/semana, Plano Banho Mensal).',
        steps: [
            'Cadastre os planos de mensalidade com frequência e dia de vencimento padrão.',
            'Associe tutores aos planos e acompanhe a geração de faturas mensais.',
            'Monitore mensalidades pendentes, pagas ou em atraso.'
        ],
        rules: [
            'A mensalidade garante o direito de uso dos serviços acordados dentro do mês vigente.',
            'O não pagamento pode suspender temporariamente os agendamentos automáticos do pet.'
        ],
        tips: [
            '💡 Dica: Configure o envio automático de lembrete de cobrança via WhatsApp dias antes do vencimento.'
        ]
    },
    petshop: {
        title: '🛍️ Petshop & Frente de Caixa (PDV)',
        categoryBadge: 'Vendas & Estoque',
        description: 'Cadastro de produtos, controle de estoque, categorias e sistema de caixa para venda rápida de rações, acessórios e medicamentos.',
        steps: [
            'Cadastre produtos com preço de custo, preço de venda, código de barras e estoque mínimo.',
            'Utilize o PDV (Frente de Caixa) para registrar compras de produtos e serviços em uma única comanda.',
            'Ao finalizar a venda, o estoque do produto é baixado automaticamente.'
        ],
        rules: [
            'Produtos com estoque zerado ou abaixo do mínimo gerarão avisos de reposição.',
            'É possível conceder descontos ou utilizar saldo de cashback do tutor na finalização da venda.'
        ],
        tips: [
            '💡 Dica: Use um leitor de código de barras no PDV para agilizar as vendas no balcão!'
        ]
    },
    cashback: {
        title: '💎 Programa de Fidelidade & Cashback',
        categoryBadge: 'Fidelização',
        description: 'Configure regras de acúmulo de pontos/cashback para recompensar os clientes mais fiéis do seu estabelecimento.',
        steps: [
            'Defina a porcentagem de cashback concedida a cada compra ou serviço realizado.',
            'Acompanhe o saldo acumulado de cada tutor e o histórico de resgates.',
            'Aplique o saldo de cashback como desconto em novas compras no PDV ou agendamentos.'
        ],
        rules: [
            'O cashback é creditado na conta do tutor assim que a comanda ou serviço é pago.',
            'Você pode definir regras de expiração dos pontos caso desejado.'
        ],
        tips: [
            '💡 Dica: O cashback atrai os clientes de volta e incentiva o aumento do ticket médio!'
        ]
    },
    vacinas: {
        title: '💉 Carteira de Vacinação & Controle Vacinal',
        categoryBadge: 'Saúde Animal',
        description: 'Controle de vacinas aplicadas nos pets, agendamento de doses de reforço e alertas automáticos de vacinas vencidas.',
        steps: [
            'Registre a aplicação de uma vacina escolhendo o Pet, Vacina, Lote, Data e Data da Próxima Dose.',
            'Consulte o histórico vacinal do pet a qualquer momento.',
            'Envie lembretes de revacinação para o WhatsApp do tutor quando a data do reforço estiver próxima.'
        ],
        rules: [
            'Vacinas essenciais (ex: Antirrábica, V8/V10 para cães, V4/V5 para gatos) são pré-requisito para admissão na creche e hospedagem.'
        ],
        tips: [
            '💡 Dica: O sistema avisa automaticamente quando o pet tem vacinas a vencer nos próximos 15 dias.'
        ]
    },
    veterinary: {
        title: '👨‍⚕️ Gestão de Veterinários & Corpo Médico',
        categoryBadge: 'Clínica Veterinária',
        description: 'Cadastre os veterinários da clínica, seus números de CRMV, especialidades, horários de atendimento e comissões.',
        steps: [
            'Clique em "+ Novo Veterinário" para registrar um médico veterinário.',
            'Informe o CRMV/UF, especialidade, e-mail e telefone de contato.',
            'Vincule o veterinário às consultas e procedimentos clínicos.'
        ],
        rules: [
            'O CRMV é impresso nos atestados, receitas e laudos emitidos pela clínica.'
        ],
        tips: [
            '💡 Dica: Defina a comissão por atendimento no cadastro para relatórios financeiros médicos.'
        ]
    },
    consultas: {
        title: '🩺 Consultas & Prontuário Eletrônico',
        categoryBadge: 'Clínica Veterinária',
        description: 'Prontuário médico vet completo com anotações de anamnese, exame físico, diagnóstico, prescrição de medicamentos e atestados.',
        steps: [
            'Abra a consulta do pet agendada ou inicie um atendimento de emergência.',
            'Preencha Anamnese, Sinais Clínicos, Temperatura, Peso e Diagnóstico.',
            'Gere a Receita Médica em PDF com o logotipo da sua clínica e assinatura do veterinário.'
        ],
        rules: [
            'As informações gravadas no prontuário médico compõem o histórico permanente e inalterável da vida do pet.'
        ],
        tips: [
            '💡 Dica: Você pode solicitar exames laboratoriais/imagem diretamente dentro da tela de consulta.'
        ]
    },
    exams: {
        title: '🧪 Catálogo & Pedidos de Exames',
        categoryBadge: 'Clínica Veterinária',
        description: 'Gerencie o catálogo de exames laboratoriais e de imagem (Hemograma, Ultrassom, Raio-X), solicite exames e anexe laudos.',
        steps: [
            'Cadastre os tipos de exames oferecidos com seus valores e prazos de entrega.',
            'Solicite exames para um pet e acompanhe o status (Solicitado, Em Análise, Concluído).',
            'Anexe os laudos e resultados em PDF para consulta do tutor.'
        ],
        rules: [
            'Exames concluídos ficam disponíveis no histórico clínico do pet.'
        ],
        tips: [
            '💡 Dica: Notifique o tutor via WhatsApp assim que o laudo do exame for anexado no sistema.'
        ]
    },
    hospital: {
        title: '🏥 Internação & Leitos Hospitalares',
        categoryBadge: 'Hospital Veterinário',
        description: 'Controle de pacientes internados, mapa de leitos/canis, ficha de evolução médica periódica e aprazamento de medicamentos.',
        steps: [
            'Internar pet selecionando o leito disponível, motivo da internação e veterinário responsável.',
            'Registre as evoluções clínicas por turno (parâmetros vitais, fluidoterapia, alimentação).',
            'Ao dar alta ao paciente, o sistema gera o resumo da internação e apura as diárias hospitalares.'
        ],
        rules: [
            'Somente pets com cadastro ativo e prontuário aberto podem ser internados.',
            'O mapa de leitos indica a ocupação em tempo real.'
        ],
        tips: [
            '💡 Dica: O diário hospitalar permite que a equipe da noite continue exatamente o tratamento prescrito de dia.'
        ]
    },
    assessment: {
        title: '📋 Questionário & Avaliação Comportamental',
        categoryBadge: 'Avaliação Pet',
        description: 'Ficha de avaliação temperamentais para admissão de pets na Creche ou Hotel, garantindo a segurança de todos os animais.',
        steps: [
            'Realize o teste com o pet e preencha os critérios de sociabilidade, reatividade, barulho e energia.',
            'Defina o resultado: Aprovado, Em Adaptação ou Não Recomendado.',
            'Anexe observações e fotos do teste de integração.'
        ],
        rules: [
            'Pets reprovados no teste não devem ser inseridos em grupos livres de creche/hospedagem sem acompanhamento individual.'
        ],
        tips: [
            '💡 Dica: Envie o relatório da avaliação com foto para os tutores para demonstrar transparência e profissionalismo!'
        ]
    },
    usuarios: {
        title: '👥 Usuários & Permissões da Equipe',
        categoryBadge: 'Administração',
        description: 'Controle quem tem acesso ao sistema, criando perfis para recepção, banhistas, tosadores, veterinários e gerentes.',
        steps: [
            'Clique em "+ Convidar / Novo Usuário".',
            'Defina o e-mail, nome e papel (Owner, Admin, Staff, Veterinário).',
            'Ajuste as permissões específicas do que o usuário pode visualizar ou editar.'
        ],
        rules: [
            'Cada colaborador deve utilizar sua própria conta individual por questões de segurança e rastreabilidade das ações.',
            'Usuários inativados perdem imediatamente o acesso ao sistema.'
        ],
        tips: [
            '💡 Dica: Restrinja o acesso ao módulo financeiro apenas para proprietários e gerentes.'
        ]
    },
    ponto: {
        title: '⏰ Controle de Ponto dos Colaboradores',
        categoryBadge: 'Administração',
        description: 'Registro de entradas, saídas, horários de almoço e banco de horas da equipe de funcionários.',
        steps: [
            'Os funcionários registram o ponto pelo seu acesso.',
            'O gestor acompanha os espelhos de ponto, horas extras e eventuais faltas ou atrasos.'
        ],
        rules: [
            'Os registros de ponto possuem marcação de data e hora imutáveis.'
        ],
        tips: [
            '💡 Dica: Exporte o relatório mensal de ponto para contabilidade ao final de cada mês.'
        ]
    },
    integracoes: {
        title: '🔌 Integrações & WhatsApp Bot',
        categoryBadge: 'Configurações',
        description: 'Conecte sua conta do WhatsApp Web/API, robôs do n8n e webhooks para envio de mensagens automáticas de confirmação e lembretes.',
        steps: [
            'Escaneie o QR Code do WhatsApp para conectar a instância da sua loja.',
            'Ative os gatilhos desejados (Lembrete de Agendamento, Aviso de Pet Pronto, Cobrança).',
            'Teste o disparo de mensagens.'
        ],
        rules: [
            'Mantenha o celular conectado à internet se estiver utilizando integração via QR Code.'
        ],
        tips: [
            '💡 Dica: Mensagens automáticas pré-agendadas reduzem em até 80% as faltas (no-show) nos banhos e consultas!'
        ]
    },
    'disparo-massa': {
        title: '📢 Disparo de Mensagens em Massa',
        categoryBadge: 'Marketing',
        description: 'Envie comunicados, avisos de vacina, promoções de banho ou felicitações de aniversário para grupos de tutores via WhatsApp.',
        steps: [
            'Filtre os tutores por perfil (ex: tutores com pets da raça Poodle, clientes que não vêm há 30 dias).',
            'Escreva o texto da mensagem com variáveis dinâmicas (ex: {{nome_tutor}}, {{nome_pet}}).',
            'Clique em "Iniciar Disparo".'
        ],
        rules: [
            'Respeite intervalos entre mensagens para evitar bloqueios no WhatsApp.',
            'Envie mensagens apenas em horário comercial.'
        ],
        tips: [
            '💡 Dica: Faça campanhas de reconquista para tutores que não agendam banho há mais de 20 dias.'
        ]
    },
    'nota-fiscal': {
        title: '🧾 Emissão de Nota Fiscal Eletrônica (NFS-e)',
        categoryBadge: 'Fiscal',
        description: 'Gerencie a emissão de notas fiscais de serviços (NFS-e) diretamente com a prefeitura do seu município.',
        steps: [
            'Selecione as vendas/atendimentos concluídos e clique em "Emitir NFS-e".',
            'Acompanhe o status do lote (Processando, Emitida, Cancelada).',
            'Baixe o PDF da nota ou envie por e-mail para o cliente.'
        ],
        rules: [
            'É necessário estar com as credenciais fiscais e certificado digital (A1) configurados nas configurações da loja.'
        ],
        tips: [
            '💡 Dica: Você pode configurar a emissão automática de notas fiscais ao concluir faturamentos.'
        ]
    },
    agenda: {
        title: '📅 Agenda Geral de Atendimentos',
        categoryBadge: 'Operacional',
        description: 'Visualização consolidada de todos os agendamentos de Banho, Tosa, Consultas, Creche e Hospedagem por dia, semana ou mês.',
        steps: [
            'Navegue pelos dias da semana ou utilize o filtro por profissional/serviço.',
            'Clique em qualquer horário vago para criar um novo agendamento rápido.',
            'Arraste ou clique em um agendamento para editar horário ou remarcar.'
        ],
        rules: [
            'Conflitos de horário no mesmo profissional ou baía serão sinalizados visualmente.',
            'Agendamentos marcados como "Concluído" atualizam a lista de execução dos tosadores/vets.'
        ],
        tips: [
            '💡 Dica: Alterne entre a exibição em Lista, Grade Diária ou Visão Semanal para planejar a capacidade da equipe.'
        ]
    }
}
