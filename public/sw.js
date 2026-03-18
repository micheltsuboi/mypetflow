self.addEventListener('install', (event) => {
    // Skip waiting and claim clients immediately so the app is installable right away
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // If the browser doesn't find a response, it will fall back to fetching normally.
    // This listener makes the PWA installable.
});
