'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import styles from './LandingPage.module.css';

export default function LandingHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.navInner}>
                    <div className={styles.logo}>
                        <Link href="/">
                            <Image 
                                src="/LOGO-02.png" 
                                alt="MyPet Flow" 
                                width={240} 
                                height={60} 
                                className={styles.logoImage}
                                priority 
                            />
                        </Link>
                    </div>

                    <nav className={styles.desktopNav}>
                        <Link href="#modulos">Módulos</Link>
                        <Link href="#diferenciais">Diferenciais</Link>
                        <Link href="#planos">Planos</Link>
                    </nav>

                    <div className={styles.authButtons}>
                        <Link href="/cadastro-empresa" className={styles.signupBtn}>Cadastrar Empresa</Link>
                        <button 
                            className={styles.menuToggle} 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {isMenuOpen && (
                    <div className={styles.mobileNav}>
                        <Link href="#modulos" onClick={() => setIsMenuOpen(false)}>Módulos</Link>
                        <Link href="#diferenciais" onClick={() => setIsMenuOpen(false)}>Diferenciais</Link>
                        <Link href="#planos" onClick={() => setIsMenuOpen(false)}>Planos</Link>
                        <hr className={styles.menuDivider} />
                        <Link href="/cadastro-empresa" className={styles.mobileMenuBtn} onClick={() => setIsMenuOpen(false)}>
                            Cadastrar Empresa
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}
