'use client'

import { useState, useActionState } from 'react'
import { createPetAssessment, updatePetAssessment } from '@/app/actions/petAssessment'
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

    const isEditing = !!existingData
    const action = isEditing ? updatePetAssessment : createPetAssessment

    const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
        const result = await action(petId, formData)
        if (result.success && onSuccess) {
            onSuccess()
        }
        return result
    }, initialState)

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <form action={formAction} className={styles.form}>
            {state.message && (
                <div className={state.success ? styles.successMessage : styles.errorMessage}>
                    {state.message}
                </div>
            )}

            {/* Seção 1: Socialização */}
            <div className={styles.section}>
                <button type="button" onClick={() => toggleSection('social')} className={styles.sectionHeader}>
                    <span>🐕 Socialização e Comportamento</span>
                    <span>{openSections.social ? '−' : '+'}</span>
                </button>
                {openSections.social && (
                    <div className={styles.sectionContent}>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="sociable_with_humans" defaultChecked={existingData?.sociable_with_humans} />
                                É sociável com humanos?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="sociable_with_dogs" defaultChecked={existingData?.sociable_with_dogs} />
                                É sociável com outros cães?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="socialized_early" defaultChecked={existingData?.socialized_early} />
                                Foi socializado na infância (primeiros meses)?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="desensitized" defaultChecked={existingData?.desensitized} />
                                Foi dessensibilizado (acostumado a sons, pessoas, objetos)?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="is_reactive" defaultChecked={existingData?.is_reactive} />
                                É reativo?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Se sim, descreva o comportamento reativo:</label>
                            <textarea name="reactive_description" rows={3} defaultValue={existingData?.reactive_description || ''} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="shows_escape_signs" defaultChecked={existingData?.shows_escape_signs} />
                                Apresenta sinais de fuga (tentar sair, cavar, pular portões)?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="has_bitten_person" defaultChecked={existingData?.has_bitten_person} />
                                Já mordeu alguma pessoa?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="has_been_bitten" defaultChecked={existingData?.has_been_bitten} />
                                Já foi mordido ou atacado por outro cão?
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Seção 2: Rotina */}
            <div className={styles.section}>
                <button type="button" onClick={() => toggleSection('routine')} className={styles.sectionHeader}>
                    <span>📅 Rotina e Adaptação</span>
                    <span>{openSections.routine ? '−' : '+'}</span>
                </button>
                {openSections.routine && (
                    <div className={styles.sectionContent}>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="has_routine" defaultChecked={existingData?.has_routine} />
                                Possui rotina organizada?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="regular_walks" defaultChecked={existingData?.regular_walks} />
                                Faz passeios regularmente?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="stays_alone_ok" defaultChecked={existingData?.stays_alone_ok} />
                                Fica em casa sozinho sem estresse?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Descreva a rotina diária do cão:</label>
                            <textarea name="daily_routine_description" rows={4} placeholder="Alimentação, passeios, tempo sozinho, interações..." defaultValue={existingData?.daily_routine_description || ''} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="separation_anxiety" defaultChecked={existingData?.separation_anxiety} />
                                Possui ansiedade de separação?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="has_phobias" defaultChecked={existingData?.has_phobias} />
                                Possui algum tipo de fobia (barulhos, chuva, pessoas)?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Se sim, qual fobia?</label>
                            <input type="text" name="phobia_description" defaultValue={existingData?.phobia_description || ''} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="possessive_behavior" defaultChecked={existingData?.possessive_behavior} />
                                É possessivo com objetos, brinquedos ou pessoas?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="humanization_traits" defaultChecked={existingData?.humanization_traits} />
                                Possui traços de humanização? (tratado como bebê, dorme na cama)
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="obeys_basic_commands" defaultChecked={existingData?.obeys_basic_commands} />
                                Obedece a comandos básicos (senta, fica, vem)?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="professionally_trained" defaultChecked={existingData?.professionally_trained} />
                                Já foi adestrado por profissional?
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Seção 3: Saúde */}
            <div className={styles.section}>
                <button type="button" onClick={() => toggleSection('health')} className={styles.sectionHeader}>
                    <span>🏥 Saúde e Restrições</span>
                    <span>{openSections.health ? '−' : '+'}</span>
                </button>
                {openSections.health && (
                    <div className={styles.sectionContent}>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="is_brachycephalic" defaultChecked={existingData?.is_brachycephalic} />
                                É braquicefálico? (focinho achatado)
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="age_health_restrictions" defaultChecked={existingData?.age_health_restrictions} />
                                Tem restrições de convivência por idade ou saúde?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="has_health_issues" defaultChecked={existingData?.has_health_issues} />
                                Possui (ou já teve) algum problema de saúde?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Se sim, qual problema de saúde?</label>
                            <textarea name="health_issues_description" rows={3} defaultValue={existingData?.health_issues_description || ''} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="food_restrictions" defaultChecked={existingData?.food_restrictions} />
                                Possui restrição alimentar?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Se sim, qual restrição?</label>
                            <input type="text" name="food_restrictions_description" defaultValue={existingData?.food_restrictions_description || ''} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="has_dermatitis" defaultChecked={existingData?.has_dermatitis} />
                                Possui dermatite ou alergias de pele?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="activity_restrictions" defaultChecked={existingData?.activity_restrictions} />
                                Possui restrição de atividade física?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="patellar_orthopedic_issues" defaultChecked={existingData?.patellar_orthopedic_issues} />
                                Possui problema patelar ou ortopédico?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Outros problemas de saúde, medicações ou cirurgias:</label>
                            <textarea name="other_health_notes" rows={4} defaultValue={existingData?.other_health_notes || ''} />
                        </div>
                    </div>
                )}
            </div>

            {/* Seção 4: Cuidados Específicos */}
            <div className={styles.section}>
                <button type="button" onClick={() => toggleSection('care')} className={styles.sectionHeader}>
                    <span>🍖 Cuidados Específicos</span>
                    <span>{openSections.care ? '−' : '+'}</span>
                </button>
                {openSections.care && (
                    <div className={styles.sectionContent}>
                        <div className={styles.fieldGroup}>
                            <label>Como o pet reage quando entra em contato com água?</label>
                            <select name="water_reaction" defaultValue={existingData?.water_reaction || ''}>
                                <option value="">Selecione...</option>
                                <option value="calmo">Calmo</option>
                                <option value="nervoso">Nervoso</option>
                                <option value="adora">Adora</option>
                                <option value="medo">Tem medo</option>
                                <option value="neutro">Neutro</option>
                            </select>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>
                                <input type="checkbox" name="pool_authorized" defaultChecked={existingData?.pool_authorized} />
                                O pet tem autorização para uso da piscina?
                            </label>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label>Qual ração ele come?</label>
                            <input type="text" name="food_brand" placeholder="Ex: Royal Canin Mini Adult" defaultValue={existingData?.food_brand || ''} />
                        </div>
                    </div>
                )}
            </div>

            {/* Declaração */}
            <div className={styles.declaration}>
                <label className={styles.declarationText}>
                    <input
                        type="checkbox"
                        name="owner_declaration_accepted"
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
