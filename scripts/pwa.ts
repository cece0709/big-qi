/* Copyright (c) 2026 Celia. All rights reserved. */
import type {Plugin} from 'vite';
export function pwa():Plugin{return {name:'yijian-offline',generateBundle(_options,bundle){const assets=['/','/index.html','/manifest.webmanifest','/favicon.svg','/icon-192.png','/icon-512.png','/apple-touch-icon.png','/landscape.png','/install.html','/copyright.html','/THIRD_PARTY_NOTICES.txt',...Object.keys(bundle).filter(p=>p.endsWith('.js')||p.endsWith('.css')).map(p=>'/'+p)];
 const version='yijian-'+Object.keys(bundle).join('|');
 this.emitFile({type:'asset',fileName:'sw.js',source:`/* Copyright (c) 2026 Celia. All rights reserved. */
const CACHE=${JSON.stringify(version)},ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('yijian-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;}
if(ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));});
`});}};}
