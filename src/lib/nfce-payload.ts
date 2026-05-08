import { FiscalConfig } from '@/types/database'

export interface NFCeBuilderParams {
    config: FiscalConfig;
    ref_uuid: string;
    total_amount: number;
    tutor?: {
        nome?: string;
        cpf?: string;
    };
    items: {
        id: string;
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
 * Builds the payload for Focus NFe API for NFC-e (Cupom Fiscal Eletrônico)
 * NFC-e é para venda presencial ao consumidor final.
 * 
 * CAMPO CRÍTICO: indicador_presenca = 1 (Operação presencial)
 * Sem este campo a SEFAZ rejeita com erro 717 "NFC-e em operação não presencial"
 * 
 * Valores possíveis para indicador_presenca:
 * 1 = Operação presencial (PADRÃO para PDV físico)
 * 2 = Operação não presencial, pela Internet
 * 3 = Operação não presencial, Teleatendimento
 * 4 = NFC-e em operação com entrega em domicílio
 * 9 = Operação não presencial, outros
 */
export function buildNFCePayload({ config, ref_uuid, total_amount, tutor, items }: NFCeBuilderParams) {
    const totalFormatado = (total_amount || 0).toFixed(2)

    const formattedItems = items.map((item, index) => {
        const valorUnitario = (item.valor_unitario || 0).toFixed(4)
        const valorBruto = ((item.valor_unitario || 0) * (item.quantidade || 0)).toFixed(2)

        return {
            numero_item: index + 1,
            codigo_produto: (item.id || String(index)).substring(0, 15),
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
            icms_situacao_tributaria: item.cst || '102',
            icms_origem: '0',
            pis_situacao_tributaria: '07',
            cofins_situacao_tributaria: '07'
        }
    })

    const root: any = {
        ref: `petflow_${ref_uuid}`,
        natureza_operacao: 'Venda ao Consumidor',
        data_emissao: new Date().toISOString(),

        // ===== CAMPOS OBRIGATÓRIOS PARA NFC-e =====
        // indicador_presenca = 1: Operação presencial no estabelecimento
        // SEM este campo → SEFAZ retorna erro 717 "NFC-e em operação não presencial"
        indicador_presenca: 1,

        tipo_documento: 1,       // 1 = Saída (venda)
        finalidade_emissao: 1,   // 1 = Normal
        // ==========================================

        cnpj_emitente: config.cnpj?.replace(/\D/g, ''),
        inscricao_estadual_emitente: (config.inscricao_estadual?.trim().toUpperCase() === 'ISENTO'
            ? 'ISENTO'
            : (config.inscricao_estadual?.replace(/\D/g, '') || 'ISENTO')),
        nome_emitente: config.razao_social,
        logradouro_emitente: 'S/N',
        bairro_emitente: 'Centro',
        municipio_emitente: config.municipio || '-',
        uf_emitente: config.uf || '-',
        cep_emitente: config.cep?.replace(/\D/g, '') || '00000000',

        valor_frete: 0.0,
        valor_seguro: 0.0,
        valor_total: totalFormatado,
        valor_produtos: totalFormatado,
        modalidade_frete: 9, // Sem frete
        items: formattedItems,

        // Responsável Técnico (obrigatório em vários estados)
        cnpj_responsavel_tecnico: config.resp_tecnico_cnpj?.replace(/\D/g, ''),
        contato_responsavel_tecnico: config.resp_tecnico_contato,
        email_responsavel_tecnico: config.resp_tecnico_email,
        telefone_responsavel_tecnico: config.resp_tecnico_telefone?.replace(/\D/g, ''),
        id_csrt: config.resp_tecnico_id_csrt,
    }

    // CPF do consumidor é opcional na NFC-e (mas recomendado quando disponível)
    const numCpf = tutor?.cpf?.replace(/\D/g, '')
    if (numCpf && numCpf.length === 11) {
        root.cpf_destinatario = numCpf
        if (tutor?.nome) {
            root.nome_destinatario = tutor.nome
        }
    }

    return root
}
