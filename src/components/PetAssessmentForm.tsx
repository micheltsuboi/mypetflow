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
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
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

    const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
        const form = e.currentTarget.closest('form')
        if (form && form.reportValidity()) {
            setCurrentStepIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        setCurrentStepIndex(prev => Math.max(0, prev - 1))
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
        let exBoolean: boolean | null = null
        let exText = ''
        if (existingData?.answers && existingData.answers[question.id]) {
            exBoolean = existingData.answers[question.id].boolean !== undefined ? existingData.answers[question.id].boolean : null
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
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        {question.question_text}
                    </label>
                    <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name={fieldName}
                                value="true"
                                defaultChecked={exBoolean === true}
                                required
                            />
                            Sim
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name={fieldName}
                                value="false"
                                defaultChecked={exBoolean === false}
                                required
                            />
                            Não
                        </label>
                    </div>
                </div>
            )
        }

        if (question.question_type === 'text') {
            return (
                <div className={styles.fieldGroup}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{question.question_text}</label>
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
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{question.question_text}</label>
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

    const renderSection = (catKey: keyof typeof categories, catTitle: string) => {
        const sectionQuestions = questions.filter(q => q.category === catKey)
        if (sectionQuestions.length === 0) return null

        return (
            <div className={styles.section} key={catKey}>
                <div className={styles.sectionHeader} style={{ cursor: 'default' }}>
                    <span>{catTitle}</span>
                </div>
                <div className={styles.sectionContent}>
                    {sectionQuestions.map(q => (
                        <div key={q.id}>
                            {renderQuestionInput(q)}
                        </div>
                    ))}
                </div>
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

    const categoryKeys = Object.keys(categories) as Array<keyof typeof categories>
    const isConfirmationStep = currentStepIndex === categoryKeys.length

    return (
        <form action={formAction} className={styles.form}>
            {state.message && (
                <div className={state.success ? styles.successMessage : styles.errorMessage}>
                    {state.message}
                </div>
            )}

            {!isPending && (
                <>
                    <div className={styles.progressContainer}>
                        Passo {currentStepIndex + 1} de {categoryKeys.length + 1}
                        <div style={{ fontSize: '0.85rem', fontWeight: 400, marginTop: '0.2rem' }}>
                            {isConfirmationStep ? 'Finalizar Avaliação' : categories[categoryKeys[currentStepIndex]].title}
                        </div>
                    </div>

                    {categoryKeys.map((catKey, index) => {
                        if (index !== currentStepIndex) return null
                        return renderSection(catKey, categories[catKey].title)
                    })}

                    {isConfirmationStep && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader} style={{ cursor: 'default' }}>
                                <span>Declaração de Veracidade</span>
                            </div>
                            <div className={styles.sectionContent}>
                                <div className={styles.declaration} style={{ margin: 0 }}>
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
                            </div>
                        </div>
                    )}

                    <div className={styles.actions}>
                        {currentStepIndex > 0 && (
                            <button type="button" onClick={handlePrev} className="btn btn-secondary">
                                Anterior
                            </button>
                        )}

                        {currentStepIndex < categoryKeys.length ? (
                            <button type="button" onClick={handleNext} className="btn btn-primary">
                                Próximo
                            </button>
                        ) : (
                            <button type="submit" disabled={!declarationAccepted || isPending} className="btn btn-primary">
                                {isEditing ? 'Atualizar Avaliação' : 'Salvar Avaliação'}
                            </button>
                        )}
                    </div>
                </>
            )}

            {isPending && (
                <div style={{ padding: '2rem', textAlign: 'center', fontWeight: 'bold' }}>Salvando avaliação...</div>
            )}
        </form>
    )
}
