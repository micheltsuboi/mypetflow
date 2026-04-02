import { FiscalConfig } from '@/types/database'

export interface NFeBuilderParams {
    config: FiscalConfig;
    ref_uuid: string; // The order/sale UUID
    total_amount: number;
    tutor?: {
        nome: string;
        cpf?: string;
        endereco?: {
            logradouro?: string;
            numero?: string;
            bairro?: string;
            codigo_municipio?: string;
            city?: string;
            cep?: string;
            uf?: string;
        };
    };
    items: {
        id: string; // Internal id (item number 1... N)
        descricao: string;
        quantidade: number;
        valor_unitario: number;
        ncm: string;
        cfop: string;
        cst: string;
        unidade: string;
    }[];
}

/**
 * Builds the payload for Focus NFe API for NFe (Produtos)
 */
export function buildNFePayload({ config, ref_uuid, total_amount, tutor, items }: NFeBuilderParams) {
    const totalFormatado = (total_amount || 0).toFixed(2);
    
    // Format items
    const formattedItems = items.map((item, index) => {
        const valorUnitario = (item.valor_unitario || 0).toFixed(4)
        const valorBruto = ((item.valor_unitario || 0) * (item.quantidade || 0)).toFixed(2)

        return {
            numero_item: index + 1,
            codigo_produto: (item.id || String(index)).substring(0, 15), // Avoid breaking focus constraint
            descricao: item.descricao || 'Produto sem descrição',
            cfop: item.cfop || '5102',
            unidade_comercial: item.unidade || 'un',
            quantidade_comercial: item.quantidade || 1,
            valor_unitario_comercial: valorUnitario,
            valor_unitario_tributavel: valorUnitario,
            unidade_tributavel: item.unidade || 'un',
            codigo_ncm: item.ncm || '00000000',
            quantidade_tributavel: item.quantidade || 1,
            valor_bruto: valorBruto,
            icms_situacao_tributaria: item.cst || '102', // CSOSN 102 (Tributada pelo SN s/ permissão de crédito)
            icms_origem: "0",
            pis_situacao_tributaria: "07",
            cofins_situacao_tributaria: "07"
        }
    });

    const numTutorCpf = tutor?.cpf?.replace(/\D/g, '');

    const root: any = {
        ref: `petflow_${ref_uuid}`,
        natureza_operacao: "Venda",
        data_emissao: new Date().toISOString(),
        tipo_documento: 1, // Saída
        finalidade_emissao: 1, // Normal
        cnpj_emitente: config.cnpj?.replace(/\D/g, ''),
        inscricao_estadual_emitente: (config.inscricao_estadual?.trim().toUpperCase() === 'ISENTO' 
            ? 'ISENTO' 
            : (config.inscricao_estadual?.replace(/\D/g, '') || 'ISENTO')),
        nome_emitente: config.razao_social,
        logradouro_emitente: 'S/N', 
        bairro_emitente: 'Consumidor', // Placeholder common in simple configs
        municipio_emitente: config.municipio || '-',
        uf_emitente: config.uf || '-',
        cep_emitente: config.cep?.replace(/\D/g, '') || '00000000',
        
        valor_frete: 0.0,
        valor_seguro: 0.0,
        valor_total: totalFormatado,
        valor_produtos: totalFormatado,
        modalidade_frete: 9, // Sem frete
        items: formattedItems,

        // --- Responsável Técnico (Obrigatório em PR, AM, MS, PE, SC, etc.) ---
        cnpj_responsavel_tecnico: config.resp_tecnico_cnpj?.replace(/\D/g, ''),
        contato_responsavel_tecnico: config.resp_tecnico_contato,
        email_responsavel_tecnico: config.resp_tecnico_email,
        telefone_responsavel_tecnico: config.resp_tecnico_telefone?.replace(/\D/g, ''),
        id_csrt: config.resp_tecnico_id_csrt,
        // hash_csrt: config.resp_tecnico_hash_csrt // Focus calcula auto se enviado a chave
    };

    if (numTutorCpf && tutor) {
        root.cpf_destinatario = numTutorCpf;
        root.nome_destinatario = tutor.nome;
        root.indicador_inscricao_estadual_destinatario = 9; // Não contribuinte
        if (tutor.endereco) {
            root.logradouro_destinatario = tutor.endereco.logradouro || '-';
            root.numero_destinatario = tutor.endereco.numero || 'SN';
            root.bairro_destinatario = tutor.endereco.bairro || '-';
            // municipio_destinatario prefers codigo_municipio (IBGE) but falls back to city name if needed
            root.municipio_destinatario = tutor.endereco.codigo_municipio || tutor.endereco.city || config.municipio || '-';
            root.uf_destinatario = tutor.endereco.uf || config.uf || '-';
            root.cep_destinatario = tutor.endereco.cep?.replace(/\D/g, '') || '00000000';
        }
    } else {
        // Consumer Note without identification (Cupom NFCe usually, but we use NFe here if allowed by UF, otherwise CPF is strictly required).
        // Let's assume standard behavior is to require it or fallback.
        root.nome_destinatario = 'CONSUMIDOR FINAL';
        root.indicador_inscricao_estadual_destinatario = 9;
    }

    return root;
}
