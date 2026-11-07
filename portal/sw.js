/* Clash Esports portal service worker: Web Push only (no caching, no offline).
   Payload from the API: { title, body, url, tag }. Scope = the folder this file sits in (/portal/). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const scope = self.registration.scope;
  event.waitUntil(self.registration.showNotification(d.title || 'Clash Esports', {
    body: d.body || '',
    icon: new URL('../assets/instagram-hd/profile.jpg', scope).href,
    tag: d.tag || 'clash-wait', /* a new one replaces the old one */
    renotify: true,
    data: { url: d.url || '' },
  }));
});

/* open the payload url only if it stays inside this scope (same origin and under the scope path); else the portal home */
function safeTarget(url, scope) {
  const home = new URL('./index.html', scope).href;
  try {
    const u = new URL(url || './index.html', scope);
    return u.origin === new URL(scope).origin && u.href.startsWith(scope) ? u.href : home;
  } catch (e) { return home; }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  const target = safeTarget(event.notification.data && event.notification.data.url, scope);
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(scope) && 'focus' in c);
    if (open) return open.focus();
    return self.clients.openWindow(target);
  }));
});
