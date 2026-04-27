'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import ImageUpload from '@/components/ImageUpload'
import { maskPhone } from '@/utils/masks'
import { registerCurrentAdminAsVet } from '@/app/actions/veterinary'

import { Profile } from '@/types/database'

export default function ProfilePage() {
    const supabase = createClient()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        avatar_url: '' as string | null
    })
    const [passwordData, setPasswordData] = useState({
        new: '',
        confirm: '',
        loading: false
    })
    const [isVet, setIsVet] = useState(false)
    const [vetData, setVetData] = useState({
        crmv: '',
        specialty: '',
        loading: false
    })

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (error) throw error

                if (data) {
                    setProfile(data)
                    setFormData({
                        full_name: data.full_name || '',
                        phone: maskPhone(data.phone || ''),
                        avatar_url: data.avatar_url || null
                    })

                    // Check if already a vet
                    const { data: vet } = await supabase
                        .from('veterinarians')
                        .select('*')
                        .eq('user_id', user.id)
                        .single()
                    
                    if (vet) {
                        setIsVet(true)
                        setVetData({
                            crmv: vet.crmv || '',
                            specialty: vet.specialty || '',
                            loading: false
                        })
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return

        try {
            setSaving(true)
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id)

            if (error) throw error

            alert('Perfil atualizado com sucesso!')
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Erro ao atualizar perfil.')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordData.new !== passwordData.confirm) {
            alert('As senhas não conferem.')
            return
        }
        if (passwordData.new.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.')
            return
        }

        try {
            setPasswordData(prev => ({ ...prev, loading: true }))
            const { error } = await supabase.auth.updateUser({
                password: passwordData.new
            })

            if (error) throw error

            alert('Senha atualizada com sucesso!')
            setPasswordData({ new: '', confirm: '', loading: false })
        } catch (error) {
            console.error('Error updating password:', error)
            alert('Erro ao atualizar senha.')
            setPasswordData(prev => ({ ...prev, loading: false }))
        }
    }

    const handleActivateVet = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setVetData(prev => ({ ...prev, loading: true }))
            const form = new FormData()
            form.append('crmv', vetData.crmv)
            form.append('specialty', vetData.specialty)

            const res = await registerCurrentAdminAsVet(form)
            if (res.success) {
                alert(res.message)
                setIsVet(true)
            } else {
                alert(res.message)
            }
        } catch (error) {
            console.error('Error activating vet profile:', error)
            alert('Erro ao ativar perfil de veterinário.')
        } finally {
            setVetData(prev => ({ ...prev, loading: false }))
        }
    }

    if (loading) {
        return <div className={styles.container}>Carregando...</div>
    }

    return (
        <div className={styles.container}>
            <div>
                <h1 className={styles.title}>Meu Perfil</h1>
                <p className={styles.subtitle}>Gerencie suas informações pessoais e segurança</p>
            </div>

            <div className={styles.card}>
                <form onSubmit={handleSave} className={styles.form}>
                    <div className={styles.avatarSection}>
                        <ImageUpload
                            bucket="avatars"
                            url={formData.avatar_url}
                            onUpload={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            onRemove={() => setFormData(prev => ({ ...prev, avatar_url: null }))}
                            label="Foto de Perfil"
                            circle={true}
                        />
                    </div>

                    <h3 className={styles.sectionTitle}>Informações Pessoais</h3>

                    <div className={styles.formGroup}>
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Telefone</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                            className={styles.input}
                            maxLength={15}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Email</label>
                        <input
                            type="text"
                            value={profile?.email}
                            disabled
                            className={`${styles.input} ${styles.disabled}`}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Função</label>
                        <input
                            type="text"
                            value={profile?.role.toUpperCase()}
                            disabled
                            className={`${styles.input} ${styles.disabled}`}
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.saveButton} disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar Informações'}
                        </button>
                    </div>
                </form>

                <div className={styles.passwordSection}>
                    <h3 className={styles.sectionTitle}>Segurança</h3>
                    <form onSubmit={handleUpdatePassword} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Nova Senha</label>
                            <input
                                type="password"
                                value={passwordData.new}
                                onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                className={styles.input}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={passwordData.confirm}
                                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                className={styles.input}
                                placeholder="Digite novamente"
                            />
                        </div>
                        <div className={styles.buttonGroup}>
                            <button type="submit" className={styles.saveButton} disabled={passwordData.loading || !passwordData.new}>
                                {passwordData.loading ? 'Atualizando...' : 'Atualizar Senha'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.passwordSection}>
                    <h3 className={styles.sectionTitle}>Perfil Profissional</h3>
                    <p className={styles.sectionDescription} style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {isVet 
                            ? "Seu perfil de veterinário está ativo. Você pode ser selecionado em consultas e acessar o painel clínico."
                            : "Ative seu perfil de veterinário para realizar consultas, emitir prontuários e aparecer nas listagens da clínica."}
                    </p>
                    
                    <form onSubmit={handleActivateVet} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Número do CRMV</label>
                            <input
                                type="text"
                                value={vetData.crmv}
                                onChange={e => setVetData({ ...vetData, crmv: e.target.value })}
                                className={styles.input}
                                placeholder="Ex: 12345/SP"
                                disabled={isVet}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Especialidade</label>
                            <input
                                type="text"
                                value={vetData.specialty}
                                onChange={e => setVetData({ ...vetData, specialty: e.target.value })}
                                className={styles.input}
                                placeholder="Ex: Dermatologia, Cirurgia"
                                disabled={isVet}
                            />
                        </div>
                        {!isVet && (
                            <div className={styles.buttonGroup}>
                                <button type="submit" className={styles.saveButton} disabled={vetData.loading || !vetData.crmv}>
                                    {vetData.loading ? 'Ativando...' : 'Ativar Perfil de Veterinário'}
                                </button>
                            </div>
                        )}
                        {isVet && (
                            <p style={{ color: 'var(--success)', fontWeight: '500', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                ✓ Perfil de Veterinário Ativo
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
