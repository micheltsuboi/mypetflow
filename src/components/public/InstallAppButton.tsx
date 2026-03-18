'use client';

import { useEffect, useState } from 'react';
import styles from './LandingPage.module.css';

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if it's iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstallable(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            alert('Para instalar no iPhone:\n1. Toque no ícone de Compartilhar (seta para cima)\n2. Role para baixo e toque em "Adicionar à Tela de Início"');
            return;
        }

        if (!deferredPrompt) {
            alert('O aplicativo já está instalado ou seu navegador não suporta instalação automática. Procure por "Instalar" no menu do seu navegador.');
            return;
        }

        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    return (
        <button
            onClick={handleInstallClick}
            className={styles.secondaryBtn}
            style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
        >
            <span className={styles.playIcon} style={{ fontSize: '1.2rem' }}>📱</span> Instalar App
        </button>
    );
}
