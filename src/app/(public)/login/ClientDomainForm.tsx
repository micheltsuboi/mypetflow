'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/app/page.module.css'

export default function ClientDomainForm() {
    const [domain, setDomain] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!domain.trim()) return

        setLoading(true)
        try {
            const currentHost = window.location.host // ex: localhost:3000 ou mypetflow.com.br
            const protocol = window.location.protocol

            // Remover o www. se existir, ou pegar o host puro se não houver
            let baseDomain = currentHost
            if (currentHost.startsWith('www.')) {
                baseDomain = currentHost.replace('www.', '')
            }

            // Redirecionamento forçado para o subdomínio da empresa
            window.location.href = `${protocol}//${domain.trim().toLowerCase()}.${baseDomain}`
        } catch (error) {
            console.error('Erro ao redirecionar', error)
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                <label className={styles.label}>Endereço do seu Pet Shop</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Ex: meupetshop"
                        className={styles.input}
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        required
                        style={{ borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '60%' }}
                    />
                    <div style={{
                        background: 'var(--bg-tertiary, rgba(0, 0, 0, 0.05))',
                        color: 'var(--text-secondary, #334155)',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--input-border, var(--border))',
                        borderLeft: 'none',
                        borderTopRightRadius: '0.75rem',
                        borderBottomRightRadius: '0.75rem',
                        width: '40%',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        .mypetflow.com.br
                    </div>
                </div>
            </div>

            <button type="submit" className={styles.button} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Redirecionando...' : 'Acessar Sistema'}
            </button>
        </form>
    )
}
