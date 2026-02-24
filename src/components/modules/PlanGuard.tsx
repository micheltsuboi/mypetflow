'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Props {
    children: React.ReactNode
    requiredModule: string
}

export default function PlanGuard({ children, requiredModule }: Props) {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setHasAccess(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id, role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'superadmin') {
                setHasAccess(true)
                return
            }

            if (profile?.org_id) {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('saas_plans(features)')
                    .eq('id', profile.org_id)
                    .single()

                if (!org || !org.saas_plans) {
                    // Sem plano = acesso total (legacy) ou pode-se mudar para false depois
                    setHasAccess(true)
                    return
                }

                const features = (org.saas_plans as any).features || []
                if (features.includes(requiredModule)) {
                    setHasAccess(true)
                } else {
                    setHasAccess(false)
                }
            } else {
                setHasAccess(false)
            }
        }

        checkAccess()
    }, [requiredModule, supabase])

    if (hasAccess === null) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                Verificando permissões...
            </div>
        )
    }

    if (hasAccess === false) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)',
                borderRadius: '12px', border: '1px solid var(--border-color)', margin: '2rem auto', maxWidth: '600px'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💎</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Recurso Premium</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                    O módulo de <strong>{requiredModule}</strong> não está incluído no seu plano atual.
                    Faça um upgrade do seu plano para liberar esta e outras funcionalidades exclusivas para decolar o seu negócio.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/owner" style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
                        Voltar ao Início
                    </Link>
                    <a href="https://wa.me/seunumerodevendas" target="_blank" rel="noreferrer" style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                        Falar com Consultor
                    </a>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
