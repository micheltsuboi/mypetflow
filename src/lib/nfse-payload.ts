import { FiscalConfig } from '@/types/database'

export interface NFSeBuilderParams {
    config: FiscalConfig;
    ref_uuid: string;
    tutor: {
        nome: string;
        cpf?: string;
        email?: string;
        telefone?: string;
        endereco?: {
            logradouro?: string;
            numero?: string;
            bairro?: string;
            codigo_municipio?: string;
            cep?: string;
            uf?: string;
        }
    };
    servico: {
        descricao: string;
        valor: number;
        codigo?: string; // Ex: "08.02" para Banho e Tosa
    };
}

/**
 * Builds the payload for Focus NFe API for NFSe
 *
 * HISTÓRICO DE ERROS RESOLVIDOS (NÃO REGREDIR):
 * 1. [RESOLVIDO] verAplic Expected dhEmi → Os campos XML (dhEmi, prest, toma, serv) foram
 *    substituídos pelos campos da API Focus (data_emissao, cnpj_prestador, etc.).
 * 2. [RESOLVIDO] prest Missing child elements → Adicionados inscricao_municipal_prestador,
 *    razao_social_prestador, cep_prestador, codigo_municipio_prestador.
 * 3. [RESOLVIDO] xNome not expected no tomador → CPF/CNPJ do tomador enviado antes do nome.
 * 4. [RESOLVIDO] tribMun Missing child elements → Adicionados tipo_retencao_iss e
 *    percentual_aliquota_relativa_municipio.
 * 5. [RESOLVIDO] dhEmi com "Z" (UTC) → Substituído por timezone explícito sem ":" (ex: -0300).
 */
