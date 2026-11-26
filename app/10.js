/* mod_G_rapido.js */
// 24/11 (2): a ficha abre na hora e a lista não perde o lugar.
// 1. Fotos da ficha: a primeira chega antes; as miniaturas esperam por ela.
// 2. Capas a mais de duas telas de distância saem da memória e voltam quando você chega perto.
//    Com isso a página fica leve e o Android não fecha a aba quando você sai pro YouTube.
// 3. Quando a lista é redesenhada (marcar "Quero jogar", playlist, tradução, fechar o Descobrir...),
//    ela volta pro mesmo jogo, e cada fileira da Vitrine volta pro mesmo ponto.
// 4. Passou jogos pelas setas da ficha? Ao fechar, a lista vai até o último que você viu.
// 5. Se o Chrome recarregar a página com uma ficha aberta, um aviso oferece abrir de novo.
(function () {
  "use strict";
  var lista = document.getElementById("lista-jogos");
  if (!lista || !ficha) return;
  var porId = {};
  DATA.forEach(function (g) { porId[g.id] = g; }); (window.CAT_AO_CRESCER || []).push(function (novos) { novos.forEach(function (g) { porId[g.id] = g; }); });

  // faixa da tela que a lista realmente ocupa (sem o menu preso no alto e sem a barra de baixo)
  function topoLivre() {
    var y = 0, bf = document.getElementById("a-busca-fixa"), nav = document.getElementById("pular");
    if (bf && bf.classList.contains("on")) y = bf.getBoundingClientRect().bottom;
    if (nav && !nav.hidden) { var r = nav.getBoundingClientRect(); if (r.top <= y + 2) y = Math.max(y, r.bottom); }
    return y;
  }
  function baseLivre() {
    var b = document.getElementById("barra");
    return b ? Math.min(innerHeight, b.getBoundingClientRect().top) : innerHeight;
  }

  // ---------- 3: a lista volta pro mesmo lugar quando é redesenhada ----------
  function assinatura() {
    return [state.view, state.agrupar, state.status, state.q, state.list, state.genre, state.rom, state.minha, state.plano, state.dur, state.idioma,
      state.size, state.onlyHype, state.onlyFav, state.onlyMarked, state.onlyNew, state.plAtiva, state.sort, window.B_chipsN ? B_chipsN() : 0].join("|");
  }
  function capturar() {
    var r = {itens: [], fileiras: {}}, cima = topoLivre(), baixo = innerHeight;
    var els = lista.querySelectorAll("[data-card], .vit-row");
    for (var i = 0; i < els.length && r.itens.length < 6; i++) {
      var b = els[i].getBoundingClientRect();
      if (!b.height || b.bottom <= cima) continue;
      if (b.top >= baixo) break;
      var el = els[i];
      r.itens.push({sel: el.classList.contains("vit-row") ? "#" + el.id : '[data-card="' + el.getAttribute("data-card") + '"]', top: b.top});
    }
    lista.querySelectorAll(".vit-row").forEach(function (row) {
      var t = row.querySelector(".vit-trilho");
      if (row.id && t && t.scrollLeft > 0) r.fileiras[row.id] = t.scrollLeft;
    });
    return r;
  }
  // segura o jogo de referência no lugar por ~1 s: as capas de cima, ao serem desenhadas, mudam de altura
  var pino = null;
  function fixar(sel, top) {
    if (pino) pino();
    var fim = performance.now() + 1200, vivo = true;
    function solta(e) {
      if (e && e.target && e.target.closest && e.target.closest("dialog, .desc-tela, .c-fundo")) return;
      vivo = false; pino = null;
      ["touchstart", "wheel", "keydown", "pointerdown"].forEach(function (t) { removeEventListener(t, solta, true); });
    }
    ["touchstart", "wheel", "keydown", "pointerdown"].forEach(function (t) { addEventListener(t, solta, {capture: true, passive: true}); });
    pino = solta;
    (function passo() {
      if (!vivo) return;
      var el = lista.querySelector(sel);
      if (!el || performance.now() > fim) { solta(); return; }
      var d = el.getBoundingClientRect().top - top;
      if (Math.abs(d) >= 1) window.scrollBy(0, d);
      requestAnimationFrame(passo);
    })();
  }
  function devolver(a) {
    Object.keys(a.fileiras).forEach(function (id) {
      var row = document.getElementById(id), t = row && row.querySelector(".vit-trilho");
      if (t) t.scrollLeft = a.fileiras[id];
    });
    for (var i = 0; i < a.itens.length; i++) {
      var el = lista.querySelector(a.itens[i].sel);
      if (!el) continue;
      var d = el.getBoundingClientRect().top - a.itens[i].top;
      if (Math.abs(d) >= 1) window.scrollBy(0, d);
      fixar(a.itens[i].sel, a.itens[i].top);
      return;
    }
  }
  var ultAss = assinatura();
  var renderAntG = renderList;
  renderList = function () {
    var ass = assinatura(), a = null;
    // mesmos filtros e mesma visão = a lista só foi atualizada: guarda o lugar. Filtro novo: deixa como sempre foi.
    try { if (ass === ultAss) a = capturar(); } catch (e) { a = null; }
    renderAntG.apply(this, arguments);
    ultAss = ass;
    if (a) { try { devolver(a); } catch (e) { /* segue sem devolver */ } }
  };

  // ---------- 2: capas longe da tela saem da memória ----------
  function guardar(im) {
    if (im.getAttribute("data-g-src") || !im.complete || !(im.naturalWidth > 1) || !im.getAttribute("src")) return;
    im.setAttribute("data-g-src", im.getAttribute("src"));
    im.removeAttribute("src");
  }
  function soltar(im) {
    var s = im.getAttribute("data-g-src");
    if (!s) return;
    im.removeAttribute("data-g-src");
    im.setAttribute("src", s);
  }
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        // observa o quadro da capa (a imagem sem endereço some do mapa e nunca avisaria que voltou);
        // na Vitrine, a fileira inteira, pra não piscar ao deslizar pro lado
        var t = e.target, ims = t.querySelectorAll("img.capa");
        for (var i = 0; i < ims.length; i++) { if (e.isIntersecting) soltar(ims[i]); else guardar(ims[i]); }
      });
    }, {rootMargin: "1600px 0px"});
  }
  function alvos(raiz, f) {
    if (!io || raiz.nodeType !== 1) return;
    var ok = function (x) { return x.classList.contains("vit-row") || !x.closest(".vit-row"); };
    if (raiz.matches(".vit-row, .cover") && ok(raiz)) f(raiz);
    raiz.querySelectorAll(".vit-row, .cover").forEach(function (x) { if (ok(x)) f(x); });
  }
  if (io) {
    alvos(lista, function (x) { io.observe(x); });
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        m.removedNodes.forEach(function (n) { alvos(n, function (x) { io.unobserve(x); }); });
        m.addedNodes.forEach(function (n) { alvos(n, function (x) { io.observe(x); }); });
      });
    }).observe(lista, {childList: true, subtree: true});
  }

  // ---------- 1: na ficha, a primeira foto chega antes ----------
  function fotosPrimeiro() {
    var foto = document.getElementById("ficha-foto");
    if (!foto) return;
    foto.setAttribute("fetchpriority", "high");
    foto.setAttribute("decoding", "async");
    var minis = Array.prototype.slice.call(ficha.querySelectorAll(".ficha-mini img"));
    if (!minis.length) return;
    var principal = foto.getAttribute("src");
    minis.forEach(function (im) {
      im.setAttribute("decoding", "async");
      if (im.getAttribute("src") !== principal) { im.setAttribute("data-g-src", im.getAttribute("src")); im.removeAttribute("src"); }
    });
    var feito = false;
    function libera() {
      if (feito) return;
      feito = true;
      minis.forEach(function (im) { if (im.isConnected) soltar(im); });
    }
    if (foto.complete && foto.naturalWidth) libera();
    else { foto.addEventListener("load", libera, {once: true}); foto.addEventListener("error", libera, {once: true}); setTimeout(libera, 4000); }
  }

  // ---------- 4 e 5: seguir o último jogo visto; lembrar a ficha aberta ----------
  var KF = KEY + "-G-ficha";
  function lembra(id) { try { localStorage.setItem(KF, JSON.stringify({id: id, t: Date.now()})); } catch (e) {} }
  function esquece() { try { localStorage.removeItem(KF); } catch (e) {} }
  function cartao(id) { return id ? lista.querySelector('[data-card="' + id + '"]') : null; }
  function vizinhos(a, b) {
    var ta = cartao(a), tb = cartao(b);
    if (!ta || !tb) return false;
    var l = lista.querySelectorAll("[data-card]"), ia = -1, ib = -1;
    for (var i = 0; i < l.length && (ia < 0 || ib < 0); i++) { if (l[i] === ta) ia = i; if (l[i] === tb) ib = i; }
    return Math.abs(ia - ib) === 1;
  }
  var seguir = null, ultimo = null, origem = null, aviso = null;
  var abrirAntG = abrirFicha;
  abrirFicha = function (id) {
    var jaAberta = ficha.open;
    abrirAntG.apply(this, arguments);
    if (!ficha.open) return;
    try {
      // as setas (e o deslize) andam pela lista: a lista acompanha. Um "Parecido" é um desvio: a lista fica.
      if (!jaAberta) { origem = id; seguir = id; } else if (vizinhos(ultimo, id)) seguir = id;
      ultimo = id;
      lembra(id);
      if (aviso) aviso.remove();
      fotosPrimeiro();
    } catch (e) { /* segue */ }
  };
  ficha.addEventListener("close", function () {
    esquece();
    var id = seguir, de = origem;
    seguir = null; ultimo = null; origem = null;
    // só mexe na lista se você andou pelas setas e o último jogo visto não está (ou mal está) na tela
    if (!id || id === de) return;
    var t = cartao(id);
    if (!t) return;
    var r = t.getBoundingClientRect(), cima = topoLivre(), baixo = baseLivre();
    if (Math.min(r.bottom, baixo) - Math.max(r.top, cima) >= r.height * 0.5) return;
    window.scrollBy(0, r.top - cima - Math.max(0, (baixo - cima - r.height) / 2));
    t.classList.add("g-aqui");
    setTimeout(function () { t.classList.remove("g-aqui"); }, 1800);
  });

  // ---------- 6: depois de recarregar, volta pro mesmo jogo (afina o "voltar onde parou") ----------
  var KA = KEY + "-G-ancora";
  function guardaAncora() {
    try {
      var a = capturar();
      if (!a.itens.length) { localStorage.removeItem(KA); return; }
      localStorage.setItem(KA, JSON.stringify({i: a.itens[0], f: a.fileiras, v: state.view, g: state.agrupar, t: Date.now()}));
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") guardaAncora(); });
  addEventListener("pagehide", guardaAncora);
  (function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KA) || "null"); } catch (e) { s = null; }
    if (!s || !s.i || !s.i.sel || s.v !== state.view || s.g !== state.agrupar || !(Date.now() - s.t < 7 * 864e5)) return;
    if (!(window.scrollY > 0) && !Object.keys(s.f || {}).length) return;
    try { devolver({itens: [s.i], fileiras: s.f || {}}); } catch (e) {}
  })();

  // a página recarregou com uma ficha aberta (o Chrome fecha abas em segundo plano): oferece abrir de novo
  (function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KF) || "null"); } catch (e) { s = null; }
    if (!s || !s.id) return;
    var g = porId[s.id];
    if (!g || !(Date.now() - s.t < 6 * 3600 * 1000) || ficha.open) { esquece(); return; }
    aviso = document.createElement("div");
    aviso.className = "g-voltar";
    aviso.setAttribute("role", "status");
    aviso.innerHTML = "<span>Você estava vendo <strong>" + esc(g.n) + "</strong>.</span>" +
      '<button type="button" class="g-sim">Abrir de novo</button><button type="button" class="g-x" aria-label="Fechar o aviso">✕</button>';
    document.body.appendChild(aviso);
    var tm = setTimeout(function () { if (aviso) { aviso.remove(); esquece(); } }, 20000);
    aviso.querySelector(".g-sim").addEventListener("click", function () { clearTimeout(tm); aviso.remove(); abrirFicha(g.id); });
    aviso.querySelector(".g-x").addEventListener("click", function () { clearTimeout(tm); aviso.remove(); esquece(); });
  })();
})();

