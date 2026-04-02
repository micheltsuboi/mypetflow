'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { FiscalConfig } from '@/types/database'

interface FiscalOnboardingClientProps {
    initialConfig: FiscalConfig | null
}

export default function FiscalOnboardingClient({ initialConfig }: FiscalOnboardingClientProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [formData, setFormData] = useState({
        cnpj: initialConfig?.cnpj || '',
        razao_social: initialConfig?.razao_social || '',
        inscricao_municipal: initialConfig?.inscricao_municipal || '',
        inscricao_estadual: initialConfig?.inscricao_estadual || '',
        regime_tributario: initialConfig?.regime_tributario || 1, // 1=Simples Nacional, 2=Lucro Presumido, 3=Lucro Real
        cep: initialConfig?.cep || '',
        logradouro: '', // Only mapped internally for Focus NFE request
        numero: '',
        bairro: '',
        municipio: initialConfig?.municipio || '',
        codigo_municipio: initialConfig?.codigo_municipio || '', // IBGE code
        uf: initialConfig?.uf || '',
        item_lista_servico: initialConfig?.item_lista_servico || '',
        aliquota_iss: initialConfig?.aliquota_iss || 2.0,
        codigo_tributario_municipio: initialConfig?.codigo_tributario_municipio || '',
        habilita_nfse: initialConfig?.habilita_nfse ?? true,
        habilita_nfe: initialConfig?.habilita_nfe ?? false,
        ambiente: initialConfig?.ambiente || 'homologacao',
        certificado_base64: initialConfig?.certificado_base64 || '',
        senha_certificado: initialConfig?.senha_certificado || '',
        // Responsável Técnico
        resp_tecnico_cnpj: initialConfig?.resp_tecnico_cnpj || '',
        resp_tecnico_contato: initialConfig?.resp_tecnico_contato || '',
        resp_tecnico_email: initialConfig?.resp_tecnico_email || '',
        resp_tecnico_telefone: initialConfig?.resp_tecnico_telefone || '',
        resp_tecnico_id_csrt: initialConfig?.resp_tecnico_id_csrt || '',
        dry_run: false
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const result = event.target?.result as string
            // Strip the base64 prefix
            const base64Content = result.split(',')[1]
            setFormData(prev => ({ ...prev, certificado_base64: base64Content }))
        }
        reader.readAsDataURL(file)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as any
        const val = type === 'checkbox' ? (e.target as any).checked : value
        setFormData(prev => ({ ...prev, [name]: val }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            // Build the format expected by our API Route
            const payload = {
                empresa: {
                    nome: formData.razao_social,
                    cnpj: formData.cnpj.replace(/\D/g, ''),
                    inscricao_municipal: formData.inscricao_municipal,
                    inscricao_estadual: formData.inscricao_estadual,
                    regime_tributario: Number(formData.regime_tributario),
                    cep: formData.cep.replace(/\D/g, ''),
                    logradouro: formData.logradouro || 'N/A',
                    numero: formData.numero || 'S/N',
                    bairro: formData.bairro || 'N/A',
                    municipio: formData.municipio,
                    codigo_municipio: formData.codigo_municipio,
                    uf: formData.uf,
                    habilita_nfse: formData.habilita_nfse,
                    habilita_nfe: formData.habilita_nfe,
                    arquivo_certificado_base64: formData.certificado_base64,
                    senha_certificado: formData.senha_certificado
                },
                ambiente: formData.ambiente,
                item_lista_servico: formData.item_lista_servico,
                aliquota_iss: formData.aliquota_iss,
                codigo_tributario_municipio: formData.codigo_tributario_municipio,
                habilita_nfse: formData.habilita_nfse,
                habilita_nfe: formData.habilita_nfe,
                certificado_base64: formData.certificado_base64, // Guardar tbm pra gente
                senha_certificado: formData.senha_certificado,
                // Responsável Técnico
                resp_tecnico_cnpj: formData.resp_tecnico_cnpj,
                resp_tecnico_contato: formData.resp_tecnico_contato,
                resp_tecnico_email: formData.resp_tecnico_email,
                resp_tecnico_telefone: formData.resp_tecnico_telefone,
                resp_tecnico_id_csrt: formData.resp_tecnico_id_csrt,
                dry_run: formData.dry_run
            }

            const response = await fetch('/api/nf/empresa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (!response.ok) {
                setMessage({ type: 'error', text: data.error + (data.details ? `: ${data.details}` : '') })
            } else {
                setMessage({ type: 'success', text: formData.dry_run ? 'Teste realizado com sucesso!' : 'Conta fiscal criada e vinculada com sucesso!' })
                if (!formData.dry_run) {
                    // Refetch or redirect
                    router.refresh()
                }
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao conectar à API: ' + error.message })
        } finally {
            setLoading(false)
        }
    }

    // Handlers
    const nextStep = () => setStep(prev => prev + 1)
    const prevStep = () => setStep(prev => prev - 1)

    return (
        <div className={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className={styles.title}>Configurações Fiscais</h1>
                    <p className={styles.subtitle}>Ative a emissão de cupons e notas fiscais do seu sistema</p>
                </div>
                {initialConfig && (
                    <button 
                        type="button" 
                        onClick={async () => {
                            setLoading(true)
                            try {
                                const res = await fetch('/api/nf/empresa/sync', { method: 'POST' })
                                const data = await res.json()
                                alert(data.message)
                                if (res.ok) router.refresh()
                            } catch (err: any) {
                                alert('Erro: ' + err.message)
                            } finally {
                                setLoading(false)
                            }
                        }}
                        disabled={loading}
                        className={styles.backButton}
                        style={{ border: '1px solid #FF6B6B', color: '#FF6B6B' }}
                    >
                        {loading ? 'Sincronizando...' : 'Sincronizar com Focus NFe'}
                    </button>
                )}
            </div>

            {message && (
                <div className={message.type === 'error' ? styles.errorCard : styles.statusCard}>
                    {message.text}
                </div>
            )}

            <div className={styles.stepper}>
                <div className={`${styles.step} ${step === 1 ? styles.active : ''}`}>1. Empresa</div>
                <div className={`${styles.step} ${step === 2 ? styles.active : ''}`}>2. Serviços (NFSe)</div>
                <div className={`${styles.step} ${step === 3 ? styles.active : ''}`}>3. Certificado</div>
                <div className={`${styles.step} ${step === 4 ? styles.active : ''}`}>4. Revisão</div>
            </div>

            <div className={styles.card}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    
                    {step === 1 && (
                        <>
                            <h3 className={styles.sectionTitle}>Dados Cadastrais</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>CNPJ</label>
                                    <input required className={styles.input} name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Razão Social</label>
                                    <input required className={styles.input} name="razao_social" value={formData.razao_social} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Regime Tributário</label>
                                    <select className={styles.select} name="regime_tributario" value={formData.regime_tributario} onChange={handleChange}>
                                        <option value="1">Simples Nacional (ME/EPP)</option>
                                        <option value="4">Simples Nacional (MEI)</option>
                                        <option value="2">Simples Nacional - Excesso de Sublimite</option>
                                        <option value="3">Regime Normal (Lucro Real ou Presumido)</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Inscrição Municipal (NFSe)</label>
                                    <input className={styles.input} name="inscricao_municipal" value={formData.inscricao_municipal} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Inscrição Estadual (NFe)</label>
                                    <input className={styles.input} name="inscricao_estadual" value={formData.inscricao_estadual} onChange={handleChange} />
                                </div>
                            </div>

                            <h3 className={styles.sectionTitle}>Endereço Fiscal</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>CEP</label>
                                    <input required className={styles.input} name="cep" value={formData.cep} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Código Município IBGE</label>
                                    <input required className={styles.input} name="codigo_municipio" value={formData.codigo_municipio} onChange={handleChange} placeholder="Ex: 3550308 (São Paulo)" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Município</label>
                                    <input required className={styles.input} name="municipio" value={formData.municipio} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>UF</label>
                                    <input required maxLength={2} className={styles.input} name="uf" value={formData.uf} onChange={handleChange} />
                                </div>
                                {/* Address details only for internal mappings if required */}
                                <div className={styles.formGroup}>
                                    <label>Logradouro</label>
                                    <input className={styles.input} name="logradouro" value={formData.logradouro} onChange={handleChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Número</label>
                                    <input className={styles.input} name="numero" value={formData.numero} onChange={handleChange} />
                                </div>
                            </div>

                            <h3 className={styles.sectionTitle}>Responsável Técnico (Obrigatório PR/AM/SC)</h3>
                            <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
                                Informe os dados da Software House (desenvolvedora do sistema) cadastrada na SEFAZ.
                            </p>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>CNPJ Responsável</label>
                                    <input className={styles.input} name="resp_tecnico_cnpj" value={formData.resp_tecnico_cnpj} onChange={handleChange} placeholder="CNPJ da Software House" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Nome do Contato</label>
                                    <input className={styles.input} name="resp_tecnico_contato" value={formData.resp_tecnico_contato} onChange={handleChange} placeholder="Ex: Suporte MyPet Flow" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email do Contato</label>
                                    <input className={styles.input} name="resp_tecnico_email" value={formData.resp_tecnico_email} onChange={handleChange} placeholder="email@softwarehouse.com" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Telefone do Contato</label>
                                    <input className={styles.input} name="resp_tecnico_telefone" value={formData.resp_tecnico_telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>ID CSRT (Opcional)</label>
                                    <input className={styles.input} name="resp_tecnico_id_csrt" value={formData.resp_tecnico_id_csrt} onChange={handleChange} placeholder="Identificador CSRT" />
                                </div>
                            </div>
                            
                            <div className={styles.buttonGroup} style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className={styles.saveButton} onClick={nextStep}>Próximo</button>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h3 className={styles.sectionTitle}>Configurações de Serviços</h3>
                            <label className={styles.checkboxGroup}>
                                <input type="checkbox" name="habilita_nfse" checked={formData.habilita_nfse} onChange={handleChange} />
                                <span>Habilitar emissão de Nota Fiscal de Serviços (NFSe)</span>
                            </label>
                            
                            {formData.habilita_nfse && (
                                <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>Código do Serviço (LC 116)</label>
                                        <input className={styles.input} name="item_lista_servico" value={formData.item_lista_servico} onChange={handleChange} placeholder="Ex: 0701 (Veterinária)" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Alíquota ISS (%)</label>
                                        <input type="number" step="0.01" className={styles.input} name="aliquota_iss" value={formData.aliquota_iss} onChange={handleChange} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Código Tributário Municipal</label>
                                        <input className={styles.input} name="codigo_tributario_municipio" value={formData.codigo_tributario_municipio} onChange={handleChange} />
                                    </div>
                                </div>
                            )}

                            <h3 className={styles.sectionTitle}>Configurações de Produtos do PDV</h3>
                            <label className={styles.checkboxGroup}>
                                <input type="checkbox" name="habilita_nfe" checked={formData.habilita_nfe} onChange={handleChange} />
                                <span>Habilitar emissão de NFe p/ produtos (exige Inscrição Estadual)</span>
                            </label>

                            <div className={styles.buttonGroup}>
                                <button type="button" className={styles.backButton} onClick={prevStep}>Voltar</button>
                                <button type="button" className={styles.saveButton} onClick={nextStep}>Próximo</button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h3 className={styles.sectionTitle}>Certificado Digital A1</h3>
                            <p className={styles.subtitle}>
                                Para autenticar sua empresa na prefeitura ou SEFAZ, faça o upload do seu certificado digital A1.
                            </p>

                            <div className={styles.formGroup}>
                                <label>Arquivo do Certificado (.pfx ou .p12)</label>
                                <input type="file" accept=".pfx,.p12" className={styles.input} onChange={handleFileChange} />
                                {formData.certificado_base64 && <span style={{ color: '#2ecc71', fontSize: '0.8rem' }}>✓ Arquivo carregado</span>}
                            </div>

                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                <label>Senha do Certificado</label>
                                <input type="password" required={!!formData.certificado_base64} className={styles.input} name="senha_certificado" value={formData.senha_certificado} onChange={handleChange} />
                            </div>

                            <div className={styles.buttonGroup}>
                                <button type="button" className={styles.backButton} onClick={prevStep}>Voltar</button>
                                <button type="button" className={styles.saveButton} onClick={nextStep}>Próximo</button>
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h3 className={styles.sectionTitle}>Revisão e Ativação</h3>
                            
                            <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                                <label>Ambiente Focus NFe</label>
                                <select className={styles.select} name="ambiente" value={formData.ambiente} onChange={handleChange}>
                                    <option value="homologacao">Homologação (Testes sem validade jurídica)</option>
                                    <option value="producao">Produção (Validade Jurídica)</option>
                                </select>
                            </div>

                            <label className={styles.checkboxGroup} style={{ marginBottom: '1.5rem' }}>
                                <input type="checkbox" name="dry_run" checked={formData.dry_run} onChange={handleChange} />
                                <span>Dry Run (Simular cadastro, não persistir na Focus NFe - para testes do sistema)</span>
                            </label>

                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                <p><strong>CNPJ:</strong> {formData.cnpj}</p>
                                <p><strong>Razão Social:</strong> {formData.razao_social}</p>
                                <p><strong>Permite NFSe:</strong> {formData.habilita_nfse ? 'Sim' : 'Não'}</p>
                                <p><strong>Permite NFe:</strong> {formData.habilita_nfe ? 'Sim' : 'Não'}</p>
                            </div>

                            <div className={styles.buttonGroup}>
                                <button type="button" className={styles.backButton} disabled={loading} onClick={prevStep}>Voltar</button>
                                <button type="submit" className={styles.saveButton} disabled={loading}>
                                    {loading ? 'Processando...' : initialConfig ? 'Atualizar Conta' : 'Criar Conta Fiscal'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    )
}
