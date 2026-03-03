'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    getAssessmentQuestions,
    createAssessmentQuestion,
    updateAssessmentQuestion,
    toggleAssessmentQuestionStatus,
    AssessmentQuestion
} from '@/app/actions/petAssessment'
import styles from './page.module.css'
import { Plus, Edit2, Power, PowerOff, ShieldAlert } from 'lucide-react'
import PlanGuard from '@/components/modules/PlanGuard'
import Link from 'next/link'

export default function AssessmentManagementPage() {
    const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
    const [loading, setLoading] = useState(true)
    const [unauthorized, setUnauthorized] = useState(false)
    const [orgId, setOrgId] = useState<string | null>(null)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null)
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState('')

    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('org_id, role, permissions')
                    .eq('id', user.id)
                    .single()

                if (profile?.org_id) {
                    const isStaff = profile.role === 'staff'
                    const hasAccess = isStaff ? ((profile.permissions as string[]) || []).includes('assessment') : true

                    if (!hasAccess) {
                        setUnauthorized(true)
                        setLoading(false)
                        return
                    }

                    setOrgId(profile.org_id)
                    const data = await getAssessmentQuestions(profile.org_id)
                    setQuestions(data)
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (question?: AssessmentQuestion) => {
        setFormError('')
        setEditingQuestion(question || null)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingQuestion(null)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setFormLoading(true)
        setFormError('')

        const formData = new FormData(e.currentTarget)
        const type = formData.get('question_type') as string

        if (type === 'select' && !formData.get('options')) {
            setFormError('Ao escolher Tipo Seleção, as opções são obrigatórias.')
            setFormLoading(false)
            return
        }

        try {
            let res
            if (editingQuestion) {
                res = await updateAssessmentQuestion(editingQuestion.id, formData)
            } else {
                res = await createAssessmentQuestion(formData)
            }

            if (res.success) {
                await loadData()
                handleCloseModal()
            } else {
                setFormError(res.message)
            }
        } catch (err) {
            setFormError('Erro inesperado ocorreu.')
        } finally {
            setFormLoading(false)
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (!confirm(`Deseja realmente ${currentStatus ? 'desativar' : 'ativar'} esta pergunta?`)) return

        try {
            const res = await toggleAssessmentQuestionStatus(id, currentStatus)
            if (res.success) {
                await loadData()
            } else {
                alert(res.message)
            }
        } catch (err) {
            alert('Erro ao alterar status')
        }
    }

    const categories = {
        social: 'Socialização e Comportamento',
        routine: 'Rotina e Adaptação',
        health: 'Saúde e Restrições',
        care: 'Cuidados Específicos'
    }

    const renderQuestionsList = (category: keyof typeof categories) => {
        const catQuestions = questions.filter(q => q.category === category)

        if (catQuestions.length === 0) {
            return <p style={{ color: 'var(--text-secondary)' }}>Nenhuma pergunta cadastrada nesta categoria.</p>
        }

        return (
            <div className={styles.questionList}>
                {catQuestions.map(q => (
                    <div key={q.id} className={`${styles.questionCard} ${!q.is_active ? styles.inactive : ''}`}>
                        <div className={styles.questionInfo}>
                            <p className={styles.questionText}>{q.question_text}</p>
                            <div className={styles.questionMeta}>
                                <span className={styles.badge}>
                                    {q.question_type === 'boolean' ? 'Sim / Não' : q.question_type === 'text' ? 'Texto Livre' : 'Seleção'}
                                </span>
                                <span className={styles.badge}>Ordem: {q.order_index}</span>
                                {q.system_key && <span className={styles.badge} title="Chave de Sistema">🔒</span>}
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <button
                                onClick={() => handleOpenModal(q)}
                                className={styles.actionBtn}
                                title="Editar"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleToggleStatus(q.id, q.is_active)}
                                className={`${styles.actionBtn} ${q.is_active ? styles.destructive : ''}`}
                                title={q.is_active ? 'Desativar' : 'Ativar'}
                            >
                                {q.is_active ? <PowerOff size={16} /> : <Power size={16} color="green" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (loading) return <div className={styles.container}>Carregando perguntas...</div>

    if (unauthorized) {
        return (
            <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <ShieldAlert size={64} color="var(--destructive)" />
                <h2 style={{ marginTop: '1.5rem', fontSize: '1.5rem' }}>Acesso Negado</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Você não tem permissão para acessar o gerenciamento de questionários.<br />
                    Solicite acesso ao administrador da sua organização.
                </p>
                <Link href="/owner" className={styles.addButton} style={{ marginTop: '2rem', textDecoration: 'none' }}>
                    Voltar para Home
                </Link>
            </div>
        )
    }

    return (
        <PlanGuard requiredModule="pets">
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Gerenciar Questionário</h1>
                    <button className={styles.addButton} onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Nova Pergunta
                    </button>
                </div>

                {(Object.keys(categories) as Array<keyof typeof categories>).map(catKey => (
                    <div key={catKey} className={styles.categoryGroup}>
                        <h2 className={styles.categoryTitle}>{categories[catKey]}</h2>
                        {renderQuestionsList(catKey)}
                    </div>
                ))}

                {isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h2 className={styles.modalTitle}>
                                {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
                            </h2>

                            {formError && <div className={styles.errorMessage}>{formError}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className={styles.formGroup}>
                                    <label>Categoria</label>
                                    <select name="category" className={styles.select} defaultValue={editingQuestion?.category || 'social'} required>
                                        <option value="social">Socialização e Comportamento</option>
                                        <option value="routine">Rotina e Adaptação</option>
                                        <option value="health">Saúde e Restrições</option>
                                        <option value="care">Cuidados Específicos</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Pergunta</label>
                                    <input
                                        type="text"
                                        name="question_text"
                                        className={styles.input}
                                        defaultValue={editingQuestion?.question_text}
                                        required
                                        placeholder="Ex: Possui rotina organizada?"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Tipo de Resposta</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <input type="radio" name="question_type" value="boolean" defaultChecked={!editingQuestion || editingQuestion.question_type === 'boolean'} required />
                                            Sim / Não
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <input type="radio" name="question_type" value="text" defaultChecked={editingQuestion?.question_type === 'text'} />
                                            Texto Livre
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <input type="radio" name="question_type" value="select" defaultChecked={editingQuestion?.question_type === 'select'} />
                                            Seleção
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Opções (Apenas para tipo Seleção)</label>
                                    <input
                                        type="text"
                                        name="options"
                                        className={styles.input}
                                        defaultValue={editingQuestion?.options ? (Array.isArray(editingQuestion.options) ? editingQuestion.options.join(',') : '') : ''}
                                        placeholder="Ex: calmo, nervoso, tem medo"
                                    />
                                    <span className={styles.helperText}>Separe as opções por vírgula.</span>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Ordem de Exibição</label>
                                    <input
                                        type="number"
                                        name="order_index"
                                        className={styles.input}
                                        defaultValue={editingQuestion?.order_index || 10}
                                        required
                                        min={0}
                                    />
                                    <span className={styles.helperText}>Define a ordem desta pergunta na categoria (números menores aparecem primeiro).</span>
                                </div>

                                <div className={styles.modalActions}>
                                    <button type="button" className={styles.cancelBtn} onClick={handleCloseModal} disabled={formLoading}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className={styles.submitBtn} disabled={formLoading}>
                                        {formLoading ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </PlanGuard>
    )
}
