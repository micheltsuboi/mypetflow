'use client'

/**
 * 🐾 MyPet Flow - Pitch Deck / Apresentação Comercial
 * Público: Representantes e Parceiros Estratégicos
 * URL: /doc
 */

import React from 'react'

export default function DocPage() {
    return (
        <div style={{
            fontFamily: 'var(--font-montserrat), sans-serif',
            background: '#0D1B2A',
            color: '#FFFFFF',
            lineHeight: 1.6,
            minHeight: '100vh',
            padding: '40px 20px'
        }}>
            <style jsx global>{`
                @media print {
                    body { 
                        background: white !important; 
                        color: black !important; 
                    }
                    .doc-container { max-width: 100% !important; margin: 0 !important; }
                    .doc-section { 
                        background: white !important; 
                        border: 1px solid #ccc !important; 
                        page-break-inside: avoid; 
                        color: black !important;
                        backdrop-filter: none !important;
                    }
                    .doc-hero {
                        background: white !important;
                        border-bottom: 2px solid #00E4CE !important;
                        border-radius: 0 !important;
                    }
                    .doc-hero h1 { 
                        -webkit-text-fill-color: black !important; 
                        color: black !important;
                    }
                    .doc-text-secondary, .doc-section p, .doc-section li { 
                        color: black !important; 
                    }
                    .doc-highlight-box {
                        background: #fdf2f2 !important;
                        border-left: 4px solid #f08c98 !important;
                        color: black !important;
                    }
                }
            `}</style>

            <div className="doc-container" style={{
                maxWidth: '900px',
                margin: '0 auto',
            }}>
                <header className="doc-hero" style={{
                    textAlign: 'center',
                    padding: '60px 0',
                    background: 'linear-gradient(180deg, rgba(0, 228, 206, 0.1) 0%, transparent 100%)',
                    borderRadius: '30px',
                    marginBottom: '50px'
                }}>
                    <h1 style={{
                        fontSize: '3.5rem',
                        fontWeight: 800,
                        marginBottom: '10px',
                        background: 'linear-gradient(135deg, #00E4CE 0%, #F08C98 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>MyPet Flow</h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: '#B8CDD9',
                        fontWeight: 400
                    }}>O Futuro da Gestão Pet: Visual, Inteligente e Premium</p>
                </header>

                <div className="doc-section" style={{
                    marginBottom: '40px',
                    background: 'rgba(27, 59, 90, 0.4)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 228, 206, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '20px', color: '#00E4CE' }}>💎 1. Identidade Premium (UI/UX)</h2>
                    <p style={{ color: '#B8CDD9' }}>O MyPet Flow não é apenas um software, é uma ferramenta de branding para o Pet Shop.</p>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Interface <strong>Dark Mode</strong> nativa baseada na Montserrat.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Design de "vidro" (Glassmorphism) totalmente premium.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Performance ultra-rápida (Single Page Application).</li>
                    </ul>
                </div>

                <div className="doc-section" style={{
                    marginBottom: '40px',
                    background: 'rgba(27, 59, 90, 0.4)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 228, 206, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '20px', color: '#00E4CE' }}>🩺 2. Módulo Veterinário & Body Map</h2>
                    <p style={{ color: '#B8CDD9' }}>A ferramenta clínica mais impactante do mercado brasileiro.</p>
                    <div className="doc-highlight-box" style={{
                        background: 'rgba(240, 140, 152, 0.1)',
                        borderLeft: '4px solid #F08C98',
                        padding: '20px',
                        margin: '20px 0',
                        borderRadius: '0 15px 15px 0'
                    }}>
                        <strong style={{ color: '#FFFFFF' }}>📍 Diferencial Único:</strong> Mapa visual interativo para marcação exata de dores e lesões em modelos 2D de cães e gatos.
                    </div>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Prontuário com Salvamento Automático (Risco Zero).</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Geração instantânea de Receituário em PDF profissional.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Histórico geo-localizado da evolução clínica do pet.</li>
                    </ul>
                </div>

                <div className="doc-section" style={{
                    marginBottom: '40px',
                    background: 'rgba(27, 59, 90, 0.4)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 228, 206, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '20px', color: '#00E4CE' }}>🏨 3. Hotelaria, Creche e Banho</h2>
                    <p style={{ color: '#B8CDD9' }}>Gestão de fluxo operacional para alta volumetria.</p>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Status Visual:</strong> Aguardando → Atendimento → Finalizado.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Hotel Pet:</strong> Reservas multi-período com controle de check-in/out.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Daycare:</strong> Controle de frequência de alunos fixos e avulsos.</li>
                    </ul>
                </div>

                <div className="doc-section" style={{
                    marginBottom: '40px',
                    background: 'rgba(27, 59, 90, 0.4)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 228, 206, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '20px', color: '#00E4CE' }}>🛒 4. PDV Petshop e Regras de Negócio</h2>
                    <h3 style={{ fontSize: '1.3rem', color: '#F08C98', marginTop: '20px', marginBottom: '10px' }}>Personalização Total</h3>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Regras Customizadas:</strong> Atendimento sob medida (Secagem, Focinheira, Alergias).</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Cashback e Planos:</strong> Ferramentas de fidelização integradas.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>PDV Integrado:</strong> Venda de mercadorias física e digital em um fluxo único.</li>
                    </ul>
                </div>

                <div className="doc-section" style={{
                    marginBottom: '40px',
                    background: 'rgba(27, 59, 90, 0.4)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 228, 206, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '20px', color: '#00E4CE' }}>💬 5. Automação WhatsApp Cloud</h2>
                    <p style={{ color: '#B8CDD9' }}>Comunicação sem esforço manual que encanta o tutor.</p>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Check-in e Check-out automáticos disparados pelo sistema.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Disparo manual de alertas para veterinários ou tutores.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• Integração invisível que aumenta a satisfação do cliente em 3x.</li>
                    </ul>
                </div>

                <div className="doc-section" style={{
                    marginBottom: '40px',
                    background: 'rgba(27, 59, 90, 0.4)',
                    padding: '30px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 228, 206, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '20px', color: '#00E4CE' }}>📊 6. Painel do Proprietário</h2>
                    <p style={{ color: '#B8CDD9' }}>Tome decisões baseadas em lucros reais, não em intuição.</p>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Métricas Financeiras:</strong> Faturamento, Lucro Líquido e Despesas.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Multiparceiro:</strong> Subdomínios próprios para cada unidade de negócio.</li>
                        <li style={{ marginBottom: '10px', color: '#B8CDD9' }}>• <strong>Segurança RLS:</strong> Níveis de acesso exclusivos (Admin vs Staff vs Vet).</li>
                    </ul>
                </div>

                <p className="doc-footer-note" style={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    marginTop: '60px',
                    color: '#00E4CE',
                    fontSize: '1.1rem',
                    fontWeight: 600
                }}>MyPet Flow: Tecnologia que cuida, Gestão que prospera.</p>
            </div>
        </div>
    )
}
