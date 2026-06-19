const CACHE='ssp-v222-ssp-v216-cache';
const ASSETS=['./','./index.html','./css/style.css','./js/app.js','./js/audio.js','./js/player.js','./js/playlist.js','./js/statistics.js','./js/config.js','./js/storage.js','./manifest.webmanifest','./icons/logo.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html')))); });
