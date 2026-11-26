// Estante do Switch: funciona sem internet.
// - o app fica guardado (abre na hora com o que está guardado; a versão nova chega na próxima vez)
// - os pacotes de gênero (o catálogo) ficam guardados na primeira vez que chegam; quando um muda, a versão nova
//   troca a velha sozinha (sem internet, vale a velha). Gênero tirado no app é apagado de lá pelo próprio app.
// - capas e fotos: quem guarda é o botão "⬇ Baixar" de cada gênero; o resto fica no cache normal do navegador
const VERSAO = "0a93a22320";
const APP = "estante-app-" + VERSAO;
const PACS = "estante-pacotes";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./app/01.js?v=49a2e09bc7", "./app/02.js?v=853e066705", "./app/03.js?v=de80d68f6a", "./app/04.js?v=f9a7a7e2ec", "./app/05.js?v=aedf219313", "./app/06.js?v=937b741612", "./app/07.js?v=75381df2d3", "./app/08.js?v=2cde205886", "./app/09.js?v=10d3521e10", "./app/10.js?v=b26c303a2c", "./app/11.js?v=e281f1f33d", "./app/12.js?v=d67da9bb4b", "./app/13.js?v=d7c63e99ea", "./app/14.js?v=a1d2fb87bb", "./app/15.js?v=390cc3c368", "./app/16.js?v=103e2ebfd9", "./app/17.js?v=6aa0fe7b76", "./app/18.js?v=39a2080f46", "./app/19.js?v=23b72cd9de", "./app/20.js?v=839600cb25", "./app/21.js?v=0d592f0dfb", "./app/22.js?v=4576d29f1a", "./app/23.js?v=52de543b57"];

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
      if (r) return r;                                // versão certa guardada: na hora, sem internet
      return fetch(req).then(function (resp) {        // não tem (ou é velha): busca e guarda no lugar da velha
        if (!resp || !resp.ok) return c.match(req, {ignoreSearch: true}).then(function (velho) { return velho || resp; });
        const cp = resp.clone();
        c.keys().then(function (ks) {
          return Promise.all(ks.filter(function (k) { return new URL(k.url).pathname === url.pathname; }).map(function (k) { return c.delete(k); }));
        }).then(function () { return c.put(req, cp); }).catch(function () {});
        return resp;
      }).catch(function () {
        return c.match(req, {ignoreSearch: true}).then(function (velho) { return velho || Response.error(); });
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
