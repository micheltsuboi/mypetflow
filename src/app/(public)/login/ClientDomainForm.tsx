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
                <label className={styles.label} style={{ color: 'white' }}>Endereço do seu Pet Shop</label>
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
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.7)',
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderLeft: 'none',
                        borderTopRightRadius: '8px',
                        borderBottomRightRadius: '8px',
                        width: '40%',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        .mypetflow.com.br
                    </div>
                </div>
            </div>

            <button type="submit" className={styles.button} disabled={loading} style={{ background: 'var(--color-coral)', border: 'none', width: '100%', padding: '1rem', borderRadius: '8px', color: '#0E1624', fontWeight: 'bold' }}>
                {loading ? 'Redirecionando...' : 'Acessar Sistema'}
            </button>
        </form>
    )
}
