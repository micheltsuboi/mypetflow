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
    };
}

/**
 * Builds the payload for Focus NFe API for NFSe
 */
export function buildNFSePayload({ config, ref_uuid, tutor, servico }: NFSeBuilderParams) {
    // Calcula o valor do ISS
    const valorIss = (servico.valor * (config.aliquota_iss / 100)).toFixed(2);
    const valorFormatado = servico.valor.toFixed(2);

    const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902';
    const cnpjLimpo = config.cnpj?.replace(/\D/g, '');
    const cpfTomador = tutor.cpf?.replace(/\D/g, '') || undefined;

    const payload: any = {
        ref: `petflow_${ref_uuid}`,
        data_emissao: new Date().toISOString(),
        natureza_operacao: "1", // 1 - Tributação no município
        optante_simples_nacional: config.optante_simples_nacional ? "true" : "false",
        servico: {
            aliquota: config.aliquota_iss.toFixed(2),
            base_calculo: valorFormatado,
            discriminacao: servico.descricao,
            iss_retido: "0",
            item_lista_servico: config.item_lista_servico,
            valor_iss: valorIss,
            valor_liquido: valorFormatado,
            valor_servicos: valorFormatado
        }
    };

    if (isNacional) {
        // No padrão Nacional (/nfsen), os nomes dos campos mudam para o padrão da Receita
        payload.cnpj_prestador = cnpjLimpo;
        payload.inscricao_municipal_prestador = config.inscricao_municipal;
        payload.codigo_municipio_emissora = config.codigo_municipio;

        payload.tomador = {
            cpf_cnpj_tomador: cpfTomador,
            razao_social: tutor.nome,
            email: tutor.email || undefined,
            endereco: tutor.endereco ? {
                logradouro: tutor.endereco.logradouro || 'Sem Rua',
                numero: tutor.endereco.numero || 'SN',
                bairro: tutor.endereco.bairro || 'Sem Bairro',
                codigo_municipio: (tutor.endereco.codigo_municipio || config.codigo_municipio)?.replace(/\D/g, ''),
                cep: tutor.endereco.cep?.replace(/\D/g, ''),
                uf: tutor.endereco.uf || config.uf
            } : {
                logradouro: 'Sem Rua',
                numero: 'SN',
                bairro: 'Sem Bairro',
                codigo_municipio: config.codigo_municipio?.replace(/\D/g, ''),
                uf: config.uf
            }
        };
    } else {
        payload.prestador = {
            cnpj: cnpjLimpo,
            inscricao_municipal: config.inscricao_municipal,
            codigo_municipio: config.codigo_municipio
        };
        payload.tomador = {
            cpf: cpfTomador,
            razao_social: tutor.nome,
            email: tutor.email || undefined,
            endereco: tutor.endereco ? {
                logradouro: tutor.endereco.logradouro || 'Sem Rua',
                numero: tutor.endereco.numero || 'SN',
                bairro: tutor.endereco.bairro || 'Sem Bairro',
                codigo_municipio: (tutor.endereco.codigo_municipio || config.codigo_municipio)?.replace(/\D/g, ''),
                cep: tutor.endereco.cep?.replace(/\D/g, ''),
                uf: tutor.endereco.uf || config.uf
            } : {
                logradouro: 'Sem Rua',
                numero: 'SN',
                bairro: 'Sem Bairro',
                codigo_municipio: config.codigo_municipio?.replace(/\D/g, ''),
                uf: config.uf
            }
        };
    }

    return payload;
}