export function buildNFSePayload({ config, ref_uuid, tutor, servico }: NFSeBuilderParams) {
    const valorFormatado = servico.valor.toFixed(2);
    const cnpjLimpo = config.cnpj?.replace(/\D/g, '');
    const cpfTomador = tutor.cpf?.replace(/\D/g, '') || undefined;
    const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902';

    // ================================================================
    // PADRÃO NACIONAL (Curitiba e outros municípios SPED Nacional)
    // Endpoint: POST /v2/nfsen
    // Documentação: https://focusnfe.com.br/doc/#nfse-nacional
    //
    // IMPORTANTE: Os campos são da API da Focus NFe em snake_case.
    // A Focus converte internamente para o XML do governo.
    // NUNCA enviar campos XML (dhEmi, prest, toma, serv, CNPJ, xNome, etc.)
    // ================================================================
    if (isNacional) {
        // Helper: data no formato ISO8601 COM timezone sem ":" (ex: -0300)
        // Focus NFe NFSen exige esse formato exato. Nem "Z", nem "-03:00"!
        // Subtraímos 10 minutos para evitar o erro "Data de emissão posterior à data de processamento"
        // Forçar fuso horário de Brasília (-0300) e subtrair 1 HORA para segurança total contra E0008
        // Alguns servidores de prefeitura/nacional têm atrasos significativos de sincronia.
        const d = new Date(Date.now() - (3 * 60 * 60 * 1000) - (60 * 60 * 1000)); 
        const pad = (n: number) => String(n).padStart(2, '0');
        const tz = "-0300"; // Padrão Brasilia
        const dataEmissao = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tz}`;
        const dataCompetencia = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

        // Código de serviço no formato CBNSS de 6 dígitos
        // Ex: "08.02" → strip non-digits → "0802" → padEnd(6,'0') → "080200"
        const codigoServicoBruto = servico.codigo || config.item_lista_servico || '080200';
        const codigoServicoNacional = codigoServicoBruto.replace(/\D/g, '').padEnd(6, '0');

        // Código IBGE do município: Garantir 7 dígitos (ex: "4106902")
        const cleanIBGE = (val: any) => String(val || '').replace(/\D/g, '');
        const companyIBGE = cleanIBGE(config.codigo_municipio) || '4106902';
        
        // Se o IBGE não tiver 7 dígitos, é inválido para o padrão Nacional
        const codigoIBGE = companyIBGE.length === 7 ? companyIBGE : '4106902';

        // Código IBGE do tomador: se estiver zerado ou inválido, usa o da empresa como fallback
        let tutorIBGE = cleanIBGE(tutor.endereco?.codigo_municipio || config.codigo_municipio);
        if (tutorIBGE.length < 7) tutorIBGE = codigoIBGE;
        const codigoMunicipioTomador = tutorIBGE;

        return {
            // --- Campos de roteamento (identificação na Focus) ---
            cnpj_prestador: cnpjLimpo,
            codigo_municipio_emissora: codigoIBGE,

            // --- Identificação do DPS ---
            data_emissao: dataEmissao,            // → dhEmi (xs:dateTime com timezone)
            data_competencia: dataCompetencia,    // → dCompet (YYYY-MM-DD)
            serie_dps: 1,                         // → serie
            emitente_dps: 1,                      // → tpEmit: 1=Prestador

            // --- Dados do Prestador (prest) ---
            // NUNCA omitir ou a Focus gera <prest> vazio que falha o schema
            inscricao_municipal_prestador: config.inscricao_municipal,    // → IM
            razao_social_prestador: config.razao_social,                  // → xNome
            // Endereço do prestador: xLgr (logradouro), nro (número), xBairro (bairro) são obrigatórios no padrão Nacional
            logradouro_prestador: config.municipio || 'Curitiba',
            numero_prestador: 'SN', // Obrigatório no Schema!
            bairro_prestador: 'Centro', // Obrigatório no Schema!
            cep_prestador: config.cep?.replace(/\D/g, ''),
            codigo_municipio_prestador: codigoIBGE,
            // Adicionando nro_prestador como redundância caso o parser da Focus varie
            nro_prestador: 'SN',
            // Regime tributário do prestador
            codigo_opcao_simples_nacional: config.optante_simples_nacional ? 1 : 2, // 1=Não Optante, 2=Optante MEI/ME
            regime_especial_tributacao: 0,           // 0=Nenhum (obrigatório pelo schema)

            // --- Local de prestação ---
            codigo_municipio_prestacao: codigoIBGE,

            // --- Dados do Tomador (toma) ---
            // ATENÇÃO: CPF/CNPJ DEVE vir ANTES do xNome (razao_social_tomador).
            // Se tutor sem CPF, usar cNaoNIF (consumidor não identificado) como fallback.
            // Sem um desses campos, o schema rejeita com "xNome not expected".
            ...(cpfTomador && cpfTomador.length === 14
                ? { cnpj_tomador: cpfTomador }                // CNPJ (14 dígitos)
                : cpfTomador && cpfTomador.length === 11
                    ? { cpf_tomador: cpfTomador }             // CPF (11 dígitos)
                    : { cnpj_tomador: undefined, cpf_tomador: undefined, cnao_nif_tomador: '9' } // Sem documento → cNaoNIF
            ),
            ref: `petflow_${ref_uuid}`, // Adicionado na raiz conforme padrão Focus v2
            razao_social_tomador: tutor.nome,                            // → xNome
            ...(tutor.email ? { email_tomador: tutor.email } : {}),
            // Endereço do tomador (obrigatório no padrão Nacional)
            codigo_municipio_tomador: codigoMunicipioTomador,
            cep_tomador: cleanIBGE(tutor.endereco?.cep || config.cep || '00000000'),
            logradouro_tomador: tutor.endereco?.logradouro || 'Endereço não informado',
            numero_tomador: tutor.endereco?.numero || 'SN',
            nro_tomador: tutor.endereco?.numero || 'SN', // Redundância para nro
            bairro_tomador: tutor.endereco?.bairro || 'Bairro não informado',

            // --- Serviço ---
            codigo_tributacao_nacional_iss: codigoServicoNacional,        // → cTribNac (6 dígitos)
            descricao_servico: servico.descricao,                         // → xDescServ
            valor_servico: parseFloat(valorFormatado),                    // → vServ

            // --- Tributação ISS (tribMun) ---
            // ATENÇÃO: todos os 3 campos abaixo são obrigatórios para não gerar "Missing child element"
            tributacao_iss: 1,                     // 1=Operação tributável no município
            tipo_retencao_iss: 1,                  // 1=Não retido (tomador não retém ISS)
            percentual_aliquota_relativa_municipio: config.aliquota_iss || 2.00, // → pAliq

            // --- Campos adicionais obrigatórios ---
            finalidade_emissao: 0,                 // 0=Normal
            consumidor_final: 1,                   // 1=Sim (pessoa física/cliente)
            indicador_destinatario: 0,             // 0=Tomador identificado
            email_prestador: 'contato@mypetflow.com.br', // Recomendado
        };
    }

    // ================================================================
    // PADRÃO TRADICIONAL FOCUS NFE — Endpoint /v2/nfse
    // Para municípios que NÃO usam o padrão Nacional (SPED)
    // ================================================================
    const agora = new Date().toISOString();
    const valorIss = (servico.valor * ((config.aliquota_iss || 2) / 100)).toFixed(2);

    return {
        ref: `petflow_${ref_uuid}`,
        data_emissao: agora,
        prestador: {
            cnpj: cnpjLimpo,
            inscricao_municipal: config.inscricao_municipal,
            codigo_municipio: config.codigo_municipio?.replace(/\D/g, '')
        },
        tomador: {
            cpf: cpfTomador,
            razao_social: tutor.nome,
            email: tutor.email || undefined,
            endereco: {
                logradouro: tutor.endereco?.logradouro || 'Sem Rua',
                numero: tutor.endereco?.numero || 'SN',
                bairro: tutor.endereco?.bairro || 'Sem Bairro',
                codigo_municipio: (tutor.endereco?.codigo_municipio || config.codigo_municipio)?.replace(/\D/g, ''),
                cep: (tutor.endereco?.cep || config.cep || '00000000')?.replace(/\D/g, ''),
                uf: tutor.endereco?.uf || config.uf
            }
        },
        servico: {
            aliquota: (config.aliquota_iss || 2).toFixed(2),
            base_calculo: valorFormatado,
            discriminacao: servico.descricao,
            iss_retido: '0',
            item_lista_servico: config.item_lista_servico,
            valor_iss: valorIss,
            valor_liquido: valorFormatado,
            valor_servicos: valorFormatado
        },
        natureza_operacao: '1',
        optante_simples_nacional: config.optante_simples_nacional ? 'true' : 'false'
    };
}
