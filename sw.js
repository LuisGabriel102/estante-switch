// Estante do Switch: funciona sem internet.
// - o app fica guardado (abre na hora com o que está guardado; a versão nova chega na próxima vez)
// - os pacotes de gênero ficam guardados só quando você baixa (e são atualizados sozinhos quando muda)
// - capas e fotos: quem guarda é o botão "⬇ Baixar" de cada gênero; o resto fica no cache normal do navegador
const VERSAO = "1a42068390";
const APP = "estante-app-" + VERSAO;
const PACS = "estante-pacotes";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./app/01.js?v=3862aa47b8", "./app/02.js?v=853e066705", "./app/03.js?v=de80d68f6a", "./app/04.js?v=f9a7a7e2ec", "./app/05.js?v=aedf219313", "./app/06.js?v=4b04817e9e", "./app/07.js?v=75381df2d3", "./app/08.js?v=2cde205886", "./app/09.js?v=56b62670f3", "./app/10.js?v=92367c036b", "./app/11.js?v=e281f1f33d", "./app/12.js?v=3ed979dffd"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(APP).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("estante-app-") === 0 && k !== APP; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function pacote(req, url) {
  return caches.open(PACS).then(function (c) {
    return c.match(req).then(function (r) {
      if (r) return r;
      return c.match(req, {ignoreSearch: true}).then(function (velho) {
        if (!velho) return fetch(req);              // gênero não baixado: só passa
        return fetch(req).then(function (resp) {    // baixado, mas com versão velha: troca
          if (!resp || !resp.ok) return velho;
          const cp = resp.clone();
          return c.keys().then(function (ks) {
            return Promise.all(ks.filter(function (k) { return new URL(k.url).pathname === url.pathname; }).map(function (k) { return c.delete(k); }));
          }).then(function () { return c.put(req, cp); }).then(function () { return resp; });
        }).catch(function () { return velho; });
      });
    });
  });
}

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf("/pacotes/") >= 0) { e.respondWith(pacote(req, url)); return; }
  const nav = req.mode === "navigate";
  e.respondWith(caches.open(APP).then(function (c) {
    return c.match(nav ? "./index.html" : req).then(function (r) {
      const rede = fetch(req).then(function (resp) {
        if (resp && resp.ok && !nav) c.put(req, resp.clone());
        return resp;
      });
      if (r) { rede.catch(function () {}); return r; }
      return rede.catch(function () { return caches.match(req, {ignoreSearch: true}); });
    });
  }));
});
