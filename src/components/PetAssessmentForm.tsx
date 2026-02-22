'use client'

import { useState, useActionState, useEffect } from 'react'
import { createPetAssessment, updatePetAssessment, getActiveQuestionsForContext, getActiveQuestionsForPet, AssessmentQuestion } from '@/app/actions/petAssessment'
import styles from './AssessmentForm.module.css'

interface AssessmentFormProps {
    petId: string
    existingData?: any
    onSuccess?: () => void
}

const initialState = {
    message: '',
    success: false
}

export default function PetAssessmentForm({ petId, existingData, onSuccess }: AssessmentFormProps) {
    const [openSections, setOpenSections] = useState({ social: true, routine: false, health: false, care: false })
    const [declarationAccepted, setDeclarationAccepted] = useState(existingData?.owner_declaration_accepted || false)

    const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
    const [loadingQuestions, setLoadingQuestions] = useState(true)

    const isEditing = !!existingData
    const action = isEditing ? updatePetAssessment : createPetAssessment

    const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
        const result = await action(petId, formData)
        if (result.success && onSuccess) {
            onSuccess()
        }
        return result
    }, initialState)

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoadingQuestions(true)
            try {
                // Fetch dynamic questions for this pet's org
                const q = await getActiveQuestionsForPet(petId)
                if (q.length > 0) {
                    setQuestions(q)
                } else {
                    // Fallback to active questions for context if no pet org found directly
                    const fallbackQ = await getActiveQuestionsForContext()
                    setQuestions(fallbackQ)
                }

                console.log('[DEBUG] Fetched Questions:', await getActiveQuestionsForPet(petId))
                console.log('[DEBUG] Existing Data:', existingData)
            } catch (err) {
                console.error(err)
            } finally {
                setLoadingQuestions(false)
            }
        }
        fetchQuestions()
    }, [petId])

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const categories = {
        social: { title: '🐕 Socialização e Comportamento', key: 'social' },
        routine: { title: '📅 Rotina e Adaptação', key: 'routine' },
        health: { title: '🏥 Saúde e Restrições', key: 'health' },
        care: { title: '🍖 Cuidados Específicos', key: 'care' }
    }

    const renderQuestionInput = (question: AssessmentQuestion) => {
        const fieldName = `question_${question.id}`

        // Let's get existing answer if editing
        let exBoolean = false
        let exText = ''
        if (existingData?.answers && existingData.answers[question.id]) {
            exBoolean = existingData.answers[question.id].boolean || false
            exText = existingData.answers[question.id].text || ''
        } else if (existingData && question.system_key) {
            // Legacy data mapping fallback
            const val = existingData[question.system_key]
            if (typeof val === 'boolean') exBoolean = val
            else if (typeof val === 'string') exText = val
        }

        if (question.question_type === 'boolean') {
            return (
                <div className={styles.fieldGroup}>
                    <label>
                        <input
                            type="checkbox"
                            name={fieldName}
                            value="true"
                            defaultChecked={exBoolean}
                        />
                        {question.question_text}
                    </label>
                </div>
            )
        }

        if (question.question_type === 'text') {
            return (
                <div className={styles.fieldGroup}>
                    <label>{question.question_text}</label>
                    <textarea
                        name={fieldName}
                        rows={3}
                        defaultValue={exText}
                        className={styles.textarea}
                    />
                </div>
            )
        }

        if (question.question_type === 'select') {
            const options = Array.isArray(question.options) ? question.options : []
            return (
                <div className={styles.fieldGroup}>
                    <label>{question.question_text}</label>
                    <select name={fieldName} defaultValue={exText} className={styles.select}>
                        <option value="">Selecione...</option>
                        {options.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            )
        }

        return null
    }

    const renderSection = (catKey: keyof typeof openSections, catTitle: string) => {
        const sectionQuestions = questions.filter(q => q.category === catKey)
        if (sectionQuestions.length === 0) return null

        return (
            <div className={styles.section} key={catKey}>
                <button type="button" onClick={() => toggleSection(catKey)} className={styles.sectionHeader}>
                    <span>{catTitle}</span>
                    <span>{openSections[catKey] ? '−' : '+'}</span>
                </button>
                {openSections[catKey] && (
                    <div className={styles.sectionContent}>
                        {sectionQuestions.map(q => (
                            <div key={q.id}>
                                {renderQuestionInput(q)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    if (loadingQuestions) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando questionário...</div>
    }

    if (questions.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Nenhuma pergunta cadastrada para o questionário.</p>
                <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>Entre em contato com a equipe responsável.</p>
            </div>
        )
    }

    return (
        <form action={formAction} className={styles.form}>
            {state.message && (
                <div className={state.success ? styles.successMessage : styles.errorMessage}>
                    {state.message}
                </div>
            )}

            {Object.values(categories).map(cat =>
                renderSection(cat.key as keyof typeof openSections, cat.title)
            )}

            {/* Declaração */}
            <div className={styles.declaration}>
                <label className={styles.declarationText}>
                    <input
                        type="checkbox"
                        name="owner_declaration_accepted"
                        value="true"
                        required
                        checked={declarationAccepted}
                        onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    />
                    <span>
                        Declaro, para os devidos fins, que todas as informações prestadas neste formulário são verdadeiras
                        e refletem fielmente o comportamento, rotina e condições de saúde do meu pet.
                        Estou ciente de que respostas incorretas, omitidas ou incompletas podem comprometer a segurança
                        e o bem-estar do animal durante sua permanência na creche ou hospedagem.
                    </span>
                </label>
            </div>

            <div className={styles.actions}>
                <button type="submit" disabled={!declarationAccepted || isPending} className="btn btn-primary">
                    {isPending ? 'Salvando...' : (isEditing ? 'Atualizar Avaliação' : 'Salvar Avaliação')}
                </button>
            </div>
        </form>
    )
}
