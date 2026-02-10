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

    if (loading) {
        return <div className={styles.container}>Carregando...</div>
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Meu Perfil</h1>

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

                    <button type="submit" className={styles.saveButton} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </form>
            </div>
        </div>
    )
}
