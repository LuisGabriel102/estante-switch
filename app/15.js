/* mod_X_conserta.js */
// 26/11 (agD): consertos de uso e de visual achados percorrendo o app no celular e no PC.
// Fica por último: embrulha funções dos outros módulos sem mudar o que elas fazem por dentro.
//  1. Números grandes com ponto (19.345 jogos, 5.701, 2.541...).
//  2. "A lista inteira" soma só as suas listas: com o catálogo baixado ela somava 27 mil GB.
//  3. "Marcar tudo" marca as suas listas, não os 18 mil jogos do catálogo.
//  4. O filtro "Tudo, com o catálogo completo" (o padrão) não aparece mais como filtro ligado.
//  5. Na visão "Traduções", a contagem fala dos jogos do quadro, não de "19.345 jogos".
//  6. Ficha de jogo vetado ou que ainda não saiu: o português vem da nota, não "Sem português ainda".
//  7. Ajustes e Imagens no aparelho fecham com Esc (PC) e com o botão voltar (celular).
//  8. Estrela e círculo de marcar, quando desligados, aparecem em cima de qualquer capa (contraste).
//  9. Imagem que o wsrv.nl não entrega: tenta a da eShop antes de desistir; miniaturas da ficha menores.
// 10. Aviso de fotos da ficha sem falar de "app do Claude" e "arquivo".
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function mil(n) { return Number(n).toLocaleString("pt-BR"); }
  function daLista(g) { return g.l !== 5 || !!g.b; }

  // ---------- CSS ----------
  var css = document.createElement("style");
  css.textContent = [
    // 8: contraste da estrela e do círculo desligados (antes: branco a 55% sobre a capa, sumia em capa clara)
    "html .capa-tile .fav-capa[aria-pressed=\"false\"], html .vit-item .fav-capa[aria-pressed=\"false\"] { opacity: 1; background: rgba(12,16,28,.55); color: #fff; border: 2px solid rgba(255,255,255,.9); box-shadow: 0 1px 4px rgba(0,0,0,.35); }",
    "html .capa-tile:not(.is-sel) .capa-check { opacity: 1; background: rgba(12,16,28,.4); border: 2px solid rgba(255,255,255,.95); box-shadow: 0 1px 4px rgba(0,0,0,.35); }",
    // 9: miniatura que ainda não chegou fica cinza, não branca
    "#ficha .ficha-mini .mini { background: var(--line); }",
    "#ficha .ficha-mini .mini img:not([src]) { visibility: hidden; }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- 1: números com ponto ----------
  function pontoNoTexto(el, re) {
    if (!el) return;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var t = n.nodeValue, novo = t.replace(re, function (m) { return mil(m); });
      if (novo !== t) n.nodeValue = novo;
    }
  }
  var NUM = /\b\d{4,}\b/g;
  function numeros() {
    try {
      var sub = $("sub");
      if (sub) sub.textContent = sub.textContent.replace(/^(\d{4,})(?= jogos)/, function (m) { return mil(m); });
      document.querySelectorAll(".tile .num, #mostrando, #lista-jogos .group-head .count, #lista-jogos .vit-head .count, #pular .pular-chip .n, #lista-jogos .q-col .count")
        .forEach(function (el) { pontoNoTexto(el, NUM); });
    } catch (e) {}
  }

  // ---------- 2: total "da lista inteira" sem o catálogo ----------
  function totalLista() {
    return sumGB(DATA.filter(function (g) { return counted(g) && daLista(g); }));
  }
  var resumoAnt = renderResumo;
  renderResumo = function () {
    var r = resumoAnt.apply(this, arguments);
    try {
      var el = $("resumo"), total = totalLista(), cabe = smallestFit(total);
      if (el) el.textContent = el.textContent.replace(/A lista inteira soma .*$/,
        "As suas listas (sem o catálogo) somam " + fmt(total) + " GB" + (cabe ? ": só cabem todas no de " + cabe + "." : ": não cabem em nenhum dos cartões."));
    } catch (e) {}
    numeros();
    return r;
  };
  var medidorAnt = renderMeter;
  renderMeter = function () {
    var r = medidorAnt.apply(this, arguments);
    try {
      var el = $("total"), total = totalLista(), cap = state.cap;
      var rot = (CAPS.find(function (c) { return c.v === cap; }) || {}).label || fmt(cap) + " GB";
      if (el) el.textContent = total <= cap
        ? "As suas listas (" + fmt(total) + " GB, sem o catálogo, sem os vetados e sem os que não saíram) cabem no cartão de " + rot + ", com " + fmt(cap - total) + " GB de folga."
        : "As suas listas pesam " + fmt(total) + " GB, sem o catálogo, sem os vetados e sem os que não saíram. No cartão de " + rot + ", faltam " + fmt(total - cap) + " GB.";
    } catch (e) {}
    return r;
  };

  // ---------- 3: "Marcar tudo" = as suas listas ----------
  var bAll = $("btn-all");
  if (bAll) {
    bAll.addEventListener("click", function (e) {
      e.stopImmediatePropagation();
      state.sel = new Set(DATA.filter(function (g) { return counted(g) && daLista(g); }).map(function (g) { return g.id; }));
      save(); renderMeter(); renderList();
    }, true);
    bAll.title = "Marca todos os jogos das suas listas (o catálogo fica de fora)";
  }

  // ---------- 4 e 5: filtros e contagem ----------
  var filtrosAnt = renderFiltros;
  renderFiltros = function (n) {
    var r = filtrosAnt.apply(this, arguments);
    try {
      var l = $("lista");
      if (l) l.classList.toggle("ativo", state.list !== "tudo");
    } catch (e) {}
    return r;
  };
  function posLista() {
    try {
      var l = $("lista");
      if (l) l.classList.toggle("ativo", state.list !== "tudo");
      if (state.view === "quadro") {
        var m = $("mostrando"), sp = m && m.querySelector("span");
        var n = document.querySelectorAll("#lista-jogos .q-card").length;
        if (sp) sp.innerHTML = "No quadro de traduções: <strong>" + n + "</strong> " + (n === 1 ? "jogo." : "jogos.");
      }
    } catch (e) {}
    numeros();
  }
  var listaAnt = renderList;
  renderList = function () {
    var r = listaAnt.apply(this, arguments);
    posLista();
    return r;
  };
  var tilesAnt = renderTiles;
  renderTiles = function () { var r = tilesAnt.apply(this, arguments); numeros(); return r; };

  // ---------- 6: português na ficha de jogo vetado / que não saiu ----------
  function ptDaNota(g) {
    var t = g.t || "";
    if (g.s0 === "pt") return "💬 PT-BR oficial";
    if (g.s0 === "pronta") return "💬 Tradução de fã pronta";
    if (/vai ter PT-BR|vai ter português/i.test(t)) return "💬 Vai ter PT-BR";
    if (/não tem PT-BR|sem PT-BR|não tem português|sem português/i.test(t)) return "Sem PT-BR";
    if (/eShop lista português|tem português|com PT-BR|PT-BR oficial/i.test(t)) return "💬 A eShop lista português";
    if (g.s0 === "cat" || g.s0 === "sua") return "Sem português";
    return "Português não conferido";
  }
  var fichaAnt = abrirFicha;
  abrirFicha = function (id) {
    var r = fichaAnt.apply(this, arguments);
    try {
      var g = DATA.find(function (x) { return x.id === id; });
      if (g && (g.s === "veto" || g.s === "espera")) {
        ficha.querySelectorAll(".ficha-dados span").forEach(function (s) {
          if (s.textContent === "Sem português ainda") s.textContent = ptDaNota(g);
        });
      }
      // 9: miniaturas da galeria em 240 px (eram 720 px, iguais à foto grande): chegam bem mais rápido no celular
      ficha.querySelectorAll(".ficha-mini img").forEach(function (im) {
        ["src", "data-g-src"].forEach(function (a) {
          var s = im.getAttribute(a);
          if (s && s.indexOf("https://wsrv.nl/?url=") === 0 && s.indexOf("&w=720&") > 0) im.setAttribute(a, s.replace("&w=720&", "&w=240&"));
        });
      });
    } catch (e) {}
    return r;
  };

  // ---------- 7: Ajustes e Imagens no aparelho fecham com Esc e com o voltar ----------
  var folhas = document.querySelectorAll(".c-fundo");
  var empurrou = null, ignorar = false, peloVoltar = false;
  function aberta() { return document.querySelector(".c-fundo.aberto"); }
  function fecha(f) {
    var b = f.querySelector("[data-fecha], [data-hfecha]");
    if (b) b.click(); else f.classList.remove("aberto");
    if (f.classList.contains("aberto")) f.classList.remove("aberto");
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var f = aberta();
    if (!f) return;
    e.preventDefault();
    fecha(f);
  });
  if ("MutationObserver" in window) {
    folhas.forEach(function (f) {
      var tava = f.classList.contains("aberto");
      new MutationObserver(function () {
        var esta = f.classList.contains("aberto");
        if (esta === tava) return;
        tava = esta;
        if (esta) {
          try { history.pushState({folhaX: 1}, ""); empurrou = f; } catch (e) { empurrou = null; }
          var foco = f.querySelector("button, input");
          if (foco) try { foco.focus({preventScroll: true}); } catch (e) {}
        } else if (empurrou === f) {
          empurrou = null;
          if (!peloVoltar && history.state && history.state.folhaX) { ignorar = true; try { history.back(); } catch (e) { ignorar = false; } }
        }
      }).observe(f, {attributes: true, attributeFilter: ["class"]});
    });
    window.addEventListener("popstate", function () {
      if (ignorar) { ignorar = false; return; }
      var f = aberta();
      if (!f) return;
      peloVoltar = true;
      try { fecha(f); } finally { peloVoltar = false; }
    });
  }

  // ---------- 9: imagem que o wsrv.nl não entregou: tenta a original da eShop ----------
  // (fica na janela, em captura: roda antes dos outros avisos de erro, que apagariam a capa ou a galeria)
  window.addEventListener("error", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "IMG" || t.getAttribute("data-x-orig")) return;
    var s = t.getAttribute("src") || "";
    if (s.indexOf("https://wsrv.nl/?url=") !== 0) return;
    var m = /[?&]url=([^&]+)/.exec(s);
    if (!m) return;
    var orig;
    try { orig = decodeURIComponent(m[1]); } catch (x) { return; }
    if (!/^https:\/\//.test(orig)) return;
    t.setAttribute("data-x-orig", "1");
    e.stopImmediatePropagation();
    t.setAttribute("src", orig);
  }, true);

  // ---------- 10: aviso das fotos sem "app do Claude" ----------
  if (typeof avisoFotos === "function") {
    var avisoAnt = avisoFotos;
    avisoFotos = function () {
      var r = avisoAnt.apply(this, arguments);
      var sem = $("ficha-sem");
      if (sem && /app do Claude/.test(sem.textContent))
        sem.textContent = "As fotos não carregaram. Confira a internet, ou veja os vídeos no YouTube, no link abaixo.";
      return r;
    };
  }

  // o app já desenhou tudo antes deste módulo: refaz só os textos (sem redesenhar a lista de 19 mil jogos)
  try { renderResumo(); renderMeter(); } catch (e) {}
  posLista();
})();

