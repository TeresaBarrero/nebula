// Service worker de nebúla: hace la web instalable y permite abrirla sin conexión (solo consulta).
// · Páginas: primero la red; si no hay conexión, la última copia guardada (o Inicio).
// · Archivos de la app (/_next/static, iconos): de la copia guardada, que no cambian nunca.
// · Datos, /api, portal, Supabase y Stripe: siempre de la red (nunca se guardan aquí).
const VERSION = 'nebula-v5';
const PAGINAS = 'paginas-' + VERSION;
const ESTATICOS = 'estaticos-' + VERSION;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const NUNCA = ['/api/', '/portal/', '/reservar/', '/formulario/', '/auth/'];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || NUNCA.some((p) => url.pathname.startsWith(p))) return;

  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ESTATICOS).then(async (cache) => {
        const ya = await cache.match(req);
        if (ya) return ya;
        const r = await fetch(req);
        if (r.ok) cache.put(req, r.clone());
        return r;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && !r.redirected) caches.open(PAGINAS).then((c) => c.put(url.pathname, r.clone()));
          return r;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match('/inicio')) || Response.error()),
    );
  }
});
