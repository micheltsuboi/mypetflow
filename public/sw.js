self.addEventListener('install', (event) => {
    console.log('SW: Installing...');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('SW: Activating...');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // For PWA to be installable, it needs a fetch handler.
    // We let the browser handle the actual request normally.
    return;
});
