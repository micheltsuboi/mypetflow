'use client';

import { useEffect } from 'react';

export default function SWRegistration() {
    useEffect(() => {
        // Service Workers work on HTTPS or localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHttps = window.location.protocol === 'https:';

        if ('serviceWorker' in navigator && (isLocalhost || isHttps)) {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('SW: registered successfully: ', registration.scope);
                    })
                    .catch((registrationError) => {
                        console.error('SW: registration failed: ', registrationError);
                    });
            });
        } else {
            console.warn('SW: Service Workers are missing or not supported on this protocol/domain (HTTPS required).');
        }
    }, []);

    return null;
}
