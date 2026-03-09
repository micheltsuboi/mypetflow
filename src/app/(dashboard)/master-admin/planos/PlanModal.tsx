import styles from './page.module.css'

export const MODULES_LIST = [
    { id: 'agenda', label: 'Agenda', icon: '📅', description: 'Agendamentos em geral' },
    { id: 'banho_tosa', label: 'Banho e Tosa', icon: '🛁', description: 'Gestão de estética' },
    { id: 'creche', label: 'Creche', icon: '🐾', description: 'Daycare e diárias' },
    { id: 'hospedagem', label: 'Hospedagem', icon: '🏨', description: 'Hotel para pets' },
    { id: 'tutores', label: 'Tutores', icon: '👤', description: 'Cadastro de clientes' },
    { id: 'pets', label: 'Pets', icon: '🐶', description: 'Fichas e avaliações' },
    { id: 'servicos', label: 'Serviços', icon: '✂️', description: 'Catálogo e preços' },
    { id: 'pacotes', label: 'Pacotes', icon: '📦', description: 'Venda de pacotes' },
    { id: 'petshop', label: 'Petshop', icon: '🛍️', description: 'Ponto de venda (PDV)' },
    { id: 'clinica_vet', label: 'Clínica Vet', icon: '🩺', description: 'Consultas e exames' },
    { id: 'hospital', label: 'Hospital Vet', icon: '🏥', description: 'Internamento e leitos' },
    { id: 'cashback', label: 'Fidelidade/Cashback', icon: '💎', description: 'Programa de recompensas' },
    { id: 'financeiro', label: 'Financeiro', icon: '💰', description: 'Caixa e relatórios' },
    { id: 'usuarios', label: 'Usuários', icon: '👥', description: 'Gestão de equipe' },
    { id: 'ponto', label: 'Ponto', icon: '⏰', description: 'Controle de jornada' },
]

export default function PlanModal({
    plan,
    onClose,
    onSave,
    loading
}: {
    plan?: any,
    onClose: () => void,
    onSave: (formData: FormData) => void,
    loading: boolean
}) {
    const isEdit = !!plan

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{isEdit ? 'Editar Plano' : 'Novo Plano'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>

                <form action={onSave} className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Nome do Plano *</label>
                        <input name="name" required className={styles.input} defaultValue={plan?.name} placeholder="Ex: Plano Start" />
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Descrição</label>
                        <input name="description" className={styles.input} defaultValue={plan?.description} placeholder="Resumo curto sobre o plano" />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Preço Mensal (Opcional)</label>
                        <input name="price" type="number" step="0.01" className={styles.input} defaultValue={plan?.price} placeholder="0.00" />
                    </div>

                    <div className={styles.sectionHeader}>Módulos Liberados</div>

                    <div className={styles.modulesGrid} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                        {MODULES_LIST.map(mod => {
                            const isChecked = plan?.features?.includes(mod.id) || false
                            return (
                                <label key={mod.id} className={styles.moduleCard} style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="checkbox"
                                        name="features"
                                        value={mod.id}
                                        defaultChecked={isChecked}
                                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mod.icon} {mod.label}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{mod.description}</span>
                                    </div>
                                </label>
                            )
                        })}
                    </div>

                    <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading} style={{ marginTop: '1.5rem' }}>
                        {loading ? 'Salvando...' : 'Salvar Plano'}
                    </button>
                </form>
            </div>
        </div>
    )
}
