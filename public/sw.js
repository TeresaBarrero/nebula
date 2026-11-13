// Service worker mínimo de nebúla (Fase 0): solo hace la web instalable.
// El modo sin conexión llega en la Fase 5.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
