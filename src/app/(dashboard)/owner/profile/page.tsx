'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import ImageUpload from '@/components/ImageUpload'
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
                        phone: data.phone || '',
                        avatar_url: data.avatar_url || null
                    })
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [supabase])

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
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className={styles.input}
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
            </div>
        </div>
    )
}
