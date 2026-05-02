const CACHE_NAME = 'gestao-cbm-v16';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata, sem esperar tabs fecharem
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Remove TODOS os caches antigos de versões anteriores
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      // Força todos os clientes (abas abertas) a recarregar com o novo SW
      return clients.claim();
    }).then(() => {
      // Notifica todos os clientes para recarregar a página
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e APIs externas
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('generativelanguage') ||
    event.request.url.includes('postimg.cc')
  ) {
    return;
  }

  // Estratégia Network First: tenta buscar da rede, usa cache como fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Atualiza o cache com a resposta mais recente
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Rede falhou, tenta do cache
        return caches.match(event.request);
      })
  );
});
