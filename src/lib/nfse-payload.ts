import { FiscalConfig } from '@/types/database'

export interface NFSeBuilderParams {
    config: FiscalConfig;
    ref_uuid: string; // The service UUID
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
        codigo?: string; // Código de serviço específico (dinâmico por módulo)
    };
}

/**
 * Builds the payload for Focus NFe API for NFSe
 */
export function buildNFSePayload({ config, ref_uuid, tutor, servico }: NFSeBuilderParams) {
    const valorFormatado = servico.valor.toFixed(2);
    const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902';
    const cnpjLimpo = config.cnpj?.replace(/\D/g, '');
    const cpfTomador = tutor.cpf?.replace(/\D/g, '') || undefined;
    const agora = new Date().toISOString(); 

    if (isNacional) {
        // ================================================================
        // PADRÃO NACIONAL (Curitiba) — Endpoint /v2/nfsen da Focus NFe
        // Documentação: https://focusnfe.com.br/doc/#nfse-nacional
        // IMPORTANTE: Os campos aqui são da API da Focus NFe, NÃO os campos
        // XML/SPED. A Focus converte internamente para o XML obrigatório.
        // ================================================================

        // Formatar data no padrão aceito pela Focus para NFSen: YYYY-MM-DDThh:mm:ss-0300
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const offset = -d.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const tzHours = pad(Math.floor(Math.abs(offset) / 60));
        const tzMins = pad(Math.abs(offset) % 60);
        // Focus NFen usa timezone SEM ":" (ex: -0300, não -03:00)
        const tz = sign + tzHours + tzMins;
        const dataEmissao = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + tz;
        const dataCompetencia = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());

        // Código de serviço: formato da CBNSS nacional (ex: "010701" para serviços veterinários)
        // O código passado do módulo é "08.02" → limpar para "0802" → formatar como nacional "080200"
        const codigoServicoBruto = servico.codigo || config.item_lista_servico || '080200';
        const codigoServicoNacional = codigoServicoBruto.replace(/\D/g, '').padEnd(6, '0');

        return {
            ref: `petflow_${ref_uuid}`,
            // --- Campos de roteamento (raiz) ---
            cnpj_prestador: cnpjLimpo,
            codigo_municipio_emissora: parseInt(config.codigo_municipio?.replace(/\D/g, '') || '0'),
            // --- Identificação do DPS ---
            data_emissao: dataEmissao,
            data_competencia: dataCompetencia,
            serie_dps: 1,
            emitente_dps: 1, // 1 = Prestador
            // --- Dados completos do Prestador ---
            inscricao_municipal_prestador: config.inscricao_municipal,
            razao_social_prestador: config.razao_social,
            // Endereço do prestador
            cep_prestador: config.cep?.replace(/\D/g, ''),
            codigo_municipio_prestador: parseInt(config.codigo_municipio?.replace(/\D/g, '') || '0'),
            // Regime tributário
            regime_especial_tributacao: config.optante_simples_nacional ? 6 : 0, // 6 = Microempresa Municipal / 0 = Nenhum
            codigo_opcao_simples_nacional: config.optante_simples_nacional ? 1 : 2, // 1=Sim, 2=Não
            // --- Local de prestação ---
            codigo_municipio_prestacao: parseInt(config.codigo_municipio?.replace(/\D/g, '') || '0'),
            // --- Dados do Tomador (CPF/CNPJ DEVE vir antes do nome) ---
            ...(cpfTomador && cpfTomador.length === 14
                ? { cnpj_tomador: cpfTomador }
                : { cpf_tomador: cpfTomador || undefined }
            ),
            razao_social_tomador: tutor.nome,
            ...(tutor.email ? { email_tomador: tutor.email } : {}),
            // --- Serviço ---
            codigo_tributacao_nacional_iss: codigoServicoNacional,
            descricao_servico: servico.descricao,
            valor_servico: parseFloat(valorFormatado),
            // --- Tributação ISS (tribMun obrigatório) ---
            tributacao_iss: 1, // 1 = Tributável no município
            tipo_retencao_iss: 1, // 1 = Normal (sem retenção)
            percentual_aliquota_relativa_municipio: config.aliquota_iss || 2.00,
        };
    }


    // PADRÃO TRADICIONAL FOCUS NFE (/nfse)
    const valorIss = (servico.valor * (config.aliquota_iss / 100)).toFixed(2);
    return {
        ref: `petflow_${ref_uuid}`,
        data_emissao: agora,
        prestador: {
            cnpj: cnpjLimpo,
            inscricao_municipal: config.inscricao_municipal,
            codigo_municipio: config.codigo_municipio
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
            aliquota: config.aliquota_iss.toFixed(2),
            base_calculo: valorFormatado,
            discriminacao: servico.descricao,
            iss_retido: "0",
            item_lista_servico: config.item_lista_servico,
            valor_iss: valorIss,
            valor_liquido: valorFormatado,
            valor_servicos: valorFormatado
        },
        natureza_operacao: "1",
        optante_simples_nacional: config.optante_simples_nacional ? "true" : "false"
    };
}
