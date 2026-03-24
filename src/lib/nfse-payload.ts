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

    return {
        ref: `petflow_${ref_uuid}`,
        prestador: {
            cnpj: config.cnpj?.replace(/\D/g, ''),
            inscricao_municipal: config.inscricao_municipal,
            codigo_municipio: config.codigo_municipio
        },
        tomador: {
            cpf: tutor.cpf?.replace(/\D/g, '') || undefined,
            razao_social: tutor.nome,
            email: tutor.email || undefined,
            endereco: tutor.endereco ? {
                logradouro: tutor.endereco.logradouro || 'Sem Rua',
                numero: tutor.endereco.numero || 'SN',
                bairro: tutor.endereco.bairro || 'Sem Bairro',
                codigo_municipio: tutor.endereco.codigo_municipio || config.codigo_municipio,
                cep: tutor.endereco.cep?.replace(/\D/g, ''),
                uf: tutor.endereco.uf || config.uf
            } : undefined
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
        data_emissao: new Date().toISOString(),
        natureza_operacao: "1", // 1 - Tributação no município
        optante_simples_nacional: config.optante_simples_nacional ? "true" : "false"
    }
}
