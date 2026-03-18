'use client';

import { useEffect, useState } from 'react';
import styles from './LandingPage.module.css';

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }

        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        const handleBeforeInstallPrompt = (e: any) => {
            console.log('PWA: beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (isStandalone) {
            alert('O App já está instalado e em uso!');
            return;
        }

        if (isIOS) {
            alert('Para instalar no iPhone:\n1. Toque no ícone de Compartilhar (seta para baixo)\n2. Role para baixo e toque em "Adicionar à Tela de Início"');
            return;
        }

        if (!deferredPrompt) {
            // Se não houver o prompt, o navegador pode não suportar ou o critério PWA não foi atendido
            alert('Seu navegador não disparou o convite de instalação automática. No Android/Chrome, clique nos 3 pontos no canto superior e selecione "Instalar Aplicativo".');
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    };

    // Se já estiver instalado, podemos esconder ou mostrar um estado diferente
    // Mas por enquanto, vamos manter o botão para não quebrar o layout

    return (
        <div
            onClick={handleInstallClick}
            className={styles.secondaryBtn}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
        >
            <span className={styles.playIcon} style={{ fontSize: '1.2rem' }}>📱</span> Instalar App
        </div>
    );
}
