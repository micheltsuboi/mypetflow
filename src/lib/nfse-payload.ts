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
    const valorIss = (servico.valor * (config.aliquota_iss / 100)).toFixed(2);
    const valorFormatado = servico.valor.toFixed(2);
    const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902';
    const cnpjLimpo = config.cnpj?.replace(/\D/g, '');
    const cpfTomador = tutor.cpf?.replace(/\D/g, '') || undefined;
    const dataCompetencia = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (isNacional) {
        // Padrão Nacional (/nfsen) exige campos na raiz ou ordem específica
        return {
            ref: `petflow_${ref_uuid}`,
            data_emissao: new Date().toISOString(),
            data_competencia: dataCompetencia,
            cnpj_prestador: cnpjLimpo,
            codigo_municipio_emissora: config.codigo_municipio,
            tomador: {
                cpf_cnpj_tomador: cpfTomador,
                razao_social: tutor.nome,
                email: tutor.email || undefined,
                endereco: {
                    logradouro: tutor.endereco?.logradouro || 'Sem Rua',
                    numero: tutor.endereco?.numero || 'SN',
                    bairro: tutor.endereco?.bairro || 'Sem Bairro',
                    codigo_municipio: (tutor.endereco?.codigo_municipio || config.codigo_municipio)?.replace(/\D/g, ''),
                    cep: (tutor.endereco?.cep || config.cep)?.replace(/\D/g, ''),
                    uf: tutor.endereco?.uf || config.uf
                }
            },
            servico: {
                aliquota: config.aliquota_iss.toFixed(2),
                base_calculo: valorFormatado,
                discriminacao: servico.descricao,
                iss_retido: false,
                item_lista_servico: config.item_lista_servico,
                valor_iss: valorIss,
                valor_servicos: valorFormatado
            }
        };
    }

    // Padrão Tradicional (/nfse)
    return {
        ref: `petflow_${ref_uuid}`,
        data_emissao: new Date().toISOString(),
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
                cep: (tutor.endereco?.cep || config.cep)?.replace(/\D/g, ''),
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
