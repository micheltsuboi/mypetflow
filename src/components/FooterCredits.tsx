'use client'

import React from 'react'
import Image from 'next/image'

const FooterCredits = () => {
    return (
        <footer style={{
            width: '100%',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            opacity: 0.5,
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            zIndex: 10,
            fontFamily: 'inherit'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Desenvolvido por</span>
                <a
                    href="https://mybusinessai.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        transition: 'transform 0.2s',
                        textDecoration: 'none'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Image
                        src="/mba_logo.png"
                        alt="My Business AI"
                        width={120}
                        height={28}
                        style={{
                            height: 'auto',
                            width: '110px',
                            objectFit: 'contain'
                        }}
                        priority
                    />
                </a>
            </div>
        </footer>
    )
}

export default FooterCredits
