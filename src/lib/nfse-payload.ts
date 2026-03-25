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
    const valorFormatado = servico.valor.toFixed(2);
    const isNacional = config.codigo_municipio?.replace(/\D/g, '') === '4106902';
    const cnpjLimpo = config.cnpj?.replace(/\D/g, '');
    const cpfTomador = tutor.cpf?.replace(/\D/g, '') || undefined;
    const agora = new Date().toISOString(); 

    if (isNacional) {
        // ESTRUTURA HÍBRIDA FOCUS NFE NACIONAL (/nfsen)
        return {
            ref: `petflow_${ref_uuid}`,
            cnpj_prestador: cnpjLimpo, // Obrigatório na raiz pela Focus
            codigo_municipio_emissora: config.codigo_municipio?.replace(/\D/g, ''), // Obrigatório na raiz
            cpf_cnpj_tomador: cpfTomador, // Algumas prefeituras pedem na raiz
            tpAmb: config.ambiente === 'producao' ? 1 : 2,
            dhEmi: agora,
            dCompet: agora.split('T')[0],
            prest: {
                CNPJ: cnpjLimpo,
                IM: config.inscricao_municipal,
                xNome: config.razao_social,
                regTrib: config.optante_simples_nacional ? 1 : 3 
            },
            toma: {
                [cpfTomador?.length === 14 ? 'CNPJ' : 'CPF']: cpfTomador,
                xNome: tutor.nome,
                end: {
                    logradouro: tutor.endereco?.logradouro || 'Sem Rua',
                    num: tutor.endereco?.numero || 'SN',
                    bairro: tutor.endereco?.bairro || 'Sem Bairro',
                    cMun: (tutor.endereco?.codigo_municipio || config.codigo_municipio)?.replace(/\D/g, ''),
                    CEP: (tutor.endereco?.cep || config.cep || '00000000')?.replace(/\D/g, ''),
                    UF: tutor.endereco?.uf || config.uf
                }
            },
            serv: {
                cServ: config.item_lista_servico,
                xDesc: servico.descricao,
                vServ: {
                    vServ: valorFormatado
                }
            }
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
