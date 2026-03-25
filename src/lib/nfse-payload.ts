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
        // Objeto de retorno construído manualmente para garantir a ordem das chaves do JS para o JSON
        const payload: any = {};
        
        // 1. Parâmetros de roteamento Focus (Raiz)
        payload.ref = `petflow_${ref_uuid}`;
        payload.cnpj_prestador = cnpjLimpo;
        payload.codigo_municipio_emissora = config.codigo_municipio?.replace(/\D/g, '');
        
        // 2. Cabeçalho do XML Nacional (ORDEM CRÍTICA)
        payload.tpAmb = config.ambiente === 'producao' ? 1 : 2;
        payload.dhEmi = agora.split('.')[0] + 'Z'; // Formato ISO sem milissegundos
        payload.dCompet = agora.split('T')[0];
        
        // 3. Prestador - Completo com Endereço (Obrigatório SPED)
        payload.prest = {
            CNPJ: cnpjLimpo,
            IM: config.inscricao_municipal,
            xNome: config.razao_social,
            end: {
                xLgr: 'Rua do Estabelecimento', // Placaholder exigido pelo schema
                nro: 'S/N',
                xBairro: 'Bairro',
                cMun: config.codigo_municipio?.replace(/\D/g, ''),
                CEP: config.cep?.replace(/\D/g, ''),
                UF: config.uf
            },
            regTrib: config.optante_simples_nacional ? 1 : 3 
        };
        
        // 4. Tomador
        payload.toma = {
            [cpfTomador?.length === 14 ? 'CNPJ' : 'CPF']: cpfTomador,
            xNome: tutor.nome,
            end: {
                xLgr: tutor.endereco?.logradouro || 'Sem Rua',
                nro: tutor.endereco?.numero || 'SN',
                xBairro: tutor.endereco?.bairro || 'Sem Bairro',
                cMun: (tutor.endereco?.codigo_municipio || config.codigo_municipio)?.replace(/\D/g, ''),
                CEP: (tutor.endereco?.cep || config.cep || '00000000')?.replace(/\D/g, ''),
                UF: tutor.endereco?.uf || config.uf
            }
        };
        
        // 5. Serviço ('cServ' pode vir do módulo ou pegar o configurado globalmente)
        payload.serv = {
            cServ: servico.codigo?.replace(/\D/g, '') || config.item_lista_servico?.replace(/\D/g, ''),
            xDesc: servico.descricao,
            vServ: {
                vServ: valorFormatado
            }
        };

        return payload;
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
