// Estante do Switch: funciona sem internet.
// - a página (index.html): com internet vem sempre a versão do site (espera até 3,5 s); sem internet ou demorando, a guardada.
//   (antes vinha sempre a guardada: depois de cada atualização o celular abria uma versão velha e só trocava ao recarregar)
// - o app (app/*.js?v=...): guardado; cada versão tem o seu endereço, então nunca mistura velho com novo
// - os pacotes de gênero (o catálogo) ficam guardados na primeira vez que chegam; quando um muda, a versão nova
//   troca a velha sozinha (sem internet, vale a velha)
// - capas e fotos (wsrv.nl): toda imagem vista fica guardada (as últimas ~4.000) e abre daqui na próxima vez, até sem internet.
//   As que você manda "Guardar no aparelho" ficam num lugar à parte, que não é limpo sozinho.
const VERSAO = "e6a8df9d24";
const APP = "estante-app-" + VERSAO;
const PACS = "estante-pacotes";
const VISTAS = "estante-imgs-vistas";      // capas e fotos vistas (limpeza automática: as mais antigas saem)
const GUARD = "estante-imgs-guardadas";    // as do botão "Guardar no aparelho" (só saem quando você apaga)
const MAX_VISTAS = 4000;
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./app/01.js?v=2ed4e5b5cc", "./app/02.js?v=853e066705", "./app/03.js?v=de80d68f6a", "./app/04.js?v=f9a7a7e2ec", "./app/05.js?v=4938ad09b1", "./app/06.js?v=937b741612", "./app/07.js?v=75381df2d3", "./app/08.js?v=2cde205886", "./app/09.js?v=10d3521e10", "./app/10.js?v=b26c303a2c", "./app/11.js?v=81235580e8", "./app/12.js?v=e35e1cd4a6", "./app/13.js?v=d7c63e99ea", "./app/14.js?v=a1d2fb87bb", "./app/15.js?v=72701c4802", "./app/16.js?v=103e2ebfd9", "./app/17.js?v=6aa0fe7b76", "./app/18.js?v=39a2080f46", "./app/19.js?v=23b72cd9de", "./app/20.js?v=c80e48288d", "./app/21.js?v=0d592f0dfb", "./app/22.js?v=761020df5d", "./app/23.js?v=ec85425971", "./app/24.js?v=6890a9427f", "./app/25.js?v=51ccf84e27", "./app/26.js?v=f3afba0ddf", "./app/27.js?v=7bf9716ce5"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(APP).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("estante-app-") === 0 && k !== APP; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// a página pergunta quais arquivos esta versão tem (pra saber se precisa recarregar depois de uma atualização)
self.addEventListener("message", function (e) {
  if (e.data && e.data.q === "arquivos" && e.ports && e.ports[0]) e.ports[0].postMessage({versao: VERSAO, arquivos: ARQUIVOS});
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

// ---------- imagens (wsrv.nl): guardada primeiro; senão, da internet, e guarda ----------
// O <img> pede sem CORS (a resposta seria "opaca": o Chrome conta ~7 MB de espaço por imagem opaca guardada).
// Aqui o pedido vai com CORS (o wsrv.nl permite), então fica guardado com o tamanho de verdade (~20 KB a capa).
let novasVistas = 0, aparando = false;
function aparar() {
  if (aparando || ++novasVistas < 150) return;
  aparando = true; novasVistas = 0;
  caches.open(VISTAS).then(function (c) {
    return c.keys().then(function (ks) {
      const sobra = ks.length - MAX_VISTAS;
      return sobra > 0 ? Promise.all(ks.slice(0, sobra).map(function (k) { return c.delete(k); })) : null;   // as mais antigas
    });
  }).catch(function () {}).then(function () { aparando = false; });
}
function imagem(req) {
  const u = req.url, op = {ignoreVary: true};
  return caches.open(GUARD).then(function (g) { return g.match(u, op); }).then(function (r) {
    if (r) return r;
    return caches.open(VISTAS).then(function (v) {
      return v.match(u, op).then(function (r2) {
        if (r2) return r2;
        return fetch(u, {mode: "cors", credentials: "omit", referrerPolicy: "no-referrer"}).then(function (resp) {
          if (resp && resp.ok && resp.type === "cors" && /^image\//.test(resp.headers.get("content-type") || "")) {
            v.put(u, resp.clone()).then(aparar, function () {});
          }
          return resp;
        }, function () {
          // sem internet: a mesma imagem em outro tamanho, se estiver guardada (miniatura de 240 -> foto de 720; capa nítida -> 360)
          const outros = [720, 360, 480, 240].map(function (w) { return u.replace(/&w=\d+&/, "&w=" + w + "&"); }).filter(function (x) { return x !== u; });
          return outros.reduce(function (pr, x) { return pr.then(function (r) { return r || caches.match(x, op); }); }, Promise.resolve(null))
            .then(function (r) { return r || fetch(req); });   // nada: o pedido original (dá erro e o app mostra o ícone)
        });
      });
    });
  }).catch(function () { return fetch(req); });
}

function pagina(req) {
  return caches.open(APP).then(function (c) {
    const guardada = function () { return c.match("./index.html").then(function (r) { return r || caches.match("./index.html", {ignoreSearch: true}); }); };
    const rede = fetch(req).then(function (resp) {
      if (resp && resp.ok) c.put("./index.html", resp.clone()).catch(function () {});
      return resp;
    });
    return new Promise(function (ok) {
      let feito = false;
      const vai = function (r) { if (!feito && r) { feito = true; ok(r); } };
      // demorando: a guardada (a da internet ainda chega e fica pra próxima)
      const t = setTimeout(function () { guardada().then(function (r) { if (r) vai(r); }); }, 3500);
      rede.then(function (r) {
        clearTimeout(t);
        if (r && r.ok) vai(r);
        else guardada().then(function (g) { vai(g || r); });
      }, function () {
        clearTimeout(t);
        guardada().then(function (g) { vai(g || Response.error()); });
      });
    });
  });
}

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "wsrv.nl") { e.respondWith(imagem(req)); return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf("/pacotes/") >= 0) { e.respondWith(pacote(req, url)); return; }
  if (req.mode === "navigate") { e.respondWith(pagina(req)); return; }
  e.respondWith(caches.open(APP).then(function (c) {
    return c.match(req).then(function (r) {
      if (r) return r;   // o app tem a versão no endereço (?v=): o guardado é sempre o certo
      return fetch(req).then(function (resp) {
        if (resp && resp.ok) c.put(req, resp.clone()).catch(function () {});
        return resp;
      }).catch(function () { return caches.match(req, {ignoreSearch: true}); });
    });
  }));
});