/* 26/11 (2): o ✕ da ficha não fica mais por cima do texto: some ao rolar pra baixo lendo, volta ao rolar pra cima ou perto do topo */
(function () {
  "use strict";
  var ficha = document.getElementById("ficha");
  if (!ficha) return;
  var st = document.createElement("style");
  st.textContent = "#ficha .ficha-x{transition:opacity .18s ease, transform .18s ease}" +
    "#ficha.x-some .ficha-x{opacity:0;transform:translateY(-14px) scale(.9);pointer-events:none}";
  document.head.appendChild(st);
  var ult = 0, desceu = 0;
  ficha.addEventListener("scroll", function () {
    var y = ficha.scrollTop, d = y - ult;
    ult = y;
    if (y < 80) { ficha.classList.remove("x-some"); desceu = 0; return; }
    if (d > 0) { desceu += d; if (desceu > 24) ficha.classList.add("x-some"); }
    else if (d < -6) { desceu = 0; ficha.classList.remove("x-some"); }
  }, {passive: true});
  // abriu outra ficha: o ✕ aparece de novo
  new MutationObserver(function () { if (ficha.open) { ult = 0; desceu = 0; ficha.classList.remove("x-some"); } })
    .observe(ficha, {attributes: true, attributeFilter: ["open"]});
})();

