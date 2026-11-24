/* mod_H_offline.js */
// 24/11 (3): baixar por gênero. Cada gênero ganha um botão "⬇ Baixar" no título: a página baixa as capas
// e as fotos já diminuídas (pelo wsrv.nl, um serviço gratuito de imagens) e guarda neste navegador. Daí em
// diante elas abrem na hora, até sem internet. "Apagar" tira de novo. Com internet, a capa grande da ficha
// e o visor ainda trocam pela versão nítida da eShop.
(function () {
  "use strict";
  var KG = KEY + "-H-gens", KF = KEY + "-H-fotoscat", BANCO = KEY + "-H-img";
  var CAPA = {w: 480, q: 72, kb: 30}, FOTO = {w: 960, q: 68, kb: 55}, AO_MESMO_TEMPO = 12;
  var mapa = new Map();      // chave da imagem → Blob guardado
  var genReg = new Map();    // chave da imagem → gênero em que ela foi baixada
  var urls = new Map(), chaveDe = new Map();
  var porGen = {}, bytes = 0, guardado = true, dbP = null, sumario = null;
  var lista = document.getElementById("lista-jogos");

  // ---------- endereço das imagens: do aparelho, se estiver guardada ----------
  function local(chave) {
    var u = urls.get(chave);
    if (u) return u;
    var b = mapa.get(chave);
    if (!b) return null;
    u = URL.createObjectURL(b);
    urls.set(chave, u); chaveDe.set(u, chave);
    return u;
  }
  var imgOrigH = imgGrande, fotoOrigH = fotoGrande, imgPeqH = imgURL, fotoPeqH = fotoURL;
  imgURL = function (x) { return (mapa.size && local(x)) || imgPeqH(x); };
  fotoURL = function (x) { return (mapa.size && local(x)) || fotoPeqH(x); };
  function leve(original, t) {
    return "https://wsrv.nl/?url=" + encodeURIComponent(original) + "&w=" + t.w + "&we&output=webp&q=" + t.q;
  }

  // ---------- banco do navegador (IndexedDB) ----------
  function abrir() {
    if (!dbP) {
      dbP = new Promise(function (ok, falha) {
        var rq = indexedDB.open(BANCO, 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore("imgs", {keyPath: "k"}).createIndex("g", "g"); };
        rq.onsuccess = function () {
          var d = rq.result;
          d.onversionchange = function () { d.close(); dbP = null; };
          ok(d);
        };
        rq.onerror = function () { falha(rq.error); };
        rq.onblocked = function () { falha(new Error("banco ocupado")); };
      });
      dbP.catch(function () { dbP = null; });
    }
    return dbP;
  }
  function tx(modo, f) {
    return abrir().then(function (d) {
      return new Promise(function (ok, falha) {
        var t = d.transaction("imgs", modo), res;
        var r = f(t.objectStore("imgs"));
        if (r) r.onsuccess = function () { res = r.result; };
        t.oncomplete = function () { ok(res); };
        t.onerror = function () { falha(t.error); };
        t.onabort = function () { falha(t.error || new Error("cancelado")); };
      });
    });
  }
  function gensGuardados() {
    try { var a = JSON.parse(localStorage.getItem(KG) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function marcaGens() {
    var s = {};
    genReg.forEach(function (g) { s[g] = 1; });
    var a = Object.keys(s);
    try { if (a.length) localStorage.setItem(KG, JSON.stringify(a)); else localStorage.removeItem(KG); } catch (e) {}
  }
  function contar() {
    porGen = {}; bytes = 0;
    genReg.forEach(function (g) { porGen[g] = (porGen[g] || 0) + 1; });
    mapa.forEach(function (b) { bytes += b.size || 0; });
  }

  // ---------- capas já desenhadas: troca o endereço sem redesenhar a lista ----------
  var ATRS = ["src", "data-g-src", "data-h-src"];
  function trocaNaTela() {
    if (!lista || !mapa.size) return;
    lista.querySelectorAll("img.capa").forEach(function (im) {
      ATRS.forEach(function (at) {
        var s = im.getAttribute(at);
        if (!s || s.indexOf("blob:") === 0) return;
        var k = s.indexOf(IMG) === 0 ? s.slice(IMG.length) : s;
        var u = (mapa.has(k) && local(k)) || (mapa.has(s) && local(s));
        if (u) im.setAttribute(at, u);
      });
    });
  }
  function desfazNaTela() {
    if (!lista) return;
    lista.querySelectorAll("img.capa").forEach(function (im) {
      ATRS.forEach(function (at) {
        var s = im.getAttribute(at);
        if (!s || s.indexOf("blob:") !== 0) return;
        var k = chaveDe.get(s);
        if (k && !mapa.has(k)) im.setAttribute(at, /\.jpg$|^https?:/.test(k) ? imgPeqH(k) : fotoPeqH(k));
      });
    });
  }

  // ---------- ao abrir a página: lê o que já está guardado ----------
  // as capas dos gêneros guardados esperam a leitura (no máximo 3 s), pra não baixarem da internet à toa
  var gensIni = gensGuardados();
  var KQ = KEY + "-H-fila", KS = KEY + "-H-fundo";
  var filaSalva = (function () {
    try { var a = JSON.parse(localStorage.getItem(KQ) || "[]"); return Array.isArray(a) ? a.filter(function (g) { return !!GENRES[g]; }) : []; } catch (e) { return []; }
  })();
  function pausar() {
    var capas = {};
    DATA.forEach(function (g) { if (g.img && gensIni.indexOf(g.gn) >= 0) capas[imgOrigH(g.img)] = 1; });
    lista.querySelectorAll("img.capa[src]").forEach(function (im) {
      var s = im.getAttribute("src");
      if (capas[s] && !im.complete) { im.setAttribute("data-h-src", s); im.removeAttribute("src"); }
    });
  }
  function retomar() {
    if (!lista) return;
    lista.querySelectorAll("img[data-h-src]").forEach(function (im) {
      if (!im.getAttribute("src")) im.setAttribute("src", im.getAttribute("data-h-src"));
      im.removeAttribute("data-h-src");
    });
  }
  var inicio = Promise.resolve();
  if ((gensIni.length || filaSalva.length) && lista) {
    try { pausar(); } catch (e) {}
    var tSolta = setTimeout(retomar, 3000);
    inicio = tx("readonly", function (st) { return st.getAll(); }).then(function (recs) {
      clearTimeout(tSolta);
      (recs || []).forEach(function (r) { if (r && r.k && r.b) { mapa.set(r.k, r.b); genReg.set(r.k, r.g); } });
      contar(); marcaGens(); invalidaJa();
      trocaNaTela(); retomar();
    }, function () { clearTimeout(tSolta); guardado = false; retomar(); });
  }

  // ---------- o que cada gênero tem pra baixar (os mesmos filtros da lista, menos o de gênero) ----------
  function fotosCat() { try { return localStorage.getItem(KF) === "1"; } catch (e) { return false; } }
  function visivel(g, q, plAt) {
    return (!state.status || g.s === state.status) &&
      (state.list === "tudo" || (state.list === "all" ? (g.l !== 5 || state.status === "cat" || !!q) : String(g.l) === state.list)) &&
      (!state.onlyHype || g.h > 0) &&
      (!state.onlyMarked || state.sel.has(g.id)) &&
      (!state.onlyFav || state.fav.has(g.id)) &&
      romOk(g) && minhaOk(g) && planoOk(g) && durOk(g) && idiomaOk(g) &&
      (!plAt || plAt.j.indexOf(g.id) >= 0) &&
      tamOk(g) &&
      (!state.onlyNew || ehNovo(g)) &&
      (!q || (window.B_ok ? B_ok(g, q) : norm(g.n).includes(q))) && (!window.B_chips || B_chips(g));
  }
  function calcula() {
    var q = norm(state.q.trim()), plAt = playlistAtiva(), fc = fotosCat(), s = {}, visto = new Set();
    GEN_ORDER.forEach(function (k) { s[k] = {jogos: 0, total: 0, falta: 0, kb: 0}; });
    DATA.forEach(function (g) {
      var r = s[g.gn];
      if (!r || !visivel(g, q, plAt)) return;
      r.jogos++;
      if (g.img && !visto.has(g.img)) { visto.add(g.img); r.total++; if (!mapa.has(g.img)) { r.falta++; r.kb += CAPA.kb; } }
      if (g.l === 5 && !fc) return;
      var sh = (FICHA[g.id] || {}).sh || [];
      for (var j = 0; j < sh.length; j++) {
        if (visto.has(sh[j])) continue;
        visto.add(sh[j]); r.total++;
        if (!mapa.has(sh[j])) { r.falta++; r.kb += FOTO.kb; }
      }
    });
    return s;
  }
  // filtro novo: os botões mostram as contas anteriores por um instante e as novas chegam logo depois,
  // fora do caminho do redesenho (trocar filtro continua tão rápido quanto antes)
  var sumarioVelho = null, tCalc = 0;
  function invalidaJa() { sumario = null; sumarioVelho = null; }
  function invalidaFiltro() {
    if (sumario) sumarioVelho = sumario;
    sumario = null;
    if (tCalc || !sumarioVelho) return;
    var f = function () { tCalc = 0; if (!sumario) { sumario = calcula(); sumarioVelho = null; pintar(); } };
    tCalc = window.requestIdleCallback ? requestIdleCallback(f, {timeout: 400}) : setTimeout(f, 60);
  }
  function resumo(gen) {
    var s = sumario || sumarioVelho;
    if (!s) s = sumario = calcula();
    return s[gen] || {jogos: 0, total: 0, falta: 0, kb: 0};
  }
  // na ordem em que aparecem na tela: primeiro todas as capas, depois as fotos
  function itensDe(gen) {
    var q = norm(state.q.trim()), plAt = playlistAtiva(), fc = fotosCat(), capas = [], fotos = [], visto = new Set();
    sorted(DATA.filter(function (g) { return g.gn === gen && visivel(g, q, plAt); })).forEach(function (g) {
      if (g.img && !visto.has(g.img)) { visto.add(g.img); capas.push({k: g.img, t: "c", u: imgOrigH(g.img)}); }
      if (g.l === 5 && !fc) return;
      ((FICHA[g.id] || {}).sh || []).forEach(function (h) {
        if (!visto.has(h)) { visto.add(h); fotos.push({k: h, t: "f", u: fotoOrigH(h)}); }
      });
    });
    return capas.concat(fotos);
  }

  // ---------- baixar ----------
  // 12 imagens ao mesmo tempo. Se a página fica escondida (outro app, tela desligada) e o Android corta a
  // internet dela, o que falhar volta pra fila sem contar como erro, e o download espera: quando você volta,
  // ele continua sozinho. A fila fica salva: se o Chrome recarregar a página, ela retoma de onde parou.
  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  var voltouEm = 0;
  function escondida() { return document.hidden || Date.now() - voltouEm < 8000; }
  var lote = [], tLote = 0;
  function gravarLote() {
    clearTimeout(tLote); tLote = 0;
    var l = lote; lote = [];
    if (!l.length || !guardado) return Promise.resolve();
    return tx("readwrite", function (st) { l.forEach(function (r) { st.put(r); }); return null; })
      .catch(function () { guardado = false; });
  }
  function guarda(rec) {
    mapa.set(rec.k, rec.b); genReg.set(rec.k, rec.g);
    porGen[rec.g] = (porGen[rec.g] || 0) + 1; bytes += rec.b.size;
    lote.push(rec);
    if (lote.length >= 25) gravarLote(); else if (!tLote) tLote = setTimeout(gravarLote, 1500);
  }
  function baixarUma(it, job, tentativa) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    return fetch(leve(it.u, it.t === "c" ? CAPA : FOTO), {mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", signal: ctl ? ctl.signal : undefined})
      .then(function (r) {
        if (!r.ok) throw {devagar: r.status === 429 || r.status === 503};
        return r.blob();
      })
      .then(function (b) {
        clearTimeout(tm);
        if (!b || !b.size || !/^image\//.test(b.type)) throw {};
        if (!job.apagado) guarda({k: it.k, g: job.gen, t: it.t, b: b});
      })
      .catch(function (e) {
        clearTimeout(tm);
        if (job.parar) throw e;
        if (escondida()) throw {escondida: true};
        if (tentativa >= 2) throw e;
        return espera((e && e.devagar ? 6000 : 1200) * (tentativa + 1)).then(function () { return baixarUma(it, job, tentativa + 1); });
      });
  }
  // deixa a tela acesa enquanto baixa
  var trava = null, pedindo = false;
  function acordado(sim) {
    try {
      if (sim) {
        if (trava || pedindo || !navigator.wakeLock || document.visibilityState !== "visible") return;
        pedindo = true;
        navigator.wakeLock.request("screen").then(function (t) {
          pedindo = false;
          if (!ativo) { t.release(); return; }
          trava = t;
          t.addEventListener("release", function () { if (trava === t) trava = null; });
        }, function () { pedindo = false; });
      } else if (trava) { var t = trava; trava = null; t.release(); }
    } catch (e) { pedindo = false; }
  }

  // ---------- opcional: continuar com a tela desligada ----------
  // toca em laço um tom de 10 Hz, baixinho: ninguém ouve, mas o Android trata a página como "tocando"
  // e não a pausa. A notificação de mídia mostra o andamento. Pode pausar a música de outro app.
  var som = null, somTocou = false, tNotif = 0, somAcoes = false;
  function fundoLigado() { try { return localStorage.getItem(KS) === "1"; } catch (e) { return false; } }
  function criaSom() {
    var taxa = 8000, n = taxa * 10, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, t) { for (var k = 0; k < t.length; k++) v.setUint8(o + k, t.charCodeAt(k)); }
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, taxa, true);
    v.setUint32(28, taxa * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
    for (var k = 0; k < n; k++) v.setInt16(44 + k * 2, Math.round(300 * Math.sin(2 * Math.PI * 10 * k / taxa)), true);
    som = new Audio(URL.createObjectURL(new Blob([buf], {type: "audio/wav"})));
    som.loop = true;
  }
  function somFundo(ligar) {
    try {
      if (ligar && ativo && fundoLigado()) {
        if (!som) criaSom();
        if (som.paused) som.play().then(function () { somTocou = true; notifica(true); }, function () {});
        if (!somAcoes && "mediaSession" in navigator) {
          somAcoes = true;
          ["pause", "stop"].forEach(function (a) {
            try { navigator.mediaSession.setActionHandler(a, function () { pararTudo(); }); } catch (e) {}
          });
        }
      } else if (som && !som.paused) {
        som.pause();
        try { navigator.mediaSession.playbackState = "none"; } catch (e) {}
      }
    } catch (e) {}
  }
  function notifica(forcar) {
    if (!som || som.paused || !ativo || !("mediaSession" in navigator) || typeof MediaMetadata !== "function") return;
    var agora = Date.now();
    if (!forcar && agora - tNotif < 2000) return;
    tNotif = agora;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Baixando " + GENRES[ativo.gen].label + " · " + pct(ativo) + "%",
        artist: "Estante do Switch" + (fila.length ? " · mais " + fila.length + (fila.length === 1 ? " gênero" : " gêneros") + " na fila" : ""),
        album: "Imagens no aparelho"
      });
      navigator.mediaSession.playbackState = "playing";
    } catch (e) {}
  }
  // depois de a página recarregar e retomar sozinha, o som só pode começar com um toque
  document.addEventListener("pointerdown", function () { if (ativo && !somTocou && fundoLigado()) somFundo(true); }, true);

  // ---------- fila ----------
  var fila = [], ativo = null, aviso = {};   // aviso: gênero → o que deu errado no último download
  function pct(job) { return job.total ? Math.floor(100 * job.feitos / job.total) : 100; }
  function salvaFila() {
    var a = (ativo && !ativo.parar ? [ativo.gen] : []).concat(fila);
    try { if (a.length) localStorage.setItem(KQ, JSON.stringify(a)); else localStorage.removeItem(KQ); } catch (e) {}
  }
  function marcaGen(gen) {
    var a = gensGuardados();
    if (a.indexOf(gen) < 0) { a.push(gen); try { localStorage.setItem(KG, JSON.stringify(a)); } catch (e) {} }
  }
  function proximoGenero() {
    var gen = fila.shift();
    if (!gen) { ativo = null; acordado(false); somFundo(false); salvaFila(); pintar(); return; }
    var itens = itensDe(gen).filter(function (x) { return !mapa.has(x.k); });
    var job = ativo = {gen: gen, total: itens.length, feitos: 0, falhas: 0, parar: false, espera: false};
    marcaGen(gen); salvaFila();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
    acordado(true); somFundo(true);
    pintar();
    var i = 0, rodando = 0, uiT = 0;
    function avisa() { if (!uiT) uiT = setTimeout(function () { uiT = 0; if (ativo === job) { pintarGen(gen); notifica(); } }, 400); }
    function um(it) {
      rodando++;
      baixarUma(it, job, 0).then(function () { job.feitos++; job.seguidas = 0; }, function (e) {
        if (e && e.escondida && !job.parar) {
          itens.push(it);                          // volta pra fila; não conta como erro
          if (document.hidden) { job.espera = true; return; }
          return espera(1500);                     // acabou de voltar: respira antes de tentar de novo
        }
        job.feitos++; job.falhas++; job.seguidas = (job.seguidas || 0) + 1;
        if (job.seguidas >= 16 && !job.parar) { job.parar = true; job.semRede = true; }   // 16 seguidas: sem conexão
      }).then(function () { rodando--; avisa(); trabalha(); });
    }
    function trabalha() {
      while (rodando < AO_MESMO_TEMPO && i < itens.length && !job.parar && !job.espera) um(itens[i++]);
      if (rodando === 0 && !job.fim && (job.parar || (i >= itens.length && !job.espera))) {
        job.fim = true;
        clearTimeout(uiT);
        if (!job.apagado && (job.semRede || (!job.parar && job.falhas))) aviso[gen] = {semRede: !!job.semRede, falhas: job.falhas};
        gravarLote().then(function () {
          if (ativo === job) ativo = null;
          marcaGens(); invalidaJa();
          trocaNaTela();
          proximoGenero();
        });
      }
    }
    job.continua = function () { if (job.espera && !job.fim) { job.espera = false; trabalha(); } };
    trabalha();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { gravarLote(); salvaFila(); return; }
    voltouEm = Date.now();
    if (!ativo) return;
    acordado(true);
    ativo.continua();
    pintar();
  });
  window.addEventListener("pagehide", function () { gravarLote(); salvaFila(); });
  function baixar(gen) {
    if (ativo && ativo.gen === gen) { ativo.parar = true; salvaFila(); pintar(); return; }
    delete aviso[gen];
    var f = fila.indexOf(gen);
    if (f >= 0) { fila.splice(f, 1); salvaFila(); pintar(); return; }
    if (navigator.onLine === false) { aviso[gen] = {semRede: true, falhas: 0}; pintar(); return; }
    fila.push(gen); salvaFila();
    if (!ativo) proximoGenero(); else { somFundo(true); pintar(); }
  }
  // todos os gêneros que ainda têm o que baixar, na ordem da lista
  function baixarTodos() {
    if (navigator.onLine === false) { GEN_ORDER.forEach(function (g) { if (resumo(g).falta) aviso[g] = {semRede: true, falhas: 0}; }); pintar(); return; }
    GEN_ORDER.forEach(function (gen) {
      if ((ativo && ativo.gen === gen && !ativo.parar) || fila.indexOf(gen) >= 0 || !resumo(gen).falta) return;
      delete aviso[gen];
      fila.push(gen);
    });
    salvaFila();
    if (!ativo) proximoGenero(); else { somFundo(true); pintar(); }
  }
  function pararTudo() {
    fila.length = 0;
    if (ativo) ativo.parar = true;
    salvaFila(); somFundo(false); pintar();
  }
  function apagar(gen) {
    if (ativo && (!gen || ativo.gen === gen)) { ativo.parar = true; ativo.apagado = true; }
    if (!gen) { fila.length = 0; aviso = {}; } else { if (fila.indexOf(gen) >= 0) fila.splice(fila.indexOf(gen), 1); delete aviso[gen]; }
    salvaFila();
    lote = gen ? lote.filter(function (r) { return r.g !== gen; }) : [];
    var chaves = [], velhas = [];
    genReg.forEach(function (g, k) { if (!gen || g === gen) chaves.push(k); });
    chaves.forEach(function (k) {
      mapa.delete(k); genReg.delete(k);
      var u = urls.get(k);
      if (u) { velhas.push(u); urls.delete(k); }
    });
    contar(); marcaGens(); invalidaJa();
    desfazNaTela();
    setTimeout(function () { velhas.forEach(function (u) { chaveDe.delete(u); try { URL.revokeObjectURL(u); } catch (e) {} }); }, 60000);
    pintar();
    return (gen
      ? tx("readwrite", function (st) {
          var c = st.index("g").openKeyCursor(IDBKeyRange.only(gen));
          c.onsuccess = function () { var cur = c.result; if (cur) { st.delete(cur.primaryKey); cur.continue(); } };
          return null;
        })
      : tx("readwrite", function (st) { return st.clear(); })
    ).catch(function () {});
  }

  // ---------- botões: no título de cada gênero e no painel ----------
  var confirma = null, tConf = 0;
  function mb(kb) { return Math.max(1, Math.round(kb / 1024)); }
  function rotulo(gen) {
    if (ativo && ativo.gen === gen) {
      if (ativo.parar) return {t: "⏳ Parando…", cls: "h-baixando"};
      return {t: (ativo.espera ? "⏸ " : "⏳ ") + pct(ativo) + "% · parar", cls: "h-baixando"};
    }
    if (fila.indexOf(gen) >= 0) return {t: "⏳ Na fila · tirar", cls: "h-fila"};
    var r = resumo(gen);
    if (!r.total) return porGen[gen] ? {t: "✓ No aparelho", cls: "h-ok"} : null;
    if (!r.falta) return {t: "✓ No aparelho", cls: "h-ok"};
    var av = aviso[gen];
    if (av && av.semRede) return {t: "⚠ Sem internet · tentar de novo", cls: "h-erro"};
    if (av && av.falhas) return {t: "⚠ " + av.falhas + (av.falhas === 1 ? " não veio" : " não vieram") + " · tentar de novo", cls: "h-erro"};
    return {t: (porGen[gen] ? "⬇ Baixar o resto · " : "⬇ Baixar · ") + mb(r.kb) + " MB", cls: ""};
  }
  // muda só o texto dos botões (sem trocar o elemento), pra não perder um toque no meio
  function poe(h, gen) {
    var r = rotulo(gen), box = h.querySelector(".h-gen");
    if (!r) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement("span");
      box.className = "h-gen";
      box.innerHTML = '<button type="button" class="h-baixar" data-hbaixar="' + gen + '"></button>';
      var c = h.querySelector(".count, .h-rot");
      if (c) c.insertAdjacentElement("afterend", box); else h.appendChild(box);
    }
    var b = box.querySelector(".h-baixar"), cls = "h-baixar" + (r.cls ? " " + r.cls : "");
    if (b.textContent !== r.t) b.textContent = r.t;
    if (b.className !== cls) b.className = cls;
    var del = box.querySelector(".h-del"), quer = !!porGen[gen] && !(ativo && ativo.gen === gen);
    if (quer && !del) {
      del = document.createElement("button");
      del.type = "button"; del.className = "h-del"; del.setAttribute("data-hapagar", gen);
      box.appendChild(del);
    } else if (!quer && del) { del.remove(); del = null; }
    if (del) {
      var td = confirma === gen ? "Toque de novo pra apagar" : "Apagar";
      if (del.textContent !== td) {
        del.textContent = td;
        del.setAttribute("aria-label", (confirma === gen ? "Toque de novo pra apagar do aparelho as imagens de " : "Apagar do aparelho as imagens de ") + GENRES[gen].label);
      }
      del.classList.toggle("h-certeza", confirma === gen);
    }
  }
  var fundo = document.createElement("div");
  fundo.className = "c-fundo h-fundo";
  document.body.appendChild(fundo);
  function painelAberto() { return fundo.classList.contains("aberto"); }
  function alvos(gen) {
    var r = [], a;
    if ((a = document.querySelector("#sec-gen-" + gen + " > .group-head"))) r.push(a);
    if ((a = document.querySelector("#vit-gen-" + gen + " > .vit-head"))) r.push(a);
    if (gen === "investigacao" && (a = document.querySelector("#vit-noir > .vit-head"))) r.push(a);
    if (painelAberto() && (a = fundo.querySelector('[data-hlinha="' + gen + '"]'))) r.push(a);
    return r;
  }
  function pintaStatus() {
    var st = fundo.querySelector("#h-status");
    if (!st) return;
    var h = mapa.size
      ? "<strong>Guardado:</strong> " + mapa.size.toLocaleString("pt-BR") + " imagens, " + Math.max(1, Math.round(bytes / 1048576)).toLocaleString("pt-BR") + " MB. Elas abrem daqui, até sem internet." +
        (guardado ? "" : ' <span class="h-aviso">Este navegador não deixou guardar de vez: as imagens valem até fechar a página.</span>')
      : "Nada guardado ainda. Toque em <strong>Baixar</strong> no gênero que quiser, aqui ou no título dele na lista.";
    if (st.innerHTML !== h) st.innerHTML = h;
    var tudo = fundo.querySelector(".h-apagar-tudo");
    if (tudo) {
      tudo.hidden = !mapa.size;
      var t = confirma === "" ? "Toque de novo pra apagar tudo" : "Apagar todas as imagens do aparelho";
      if (tudo.textContent !== t) tudo.textContent = t;
    }
  }
  // atalho fixo à esquerda da barra dos gêneros (ela fica presa no alto enquanto você rola)
  var nav = document.getElementById("pular"), chip = null;
  if (nav) {
    chip = document.createElement("button");
    chip.type = "button"; chip.id = "h-chip"; chip.className = "pular-chip h-chip";
    nav.insertBefore(chip, nav.firstChild);
  }
  function curto(gen) { var l = GENRES[gen].label; return l.length > 12 ? l.split(" ")[0] : l; }
  function pintaChip() {
    if (!chip) return;
    var t, on = !!ativo;
    if (ativo) t = (ativo.espera ? "⏸ " : "⏳ ") + curto(ativo.gen) + " " + pct(ativo) + "%" + (fila.length ? " · +" + fila.length : "");
    else t = "⬇ Baixar";
    if (chip.textContent !== t) chip.textContent = t;
    chip.classList.toggle("h-chip-on", on);
    chip.setAttribute("aria-label", on ? "Download das imagens: " + t + ". Abrir o painel" : "Baixar imagens pro aparelho");
  }
  function pintaFila() {
    var el = fundo.querySelector("#h-fila");
    if (!el) return;
    var h = "";
    if (ativo) h = "<strong>Baixando " + GENRES[ativo.gen].label + ":</strong> " + pct(ativo) + "%" + (ativo.espera ? " (continua quando você voltar pra página)" : "") + ".";
    if (fila.length) h += (h ? " " : "") + "Na fila: " + fila.map(function (g) { return GENRES[g].label; }).join(", ") + ".";
    if (el.innerHTML !== h) el.innerHTML = h;
    el.hidden = !h;
    var falta = 0;
    GEN_ORDER.forEach(function (g) { if (!(ativo && ativo.gen === g) && fila.indexOf(g) < 0) falta += resumo(g).kb; });
    var todos = fundo.querySelector(".h-todos"), parar = fundo.querySelector(".h-parar");
    if (todos) {
      var t = (ativo || fila.length ? "⬇ Baixar também os outros · " : "⬇ Baixar todos os gêneros · ") + mb(falta) + " MB";
      if (todos.textContent !== t) todos.textContent = t;
      todos.hidden = !falta;
    }
    if (parar) parar.hidden = !(ativo || fila.length);
  }
  function pintarGen(gen) {
    alvos(gen).forEach(function (h) { try { poe(h, gen); } catch (e) {} });
    pintaChip();
    if (painelAberto()) { pintaStatus(); pintaFila(); }
  }
  function pintar() {
    GEN_ORDER.forEach(function (gen) { alvos(gen).forEach(function (h) { try { poe(h, gen); } catch (e) {} }); });
    pintaChip();
    if (!painelAberto()) return;
    pintaFila();
    GEN_ORDER.forEach(function (gen) {
      var linha = fundo.querySelector('[data-hlinha="' + gen + '"]');
      if (!linha) return;
      var r = resumo(gen);
      linha.hidden = !r.total && !porGen[gen];
      var rot = linha.querySelector(".h-rot");
      var h = "<strong>" + GENRES[gen].label + "</strong><small>" + r.jogos.toLocaleString("pt-BR") + (r.jogos === 1 ? " jogo · " : " jogos · ") +
        r.total.toLocaleString("pt-BR") + " imagens" + (porGen[gen] ? " · " + porGen[gen].toLocaleString("pt-BR") + " guardadas" : "") + "</small>";
      if (rot.innerHTML !== h) rot.innerHTML = h;
    });
    pintaStatus();
  }
  function abrePainel() {
    fundo.innerHTML = '<div class="c-folha" role="dialog" aria-label="Imagens no aparelho"><h2>Imagens no aparelho</h2>' +
      '<p class="h-status" id="h-status"></p>' +
      '<div class="h-acoes"><button type="button" class="c-btn h-todos" data-htodos></button><button type="button" class="c-btn h-parar" data-hparar>Parar tudo</button></div>' +
      '<p class="h-fila" id="h-fila" hidden></p>' +
      '<div class="h-gens">' + GEN_ORDER.map(function (gen) { return '<div class="h-linha" data-hlinha="' + gen + '"><span class="h-rot"></span></div>'; }).join("") + "</div>" +
      '<label class="c-chk"><input type="checkbox" id="h-fotoscat"' + (fotosCat() ? " checked" : "") + "> Baixar também as fotos dos jogos que não estão nas suas listas (bem maior)</label>" +
      "<p>O botão baixa o que o gênero mostra agora, com os seus filtros: as capas e as fotos dos jogos das suas listas. As imagens chegam já diminuídas pelo <strong>wsrv.nl</strong>, um serviço gratuito de imagens, e ficam só neste navegador. Pode fechar este painel: o download continua.</p>" +
      "<p>Com a tela desligada ou em outro app, o Android pausa a página. Quando você volta, o download continua sozinho, de onde parou.</p>" +
      '<label class="c-chk"><input type="checkbox" id="h-fundo-op"' + (fundoLigado() ? " checked" : "") + "> Continuar baixando com a tela desligada (teste)</label>" +
      '<p class="h-nota">Toca um som que ninguém ouve, pra o Android não pausar a página. O andamento aparece nas notificações. Pode pausar a música de outro app enquanto baixa.</p>' +
      '<button type="button" class="c-btn h-apagar-tudo" data-hapagar=""></button>' +
      '<button type="button" class="c-btn" data-hfecha>Fechar</button></div>';
    fundo.classList.add("aberto");
    pintar();
  }
  function fechaPainel() { fundo.classList.remove("aberto"); }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-hbaixar], [data-hapagar], [data-hfecha], [data-htodos], [data-hparar], #h-botao, #h-chip") : null;
    if (!t) { if (e.target === fundo) fechaPainel(); return; }
    e.preventDefault(); e.stopPropagation();
    if (t.id === "h-botao" || t.id === "h-chip") { abrePainel(); return; }
    if (t.hasAttribute("data-htodos")) { baixarTodos(); return; }
    if (t.hasAttribute("data-hparar")) { pararTudo(); return; }
    if (t.hasAttribute("data-hfecha")) { fechaPainel(); return; }
    if (t.hasAttribute("data-hbaixar")) { baixar(t.getAttribute("data-hbaixar")); return; }
    var gen = t.getAttribute("data-hapagar") || "";
    clearTimeout(tConf);
    if (confirma !== gen) {   // apagar pede um segundo toque
      confirma = gen;
      tConf = setTimeout(function () { confirma = null; pintar(); }, 6000);
      pintar();
      return;
    }
    confirma = null;
    apagar(gen || null);
  }, true);
  fundo.addEventListener("change", function (e) {
    if (e.target.id === "h-fundo-op") {
      try { localStorage.setItem(KS, e.target.checked ? "1" : "0"); } catch (x) {}
      somFundo(e.target.checked);
      return;
    }
    if (e.target.id !== "h-fotoscat") return;
    try { localStorage.setItem(KF, e.target.checked ? "1" : "0"); } catch (x) {}
    invalidaJa(); pintar();
  });
  var topo = document.querySelector(".c-topo") || document.querySelector("header");
  if (topo) {
    var bt = document.createElement("button");
    bt.type = "button"; bt.className = "c-btn"; bt.id = "h-botao"; bt.textContent = "📦 Imagens no aparelho";
    topo.appendChild(bt);
  }
  // as contas por gênero só são refeitas quando os filtros ou as marcações mudam:
  // a rolagem sem fim redesenha a lista o tempo todo, e aí só os botões são conferidos
  var versao = 0, ultAssH = null;
  var saveAntH = save;
  save = function () { versao++; return saveAntH.apply(this, arguments); };
  function assinaturaH() {
    return [state.status, state.list, state.onlyHype, state.onlyMarked, state.onlyFav, state.rom, state.minha, state.plano, state.dur,
      state.idioma, state.plAtiva, state.size, state.onlyNew, state.q, window.B_chipsN ? B_chipsN() : 0, versao, fotosCat()].join("|");
  }
  var renderAntH = renderList;
  renderList = function () {
    var r = renderAntH.apply(this, arguments);
    var a = assinaturaH();
    if (a !== ultAssH) { ultAssH = a; invalidaFiltro(); }
    try { pintar(); } catch (e) {}
    return r;
  };

  // ---------- capa grande e visor: com internet, troca pela versão nítida ----------
  function nitida(im) {
    var u = im.getAttribute("src"), k = u && chaveDe.get(u);
    if (!k) return;
    var c = navigator.connection;
    if ((c && c.saveData) || navigator.onLine === false) return;
    var cdn = /\.jpg$|^https?:/.test(k) ? imgOrigH(k) : fotoOrigH(k);   // capa termina em .jpg; foto é só o código
    var pre = new Image();
    pre.referrerPolicy = "no-referrer";
    pre.onload = function () { if (im.isConnected && im.getAttribute("src") === u) im.setAttribute("src", cdn); };
    pre.src = cdn;
  }
  var abrirAntH = abrirFicha;
  abrirFicha = function () {
    var r = abrirAntH.apply(this, arguments);
    try { var h = ficha.querySelector(".f-heroi-capa img"); if (h) nitida(h); } catch (e) {}
    return r;
  };
  var visor = document.getElementById("visor");
  if (visor && "MutationObserver" in window && "IntersectionObserver" in window) {
    var ioV = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !e.target.dataset.hNitida) { e.target.dataset.hNitida = "1"; nitida(e.target); } });
    }, {threshold: 0.5});
    new MutationObserver(function () {
      ioV.disconnect();
      if (visor.open) visor.querySelectorAll(".vz-slide img").forEach(function (im) { ioV.observe(im); });
    }).observe(visor, {childList: true});
  }
  inicio.then(function () {
    if (filaSalva.length && !ativo && !fila.length) { fila = filaSalva.slice(); proximoGenero(); }
    else pintar();
  });
  pintar();
})();

