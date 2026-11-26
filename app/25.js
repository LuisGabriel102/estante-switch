/* mod_K_estatisticas.js */
// "📊 Estatísticas": uma tela (em tela cheia no celular) com gráficos do que está neste aparelho.
// Gosto (estrelas e marcados por gênero, romance, português, etiquetas, editoras, RPG de nicho),
// Cartão (GB marcados x capacidade, maiores jogos), Atividade (modo Avaliar, histórico por dia/semana,
// fichas mais abertas, planos, playlists) e Traduções (window.V_dados(), se os dados do tradutor foram importados).
// Tudo é calculado só quando a tela abre (uma passada pelo DATA). Gráficos em SVG feito à mão, sem biblioteca.
// Nada é inventado: "zerados" e "horas jogadas" não existem nos dados; o que existe é o "✓ Já joguei" dos planos.
(function () {
  "use strict";
  if (typeof DATA === "undefined" || typeof state === "undefined") return;
  var KM = KEY + "-K-modo", KT = KEY + "-K-tempo";
  function ler(k, padrao) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? padrao : v; } catch (e) { return padrao; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var modo = ler(KM, "ambos"); if (["ambos", "fav", "sel"].indexOf(modo) < 0) modo = "ambos";
  var todosGen = false;
  var tempo = ler(KT, "dia"); if (tempo !== "dia" && tempo !== "semana") tempo = "dia";

  // ---------- estilo (cores dos gráficos: paleta validada pra daltônicos, com passos próprios no escuro) ----------
  var css = document.createElement("style");
  css.textContent = [
    ".k-tela { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; background: rgba(10,14,20,.55); }",
    ".k-tela[hidden] { display: none; }",
    "#k-dlg { --k-1: #257de0; --k-2: #f47230; --k-3: #00b894; --k-trilho: #e8ecf2;",
    "  --k-r1: #0f4a96; --k-r2: #2370cd; --k-r3: #6aabf1; --k-r4: #aab2be; --k-r5: #d5dbe4;",
    "  padding: 0; border: 0; border-radius: 16px; width: min(980px, calc(100vw - 24px)); max-width: none; height: calc(100dvh - 24px); max-height: calc(100dvh - 24px);",
    "  background: var(--bg); color: var(--ink); box-shadow: 0 20px 60px rgba(0,0,0,.35); overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; }",
    "@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) #k-dlg { --k-1: #338ced; --k-2: #e76624; --k-3: #00a888; --k-trilho: #232c39;",
    "  --k-r1: #9dc8f7; --k-r2: #519ced; --k-r3: #2370cd; --k-r4: #5b6573; --k-r5: #39424f; } }",
    ":root[data-theme=\"dark\"] #k-dlg { --k-1: #338ced; --k-2: #e76624; --k-3: #00a888; --k-trilho: #232c39;",
    "  --k-r1: #9dc8f7; --k-r2: #519ced; --k-r3: #2370cd; --k-r4: #5b6573; --k-r5: #39424f; }",
    "@media (max-width: 699px) { #k-dlg { width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; margin: 0; } }",
    ".k-cab { flex: none; background: var(--surface); border-bottom: 1px solid var(--line); padding: max(10px, env(safe-area-inset-top)) 16px 10px; display: grid; gap: 10px; }",
    ".k-topo { display: flex; align-items: center; gap: 12px; }",
    ".k-topo h2 { flex: 1; font-size: 21px; line-height: 1.2; margin: 0; }",
    ".k-nav { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -4px; padding: 0 4px; }",
    ".k-nav::-webkit-scrollbar { display: none; }",
    ".k-nav .btn, .k-seg .btn { flex: none; min-height: 40px; border-radius: 999px; font-size: 14px; white-space: nowrap; }",
    ".k-nav .btn[aria-current=\"true\"], .k-seg .btn[aria-pressed=\"true\"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }",
    ".k-corpo { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px 16px calc(24px + env(safe-area-inset-bottom)); display: grid; gap: 22px; align-content: start; }",
    ".k-corpo:focus { outline: none; }",
    ".k-sec { display: grid; gap: 12px; scroll-margin-top: 8px; }",
    ".k-sec > h3 { font-size: 19px; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }",
    ".k-sec > p { margin: -6px 0 0; color: var(--muted); font-size: 14px; }",
    ".k-grade { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); align-items: start; }",
    ".k-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 10px; min-width: 0; }",
    ".k-card.k-largo { grid-column: 1 / -1; }",
    // cartões fora da tela não são montados até chegar perto (abre mais rápido no celular)
    ".k-card { content-visibility: auto; contain-intrinsic-size: auto 340px; }",
    ".k-card h4 { font-size: 16px; margin: 0; line-height: 1.25; }",
    ".k-sub { margin: -6px 0 0; font-size: 13px; color: var(--muted); line-height: 1.4; }",
    ".k-nota { margin: 0; font-size: 14px; line-height: 1.45; }",
    ".k-nota b { font-weight: 600; }",
    ".k-vazio { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.45; }",
    ".k-seg { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }",
    ".k-seg > span { font-size: 14px; color: var(--muted); margin-right: 2px; }",
    ".k-nums { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 8px; }",
    ".k-nums.k-n3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }",
    ".k-nums.k-n4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }",
    "@media (min-width: 560px) { .k-largo .k-nums.k-n4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }",
    "@media (max-width: 420px) { .k-nums.k-n3 .k-num b { font-size: 22px; } .k-num { padding: 9px 10px; } }",
    ".k-num { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; display: grid; gap: 2px; align-content: start; min-width: 0; }",
    ".k-num b { font-family: var(--font-display); font-size: 26px; line-height: 1.1; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }",
    ".k-num b small { font-size: 15px; font-weight: 600; color: var(--muted); }",
    ".k-num span { font-size: 13px; color: var(--muted); line-height: 1.3; }",
    ".k-heroi { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }",
    ".k-heroi b { font-family: var(--font-display); font-size: 34px; line-height: 1; font-variant-numeric: tabular-nums; }",
    ".k-heroi span { color: var(--muted); font-size: 15px; }",
    ".k-graf { min-width: 0; }",
    ".k-graf svg { display: block; overflow: visible; }",
    ".k-lin { display: grid; gap: 3px; width: 100%; padding: 4px 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: left; }",
    "button.k-lin { cursor: pointer; border-radius: 6px; }",
    "button.k-lin:hover .k-nome, button.k-lin:focus-visible .k-nome { text-decoration: underline; }",
    ".k-rot { display: flex; align-items: baseline; gap: 10px; font-size: 14px; line-height: 1.3; }",
    ".k-nome { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
    ".k-val { flex: none; font-variant-numeric: tabular-nums; color: var(--ink); font-weight: 600; }",
    ".k-val i { font-style: normal; font-weight: 400; color: var(--muted); }",
    ".k-leg { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 0; list-style: none; font-size: 13px; }",
    ".k-leg li { display: inline-flex; align-items: center; gap: 6px; }",
    ".k-leg li b { font-weight: 600; font-variant-numeric: tabular-nums; }",
    ".k-leg li i { font-style: normal; color: var(--muted); font-variant-numeric: tabular-nums; }",
    ".k-cor { flex: none; width: 12px; height: 12px; border-radius: 3px; display: inline-block; }",
    ".k-lista-leg { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 14px; }",
    ".k-lista-leg li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 8px; align-items: center; }",
    ".k-lista-leg li b { font-weight: 600; font-variant-numeric: tabular-nums; }",
    ".k-lista-leg li i { font-style: normal; color: var(--muted); }",
    ".k-eixo { font-size: 11px; fill: var(--muted); font-variant-numeric: tabular-nums; }",
    ".k-rv { font-size: 11px; fill: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }",
    ".k-acoes { display: flex; flex-wrap: wrap; gap: 8px; }",
    ".k-acoes .btn { min-height: 40px; }",
    ".k-aviso { margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--accent-soft); font-size: 14px; line-height: 1.4; }",
    ".k-rodape { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.45; }",
    "#k-tip { position: fixed; z-index: 10; pointer-events: none; max-width: min(280px, calc(100vw - 24px)); padding: 7px 10px; border-radius: 8px; background: var(--ink); color: var(--surface);",
    "  font-size: 13px; line-height: 1.35; box-shadow: 0 6px 18px rgba(0,0,0,.25); opacity: 0; transition: opacity .12s; }",
    "#k-tip.on { opacity: 1; }",
    ".k-abrir { white-space: nowrap; }",
    "@media (forced-colors: active) { .k-cor, .k-graf path, .k-graf rect { forced-color-adjust: none; } }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- pequenos ----------
  // formatadores feitos uma vez (toLocaleString a cada número custa caro no celular)
  var F0 = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 0}), F1 = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 1}),
    F11 = new Intl.NumberFormat("pt-BR", {minimumFractionDigits: 1, maximumFractionDigits: 1}), FD = null;
  function mil(n) { return F0.format(Math.round(n)); }
  function gbTxt(n) { return (Math.abs(n) >= 100 ? F0 : F1).format(n) + " GB"; }
  function pctN(a, b) { return b ? a * 100 / b : 0; }
  function pctTxt(a, b) { var p = pctN(a, b); return (p > 0 && p < 1 ? "menos de 1" : F0.format(Math.round(p))) + "%"; }
  function vezes(x) { return (x < 10 ? F11 : F0).format(x) + "×"; }
  function plural(n, um, varios) { return mil(n) + " " + (n === 1 ? um : varios); }
  function rotGen(gn) { return (GENRES[gn] && GENRES[gn].label) || gn; }
  function cor(v) { return "var(--" + v + ")"; }
  function edDe(g) {
    if (typeof g.si !== "string" || !window.SI_ED) return "";
    var f = g.si.indexOf(".");
    if (f < 0) return "";
    var i = parseInt(g.si.slice(f + 1), 36);
    return i >= 0 && window.SI_ED[i] ? window.SI_ED[i] : "";
  }
  function temPlano(g, k) {
    var o = state.pl[g.id];
    if (o && Object.prototype.hasOwnProperty.call(o, k)) return o[k] === 1;
    return k === "q" ? !!g.q : k === "j" ? !!g.j : false;
  }
  function minha(g) { return Object.prototype.hasOwnProperty.call(state.mt, g.id) ? state.mt[g.id] : (g.mt || ""); }

  // ---------- os números: uma passada pelo DATA ----------
  // o que é do catálogo inteiro (não muda com as suas marcações): uma passada, guardada até o DATA crescer
  var CAT = null;
  function catalogo() {
    if (CAT && CAT.n === DATA.length) return CAT;
    var c = {n: DATA.length, romCat: {sim: 0, opc: 0, leve: 0, nao: 0, nc: 0}, idiCat: {pt: 0, pronta: 0, sem: 0}, etCat: {}, nEt: 0, porId: {}, esp: []};
    for (var i = 0; i < DATA.length; i++) {
      var g = DATA[i];
      c.porId[g.id] = g;
      c.romCat[g.rom && c.romCat.hasOwnProperty(g.rom) ? g.rom : "nc"]++;
      c.idiCat[g.s === "pt" ? "pt" : g.s === "pronta" ? "pronta" : "sem"]++;
      if (g.et) { c.nEt++; var ets = g.et.split(" "); for (var e = 0; e < ets.length; e++) c.etCat[ets[e]] = (c.etCat[ets[e]] || 0) + 1; }
      if (g.q || g.j || g.mt) c.esp.push(g);   // planos e traduções que já vêm no jogo
    }
    CAT = c;
    return c;
  }
  // as suas contas: só os jogos com estrela, marcados, com plano ou tradução (centenas, não 19 mil)
  function calcular() {
    var sel = state.sel, fav = state.fav, c = catalogo(), porId = c.porId;
    var r = {
      n: c.n, nFav: 0, nSel: 0, nSeus: 0,
      gen: {}, rom: {sim: 0, opc: 0, leve: 0, nao: 0, nc: 0}, romCat: c.romCat,
      idi: {pt: 0, pronta: 0, sem: 0}, idiCat: c.idiCat,
      et: {}, etCat: c.etCat, nEt: 0, nEtCat: c.nEt, ed: {}, temEd: !!window.SI_ED,
      rpg: {grande: 0, nicho: 0, px: 0, tb: 0, jr: 0},
      gbSel: 0, nSelGB: 0, maiores: [], gbGen: {},
      plano: {w: 0, q: 0, j: 0}, mt: {pc: 0, rev: 0, ok: 0},
      porId: porId, his: historico()
    };
    var ids = new Set();
    sel.forEach(function (id) { ids.add(id); });
    fav.forEach(function (id) { ids.add(id); });
    ids.forEach(function (id) {
      var g = porId[id];
      if (!g) return;
      var s = sel.has(id), f = fav.has(id);
      if (f) r.nFav++;
      if (s) r.nSel++;
      var gg = r.gen[g.gn] || (r.gen[g.gn] = {sel: 0, fav: 0});
      if (s) gg.sel++;
      if (f) gg.fav++;
      if (s && (typeof counted === "function" ? counted(g) : g.g != null)) {
        r.gbSel += g.g; r.nSelGB++;
        r.gbGen[g.gn] = (r.gbGen[g.gn] || 0) + g.g;
        r.maiores.push(g);
      }
      if (!(modo === "ambos" || (modo === "fav" ? f : s))) return;
      r.nSeus++;
      r.rom[g.rom && r.rom.hasOwnProperty(g.rom) ? g.rom : "nc"]++;
      r.idi[g.s === "pt" ? "pt" : g.s === "pronta" ? "pronta" : "sem"]++;
      var ets = g.et ? g.et.split(" ") : [];
      if (ets.length) r.nEt++;
      for (var e = 0; e < ets.length; e++) r.et[ets[e]] = (r.et[ets[e]] || 0) + 1;
      if (r.temEd) { var ed = edDe(g); if (ed) r.ed[ed] = (r.ed[ed] || 0) + 1; }
      if (g.gn === "rpg" || g.gn === "rpgnicho") {
        if (g.gn === "rpg") r.rpg.grande++; else r.rpg.nicho++;
        if (ets.indexOf("px") >= 0) r.rpg.px++;
        if (ets.indexOf("tb") >= 0) r.rpg.tb++;
        if (ets.indexOf("jr") >= 0) r.rpg.jr++;
      }
    });
    // planos e a sua tradução: o que você mudou na ficha + o que já vem no jogo (cada jogo uma vez)
    var outros = {};
    Object.keys(state.pl || {}).forEach(function (id) { outros[id] = porId[id]; });
    Object.keys(state.mt || {}).forEach(function (id) { outros[id] = porId[id]; });
    c.esp.forEach(function (g) { outros[g.id] = g; });
    Object.keys(outros).forEach(function (id) {
      var g = outros[id];
      if (!g) return;
      if (temPlano(g, "w")) r.plano.w++;
      if (temPlano(g, "q")) r.plano.q++;
      if (temPlano(g, "j")) r.plano.j++;
      var m = minha(g); if (m && r.mt.hasOwnProperty(m)) r.mt[m]++;
    });
    r.maiores.sort(function (a, b) { return b.g - a.g; });
    r.maiores = r.maiores.slice(0, 8);
    return r;
  }
  function historico() {
    try { if (typeof window.S_historico === "function") return window.S_historico(); } catch (e) {}
    var h = ler(KEY + "-historico", []);
    return Array.isArray(h) ? h : [];
  }

  // ---------- gráficos: cada um vira um lugar na tela e é desenhado depois, com a largura certa ----------
  var desenhos = [];
  function lugar(fn, alt) {
    desenhos.push(fn);
    return '<div class="k-graf" data-k-g="' + (desenhos.length - 1) + '"' + (alt ? ' role="img" aria-label="' + esc(alt) + '"' : "") + "></div>";
  }
  // desenha os gráficos de um cartão (lê as larguras de uma vez, depois escreve)
  function pintarCartoes(cards) {
    var els = [], ws = [];
    cards.forEach(function (c) { Array.prototype.push.apply(els, c.querySelectorAll("[data-k-g]")); });
    for (var i = 0; i < els.length; i++) ws.push(els[i].clientWidth);
    for (i = 0; i < els.length; i++) {
      var f = desenhos[+els[i].getAttribute("data-k-g")];
      if (f) try { els[i].innerHTML = f(Math.max(120, ws[i])); } catch (e) { els[i].textContent = ""; }
    }
    cards.forEach(function (c) { c.setAttribute("data-k-ok", ""); });
  }
  // os cartões da primeira tela na hora; os outros quando chegam perto (rolando)
  var io = null;
  function pintar(tudo) {
    var cards = Array.prototype.slice.call(corpo.querySelectorAll(".k-card"));
    if (!io && typeof IntersectionObserver === "function") io = new IntersectionObserver(function (ents) {
      var vai = [];
      ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); if (!en.target.hasAttribute("data-k-ok")) vai.push(en.target); } });
      if (vai.length && aberto) pintarCartoes(vai);
    }, {root: corpo, rootMargin: "600px 0px"});
    if (io) io.disconnect();
    if (tudo || !io) { pintarCartoes(cards); return; }
    var lim = window.innerHeight + 100, ys = cards.map(function (c) { return c.getBoundingClientRect().top; }), ja = [];
    cards.forEach(function (c, i) { if (ys[i] < lim) ja.push(c); else io.observe(c); });
    pintarCartoes(ja);
  }
  // barra com a ponta de dados arredondada (a base fica reta)
  function pontaR(x, y, w, h, r, c) {
    if (!(w > 0)) return "";
    r = Math.min(r, w, h / 2);
    return '<path d="M' + x + "," + y + "h" + (w - r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r + "v" + (h - 2 * r) + "a" + r + "," + r + " 0 0 1 -" + r + "," + r +
      "h-" + (w - r) + 'z" fill="' + c + '"/>';
  }
  function pontaCima(x, base, w, h, r, c) {
    if (!(h > 0)) return "";
    r = Math.min(r, w / 2, h);
    var y = base - h;
    return '<path d="M' + x + "," + base + "v-" + (h - r) + "a" + r + "," + r + " 0 0 1 " + r + ",-" + r + "h" + (w - 2 * r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r +
      "v" + (h - r) + 'z" fill="' + c + '"/>';
  }
  function trilho(w, h) { return '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + Math.min(4, h / 2) + '" fill="var(--k-trilho)"/>'; }

  // barras deitadas: rows [{rot, v, v2?, val (html), tip, id?}]; o.duplo = duas séries (✓ e ★)
  function barras(rows, o) {
    o = o || {};
    var max = 0;
    rows.forEach(function (x) { max = Math.max(max, x.v, x.v2 || 0); });
    max = max || 1;
    return lugar(function (W) {
      return rows.map(function (x) {
        var tag = x.id ? 'button type="button" data-k-ficha="' + esc(x.id) + '"' : "div", fim = x.id ? "button" : "div", svg;
        if (o.duplo) {
          var h1 = 7, gap = 2;
          svg = '<svg width="' + W + '" height="' + (h1 * 2 + gap) + '" aria-hidden="true">' +
            '<rect x="0" y="0" width="' + W + '" height="' + h1 + '" rx="3.5" fill="var(--k-trilho)"/>' + pontaR(0, 0, x.v ? Math.max(2, x.v / max * W) : 0, h1, 3.5, "var(--k-1)") +
            '<rect x="0" y="' + (h1 + gap) + '" width="' + W + '" height="' + h1 + '" rx="3.5" fill="var(--k-trilho)"/>' + pontaR(0, h1 + gap, x.v2 ? Math.max(2, x.v2 / max * W) : 0, h1, 3.5, "var(--k-2)") + "</svg>";
        } else {
          svg = '<svg width="' + W + '" height="10" aria-hidden="true">' + trilho(W, 10) + pontaR(0, 0, x.v ? Math.max(2, x.v / max * W) : 0, 10, 4, o.cor || "var(--k-1)") + "</svg>";
        }
        return "<" + tag + ' class="k-lin" data-tip="' + esc(x.tip || "") + '"><span class="k-rot"><span class="k-nome">' + esc(x.rot) + '</span><span class="k-val">' + x.val + "</span></span>" + svg + "</" + fim + ">";
      }).join("");
    });
  }
  // barra de 100% em fatias (parte do todo, até 6 pedaços), com legenda em lista (nome, número e %)
  var nClip = 0;
  function fatias(partes, total, alt) {
    var vis = partes.filter(function (p) { return p.v > 0; });
    var leg = '<ul class="k-lista-leg">' + partes.map(function (p) {
      return '<li><span class="k-cor" style="background:' + p.c + '"></span><span>' + esc(p.rot) + '</span><span><b>' + mil(p.v) + "</b> <i>· " + pctTxt(p.v, total) + "</i></span></li>";
    }).join("") + "</ul>";
    var id = "k-clip" + (++nClip);
    return lugar(function (W) {
      var x = 0, h = 22, gap = 2, livre = W - gap * Math.max(0, vis.length - 1), s = "";
      vis.forEach(function (p, i) {
        var w = i === vis.length - 1 ? W - x : Math.max(3, p.v / total * livre);
        s += '<rect x="' + x.toFixed(1) + '" y="0" width="' + Math.max(0, w).toFixed(1) + '" height="' + h + '" fill="' + p.c + '" data-tip="' + esc(p.rot + ": " + mil(p.v) + " (" + pctTxt(p.v, total) + ")") + '"/>';
        x += w + gap;
      });
      return '<svg width="' + W + '" height="' + h + '"><clipPath id="' + id + '"><rect width="' + W + '" height="' + h + '" rx="6"/></clipPath><g clip-path="url(#' + id + ')">' +
        (s || trilho(W, h)) + "</g></svg>";
    }, alt) + leg;
  }
  function legenda(itens) {
    return '<ul class="k-leg">' + itens.map(function (x) { return '<li><span class="k-cor" style="background:' + x[0] + '"></span>' + x[1] + "</li>"; }).join("") + "</ul>";
  }
  function teto(m) {
    if (m <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log(m) / Math.LN10)), n = m / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  // colunas no tempo: b [{rot, v, tip}], um eixo só (contagem), valor escrito só na coluna mais alta
  function colunas(b, c, alt) {
    var max = 0, iMax = -1;
    b.forEach(function (x, i) { if (x.v > max) { max = x.v; iMax = i; } });
    var top = teto(max || 1);
    return lugar(function (W) {
      var esq = 26, H = 120, base = 102, alto = base - 14, pw = W - esq, passo = pw / b.length, cw = Math.max(2, Math.min(28, passo * 0.68)), s = "";
      [0, top / 2, top].forEach(function (v) {
        var y = base - v / top * alto;
        s += '<line x1="' + esq + '" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line)" stroke-width="1"' + (v ? ' stroke-dasharray="2 3"' : "") + "/>" +
          '<text class="k-eixo" x="' + (esq - 6) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end">' + mil(v) + "</text>";
      });
      b.forEach(function (x, i) {
        var cx = esq + passo * i + (passo - cw) / 2, h = x.v ? Math.max(2, x.v / top * alto) : 0;
        s += pontaCima(cx.toFixed(1), base, cw, h, 3, c);
        if (i === iMax && max > 0) s += '<text class="k-rv" x="' + (cx + cw / 2).toFixed(1) + '" y="' + (base - h - 4).toFixed(1) + '" text-anchor="middle">' + mil(x.v) + "</text>";
        s += '<rect x="' + (esq + passo * i).toFixed(1) + '" y="0" width="' + passo.toFixed(1) + '" height="' + H + '" fill="transparent" data-tip="' + esc(x.tip) + '"/>';
      });
      var marcas = b.length > 1 ? [0, Math.floor((b.length - 1) / 2), b.length - 1] : [0];
      marcas.forEach(function (i, k) {
        var cx = esq + passo * i + passo / 2;
        s += '<text class="k-eixo" x="' + cx.toFixed(1) + '" y="' + (H - 2) + '" text-anchor="' + (k === 0 && b.length > 1 ? "start" : k === marcas.length - 1 && b.length > 1 ? "end" : "middle") + '">' + esc(b[i].rot) + "</text>";
      });
      return '<svg width="' + W + '" height="' + H + '">' + s + "</svg>";
    }, alt);
  }
  // medidor do cartão
  function medidor(gb, cap) {
    var p = gb / cap;
    return lugar(function (W) {
      var h = 18, c = p > 1 ? "var(--veto)" : p > 0.85 ? "var(--warn)" : "var(--k-1)";
      return '<svg width="' + W + '" height="' + h + '"><rect width="' + W + '" height="' + h + '" rx="9" fill="var(--k-trilho)"/>' +
        (p > 0 ? '<rect width="' + Math.max(h, Math.min(1, p) * W).toFixed(1) + '" height="' + h + '" rx="9" fill="' + c + '" data-tip="' + esc(gbTxt(gb) + " de " + gbTxt(cap)) + '"/>' : "") + "</svg>";
    }, "Cartão: " + gbTxt(gb) + " de " + gbTxt(cap));
  }
  function numeros(itens) {
    return '<div class="k-nums k-n' + itens.length + '">' + itens.map(function (x) { return '<div class="k-num"><b>' + x[0] + "</b><span>" + x[1] + "</span></div>"; }).join("") + "</div>";
  }
  function card(tit, sub, corpo, largo) {
    return '<article class="k-card' + (largo ? " k-largo" : "") + '"><h4>' + tit + "</h4>" + (sub ? '<p class="k-sub">' + sub + "</p>" : "") + corpo + "</article>";
  }

  // ---------- seções ----------
  function secGosto(r) {
    var seusTxt = modo === "fav" ? "com estrela" : modo === "sel" ? "marcados" : "com estrela ou marcados";
    var gens = Object.keys(r.gen).sort(function (a, b) { var x = r.gen[a], y = r.gen[b]; return (y.sel + y.fav) - (x.sel + x.fav) || (GEN_ORDER.indexOf(a) - GEN_ORDER.indexOf(b)); });
    var top = gens[0];
    var h = '<section class="k-sec" id="k-s-gosto"><h3>Seu gosto</h3><p>Pelos jogos que você deu estrela (★) e marcou pro cartão (✓).</p>';
    h += '<div class="k-seg" role="group" aria-label="Contar quais jogos"><span>Contar:</span>' +
      [["ambos", "★ e ✓"], ["fav", "Só ★"], ["sel", "Só ✓"]].map(function (m) {
        return '<button type="button" class="btn" data-k-modo="' + m[0] + '" aria-pressed="' + (modo === m[0]) + '">' + m[1] + "</button>";
      }).join("") + "</div>";
    h += '<div class="k-grade">';
    h += card("Resumo", "", numeros([
      [mil(r.nFav), "★ com estrela"], [mil(r.nSel), "✓ marcados pro cartão"],
      [top ? esc(rotGen(top)) : "—", "gênero que mais aparece"]
    ]), true);
    if (gens.length) {
      h += card("Por gênero", "Quantos jogos de cada gênero você marcou e deu estrela.",
        legenda([["var(--k-1)", "✓ Marcados"], ["var(--k-2)", "★ Com estrela"]]) +
        barras((todosGen ? gens : gens.slice(0, 8)).map(function (gn) {
          var x = r.gen[gn];
          return {rot: rotGen(gn), v: x.sel, v2: x.fav, val: "✓ " + mil(x.sel) + ' <i>·</i> ★ ' + mil(x.fav), tip: rotGen(gn) + ": " + plural(x.sel, "marcado", "marcados") + ", " + plural(x.fav, "com estrela", "com estrela")};
        }), {duplo: true}) +
        (gens.length > 8 ? '<div class="k-acoes"><button type="button" class="btn" data-k-gens aria-expanded="' + todosGen + '">' +
          (todosGen ? "Mostrar só os 8 primeiros" : "Ver os outros " + plural(gens.length - 8, "gênero", "gêneros")) + "</button></div>" : ""));
    }
    if (!r.nSeus) {
      h += card("Ainda sem jogos " + seusTxt, "", '<p class="k-vazio">Dê estrelas (★) ou marque jogos (✓) e os gráficos de romance, português, etiquetas e editoras aparecem aqui.</p>');
      return h + "</div></section>";
    }
    // romance
    var comRom = r.rom.sim + r.rom.opc + r.rom.leve, comRomCat = r.romCat.sim + r.romCat.opc + r.romCat.leve;
    h += card("Romance", "Nos " + plural(r.nSeus, "jogo " + seusTxt, "jogos " + seusTxt) + ".",
      '<div class="k-heroi"><b>' + pctTxt(comRom, r.nSeus) + "</b><span>têm algum romance</span></div>" +
      fatias([
        {rot: "♥ Romance central", v: r.rom.sim, c: "var(--k-r1)"}, {rot: "♥ Dá pra namorar", v: r.rom.opc, c: "var(--k-r2)"},
        {rot: "♡ Romance de fundo", v: r.rom.leve, c: "var(--k-r3)"}, {rot: "Sem romance", v: r.rom.nao, c: "var(--k-r4)"},
        {rot: "Não conferido", v: r.rom.nc, c: "var(--k-r5)"}
      ], r.nSeus, "Romance nos seus jogos") +
      '<p class="k-nota">No aparelho todo, ' + pctTxt(comRomCat, r.n) + " dos jogos têm romance." +
      (pctN(comRom, r.nSeus) > 1.5 * pctN(comRomCat, r.n) ? " <b>Você escolhe romance bem mais que o comum.</b>" : "") + "</p>");
    // português
    h += card("Português", "Nos " + plural(r.nSeus, "jogo " + seusTxt, "jogos " + seusTxt) + ".",
      '<div class="k-heroi"><b>' + pctTxt(r.idi.pt + r.idi.pronta, r.nSeus) + "</b><span>dá pra jogar em PT-BR</span></div>" +
      fatias([
        {rot: "PT-BR oficial", v: r.idi.pt, c: "var(--pt)"}, {rot: "Tradução pronta", v: r.idi.pronta, c: "var(--pronta)"}, {rot: "Sem PT-BR", v: r.idi.sem, c: "var(--sua)"}
      ], r.nSeus, "Português nos seus jogos") +
      '<p class="k-nota">No aparelho todo: ' + pctTxt(r.idiCat.pt, r.n) + " com PT-BR oficial e " + pctTxt(r.idiCat.pronta, r.n) + " com tradução pronta.</p>");
    // etiquetas
    var ets = Object.keys(r.et).filter(function (k) { return typeof ETIQ !== "undefined" && ETIQ[k]; }).sort(function (a, b) { return r.et[b] - r.et[a]; });
    if (ets.length) {
      var lift = ets.map(function (k) { return [k, (r.et[k] / Math.max(1, r.nEt)) / ((r.etCat[k] || 1) / Math.max(1, r.nEtCat))]; })
        .filter(function (x) { return r.et[x[0]] >= 3 && x[1] >= 1.5; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3);
      h += card("Etiquetas que mais aparecem", "Quantos dos seus jogos têm cada etiqueta.",
        barras(ets.slice(0, 10).map(function (k) {
          return {rot: ETIQ[k].label, v: r.et[k], val: mil(r.et[k]) + " <i>(" + pctTxt(r.et[k], r.nSeus) + ")</i>", tip: ETIQ[k].label + ": " + plural(r.et[k], "jogo", "jogos") + " seus; no aparelho todo, " + pctTxt(r.etCat[k] || 0, r.n)};
        })) +
        (lift.length ? '<p class="k-nota">Mais a sua cara que o comum: ' + lift.map(function (x) { return "<b>" + esc(ETIQ[x[0]].label) + "</b> (" + vezes(x[1]) + ")"; }).join(", ") + ".</p>" : ""));
    }
    // editoras
    var eds = Object.keys(r.ed).sort(function (a, b) { return r.ed[b] - r.ed[a] || (a < b ? -1 : 1); }).slice(0, 8);
    if (eds.length && r.ed[eds[0]] >= 2) {
      h += card("Editoras preferidas", "As que mais aparecem nos seus jogos.",
        barras(eds.filter(function (e) { return r.ed[e] >= 1; }).map(function (e) {
          return {rot: e, v: r.ed[e], val: mil(r.ed[e]), tip: e + ": " + plural(r.ed[e], "jogo seu", "jogos seus")};
        })));
    }
    // RPG
    var nR = r.rpg.grande + r.rpg.nicho;
    if (nR) {
      h += card("RPG retrô e de nicho", "Entre os seus " + plural(nR, "RPG", "RPGs") + ".",
        numeros([[mil(r.rpg.grande), "RPGs grandes"], [mil(r.rpg.nicho), "RPGs de nicho (retrô, indie)"], [pctTxt(r.rpg.px, nR), "em pixel art"], [pctTxt(r.rpg.tb, nR), "por turnos"]]) +
        '<p class="k-nota">' + (r.rpg.nicho >= r.rpg.grande ? "<b>Você curte mais os RPGs pequenos e retrô</b> do que os grandes e famosos." : "Os RPGs grandes ainda ganham dos de nicho na sua lista.") +
        (r.rpg.jr ? " " + plural(r.rpg.jr, "é JRPG", "são JRPG") + "." : "") + "</p>");
    }
    return h + "</div></section>";
  }

  function secCartao(r) {
    var cap = state.cap, capRot = (CAPS.filter(function (c) { return c.v === cap; })[0] || {}).label || gbTxt(cap), resto = cap - r.gbSel;
    var cabe = typeof smallestFit === "function" ? smallestFit(r.gbSel) : null;
    var h = '<section class="k-sec" id="k-s-cartao"><h3>Cartão</h3><div class="k-grade">';
    h += card("Espaço no cartão de " + esc(capRot), "Jogos marcados (✓), sem os vetados e os que não saíram.",
      '<div class="k-heroi"><b>' + gbTxt(r.gbSel) + "</b><span>de " + gbTxt(cap) + " livres · " + pctTxt(r.gbSel, cap) + "</span></div>" + medidor(r.gbSel, cap) +
      '<p class="k-nota">' + (resto >= 0 ? "Sobram <b>" + gbTxt(resto) + "</b>." : "⚠ <b>Passa " + gbTxt(-resto) + "</b> do cartão.") +
      (cabe && cabe !== capRot ? " Os " + plural(r.nSelGB, "jogo marcado", "jogos marcados") + " caberiam num cartão de " + esc(cabe) + "." : !cabe && r.nSelGB ? " Não cabem nem no maior cartão." : "") + "</p>");
    if (r.maiores.length) {
      h += card("Maiores jogos marcados", "Toque num jogo para abrir a ficha.",
        barras(r.maiores.map(function (g) {
          return {rot: g.n, v: g.g, val: gbTxt(g.g), tip: g.n + ": " + gbTxt(g.g) + " (" + pctTxt(g.g, cap) + " do cartão)", id: g.id};
        })));
      var gg = Object.keys(r.gbGen).sort(function (a, b) { return r.gbGen[b] - r.gbGen[a]; }).slice(0, 6);
      h += card("O que mais ocupa", "GB marcados por gênero.",
        barras(gg.map(function (gn) { return {rot: rotGen(gn), v: r.gbGen[gn], val: gbTxt(r.gbGen[gn]) + " <i>(" + pctTxt(r.gbGen[gn], r.gbSel) + ")</i>", tip: rotGen(gn) + ": " + gbTxt(r.gbGen[gn])}; }), {cor: "var(--k-1)"}));
    }
    return h + "</div></section>";
  }

  function diaChave(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function ddmm(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); }
  function baldes(his, filtro) {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var b = [], idx = {}, i, n = tempo === "dia" ? 30 : 12;
    if (tempo === "dia") {
      for (i = n - 1; i >= 0; i--) { var d = new Date(hoje); d.setDate(hoje.getDate() - i); idx[diaChave(d)] = b.length; b.push({d: d, v: 0}); }
    } else {
      var seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));   // semana começa na segunda
      for (i = n - 1; i >= 0; i--) { var s = new Date(seg); s.setDate(seg.getDate() - 7 * i); b.push({d: s, v: 0}); }
    }
    var ini = b[0].d.getTime();
    for (i = 0; i < his.length; i++) {
      var e = his[i];
      if (!(e.t >= ini)) continue;
      var q = filtro(e);
      if (!q) continue;
      var k;
      if (tempo === "dia") k = idx[diaChave(new Date(e.t))];
      else k = Math.floor((e.t - ini) / (7 * 864e5));
      if (k >= 0 && k < b.length) b[k].v += q;
    }
    return b;
  }
  function rotBalde(x) {
    if (tempo === "dia") return ddmm(x.d);
    return ddmm(x.d);
  }
  function tipBalde(x, um, varios) {
    var quando = tempo === "dia" ? (FD || (FD = new Intl.DateTimeFormat("pt-BR", {weekday: "short", day: "numeric", month: "short"}))).format(x.d) : "Semana de " + ddmm(x.d);
    return quando + ": " + plural(x.v, um, varios);
  }

  function secAtividade(r) {
    var nao = ler(KEY + "-T-nao", []), dep = ler(KEY + "-T-depois", {}), hj = ler(KEY + "-T-hoje", {});
    var nNao = Array.isArray(nao) ? nao.length : 0, nDep = dep && typeof dep === "object" ? Object.keys(dep).filter(function (id) { return Date.now() - dep[id] < 7 * 864e5; }).length : 0;
    var d = new Date(), hs = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(), nHoje = hj && hj.d === hs ? hj.n || 0 : 0;
    var h = '<section class="k-sec" id="k-s-ativ"><h3>Atividade</h3><div class="k-grade">';
    h += card("🃏 Modo Avaliar", "Arrastar pra direita dá estrela; pra esquerda dispensa.",
      numeros([[mil(nHoje), "avaliações hoje"], [mil(r.nFav), "★ estrelas no total"], [mil(nNao), "✖ não quero"], [mil(nDep), "⏭ pra depois"]]) +
      '<div class="k-acoes"><button type="button" class="btn" data-k-avaliar>🃏 Avaliar jogos agora</button></div>');
    h += card("Seus planos", "Os botões da ficha: ▶ Quero jogar, ✎ Quero traduzir, ✓ Já joguei.",
      numeros([[mil(r.plano.w), "▶ quero jogar"], [mil(r.plano.q), "✎ quero traduzir"], [mil(r.plano.j), "✓ já joguei"]]));
    // linha do tempo
    var his = r.his;
    var seg = '<div class="k-seg" role="group" aria-label="Agrupar por">' + [["dia", "Últimos 30 dias"], ["semana", "Últimas 12 semanas"]].map(function (t) {
      return '<button type="button" class="btn" data-k-tempo="' + t[0] + '" aria-pressed="' + (tempo === t[0]) + '">' + t[1] + "</button>";
    }).join("") + "</div>";
    if (!his.length) {
      h += card("Linha do tempo", "", '<p class="k-vazio">Nada ainda. Abra fichas e dê estrelas: tudo vai aparecendo aqui, por dia e por semana.</p>', true);
    } else {
      var bF = baldes(his, function (e) { return e.a === "ficha" ? 1 : 0; });
      var bE = baldes(his, function (e) { return e.a === "estrela" ? 1 : e.a === "estrela-varios" ? (+e.x || 0) : 0; });
      var sF = bF.reduce(function (s, x) { return s + x.v; }, 0), sE = bE.reduce(function (s, x) { return s + x.v; }, 0);
      var periodo = tempo === "dia" ? "nos últimos 30 dias" : "nas últimas 12 semanas";
      // horário e dia da semana em que você mais usa
      var porHora = new Array(24).fill(0), porDia = new Array(7).fill(0), nUso = 0;
      his.forEach(function (e) { if (e.a === "busca") return; var t = new Date(e.t); porHora[t.getHours()]++; porDia[t.getDay()]++; nUso++; });
      var hM = porHora.indexOf(Math.max.apply(null, porHora)), dM = porDia.indexOf(Math.max.apply(null, porDia));
      var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
      h += card("Linha do tempo", "Fichas que você abriu e estrelas que deu, neste aparelho.", seg +
        '<p class="k-nota"><b>' + plural(sF, "ficha aberta", "fichas abertas") + "</b> " + periodo + "</p>" +
        colunas(bF.map(function (x) { return {rot: rotBalde(x), v: x.v, tip: tipBalde(x, "ficha aberta", "fichas abertas")}; }), "var(--k-3)", "Fichas abertas " + periodo + ": " + mil(sF)) +
        '<p class="k-nota"><b>' + plural(sE, "estrela dada", "estrelas dadas") + "</b> " + periodo + "</p>" +
        colunas(bE.map(function (x) { return {rot: rotBalde(x), v: x.v, tip: tipBalde(x, "estrela", "estrelas")}; }), "var(--k-2)", "Estrelas dadas " + periodo + ": " + mil(sE)) +
        (nUso >= 5 ? '<p class="k-nota">Você mais usa a Estante <b>' + (hM === 0 ? "à meia-noite" : "por volta das " + hM + "h") + "</b>, e o dia mais movimentado é <b>" + DIAS[dM] + "</b>.</p>" : ""), true);
      // fichas mais abertas
      var cont = {};
      his.forEach(function (e) { if (e.a === "ficha" && e.id) cont[e.id] = (cont[e.id] || 0) + 1; });
      var mais = Object.keys(cont).filter(function (id) { return r.porId[id]; }).sort(function (a, b) { return cont[b] - cont[a]; }).slice(0, 6);
      if (mais.length) {
        h += card("Fichas que você mais abriu", "Toque para abrir de novo.",
          barras(mais.map(function (id) { var g = r.porId[id]; return {rot: g.n, v: cont[id], val: plural(cont[id], "vez", "vezes"), tip: g.n + ": aberta " + plural(cont[id], "vez", "vezes"), id: id}; }), {cor: "var(--k-3)"}));
      }
    }
    var pls = (state.pls || []).filter(function (p) { return p.j.length; });
    if (pls.length) {
      h += card("🎵 Playlists", plural(pls.length, "playlist", "playlists") + " com jogos.",
        barras(pls.slice().sort(function (a, b) { return b.j.length - a.j.length; }).slice(0, 10).map(function (p) {
          var gb = 0; p.j.forEach(function (id) { var g = r.porId[id]; if (g && g.g) gb += g.g; });
          return {rot: p.n, v: p.j.length, val: plural(p.j.length, "jogo", "jogos") + (gb ? " <i>· " + gbTxt(gb) + "</i>" : ""), tip: p.n + ": " + plural(p.j.length, "jogo", "jogos") + (gb ? ", " + gbTxt(gb) : "")};
        })));
    } else if ((state.pls || []).length) {
      h += card("🎵 Playlists", "", '<p class="k-vazio">Suas playlists ainda estão vazias.</p>');
    }
    return h + "</div></section>";
  }

  // ---------- traduções: os dados privados do tradutor (mod_V_tradutor.js), lidos com tolerância ----------
  function dataDe(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return new Date(v < 1e11 ? v * 1000 : v);
    var s = String(v), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    var d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function numDe(v) { if (Array.isArray(v)) return v.length; var n = +v; return isFinite(n) && n > 0 ? n : 0; }
  function lerTraducoes() {
    var bruto = null;
    try { if (typeof window.V_dados === "function") bruto = window.V_dados(); } catch (e) { bruto = null; }
    if (!bruto || typeof bruto !== "object") return null;
    var lista = Array.isArray(bruto) ? bruto : null;
    if (!lista) ["traducoes", "traduções", "lista", "jogos", "itens", "projetos"].some(function (k) { if (Array.isArray(bruto[k])) { lista = bruto[k]; return true; } return false; });
    if (!lista) lista = Object.keys(bruto).map(function (k) { var o = bruto[k]; return o && typeof o === "object" && !Array.isArray(o) ? Object.assign({id: k}, o) : null; }).filter(Boolean);
    var t = {n: 0, prontas: 0, normal: 0, humorada: 0, textos: 0, meses: {}, semData: 0};
    lista.forEach(function (it) {
      if (!it || typeof it !== "object") return;
      t.n++;
      var st = String(it.status || it.estado || it.fase || it.situacao || "");
      var pronta = it.pronta === true || it.pronto === true || it.feita === true || /pront|^ok$|feit|termin|conclu|nsp/i.test(st);
      if (pronta) t.prontas++;
      var vs = Array.isArray(it.versoes) ? it.versoes.join(" ") : String(it.versao || it.tipo || it.modo || it.v || it.estilo || "");
      var hum = it.humorada === true || /humor|zoeira|zueira|piada/i.test(vs), nor = it.normal === true || /normal|s[eé]ri/i.test(vs);
      if (hum) t.humorada++;
      if (nor || !hum) t.normal++;
      t.textos += numDe(it.textos != null ? it.textos : it.linhas != null ? it.linhas : it.strings != null ? it.strings : it.frases != null ? it.frases : it.total);
      var d = dataDe(it.data || it.fim || it.terminado || it.pronta_em || it.quando || it.atualizado || it.criado || it.t);
      if (d) { var k = d.getFullYear() * 12 + d.getMonth(); t.meses[k] = (t.meses[k] || 0) + 1; } else t.semData++;
    });
    return t;
  }
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function secTraducoes(r) {
    var h = '<section class="k-sec" id="k-s-trad"><h3>Traduções</h3><div class="k-grade">';
    var t = lerTraducoes();
    if (!t) {
      h += card("Suas traduções", "", '<p class="k-vazio">Importe seus dados em <b>📚 Minhas traduções</b> para ver aqui quantas traduções você fez, as prontas, por mês, normal e humorada, e o total de textos.</p>');
    } else if (!t.n) {
      h += card("Suas traduções", "", '<p class="k-vazio">Os dados do tradutor estão aqui, mas ainda sem nenhuma tradução.</p>');
    } else {
      h += card("Suas traduções", "Dos dados que você importou em 📚 Minhas traduções.",
        numeros([[mil(t.n), "traduções"], [mil(t.prontas) + " <small>(" + pctTxt(t.prontas, t.n) + ")</small>", "prontas"], [t.textos ? mil(t.textos) : "—", "textos traduzidos"]]) +
        (t.humorada ? '<p class="k-nota"><b>Normal x humorada</b></p>' + fatias([{rot: "Versão normal", v: t.normal, c: "var(--k-1)"}, {rot: "Versão humorada", v: t.humorada, c: "var(--k-2)"}], t.normal + t.humorada, "Versões normal e humorada") : ""));
      var ks = Object.keys(t.meses).map(Number);
      if (ks.length) {
        var agora = new Date(), fim = agora.getFullYear() * 12 + agora.getMonth(), b = [];
        for (var k = fim - 11; k <= fim; k++) b.push({rot: MESES[k % 12] + "/" + String(Math.floor(k / 12)).slice(2), v: t.meses[k] || 0, tip: MESES[k % 12] + " de " + Math.floor(k / 12) + ": " + plural(t.meses[k] || 0, "tradução", "traduções")});
        h += card("Por mês", "Últimos 12 meses" + (t.semData ? " (" + plural(t.semData, "tradução sem data ficou", "traduções sem data ficaram") + " de fora)" : "") + ".",
          colunas(b, "var(--k-1)", "Traduções por mês"));
      }
    }
    var nMt = r.mt.pc + r.mt.rev + r.mt.ok;
    h += card("Na Estante", "O que você marcou como sua tradução nas fichas.",
      nMt || r.plano.q ? numeros([[mil(r.plano.q), "✎ quero traduzir"], [mil(r.mt.pc), "traduzindo no PC"], [mil(r.mt.rev), "revisando"], [mil(r.mt.ok), "prontas pro Switch"]])
        : '<p class="k-vazio">Nenhum jogo marcado como sua tradução ainda.</p>');
    return h + "</div></section>";
  }

  // ---------- a tela ----------
  var tela = document.createElement("div");
  tela.className = "k-tela"; tela.hidden = true;
  var dlg = document.createElement("div");
  dlg.id = "k-dlg"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-labelledby", "k-tit");
  tela.appendChild(dlg);
  dlg.innerHTML = '<div class="k-cab"><div class="k-topo"><h2 id="k-tit">📊 Suas estatísticas</h2><button type="button" class="p-x" data-k-fechar aria-label="Fechar">✕</button></div>' +
    '<nav class="k-nav" aria-label="Partes">' + [["gosto", "Gosto"], ["cartao", "Cartão"], ["ativ", "Atividade"], ["trad", "Traduções"]].map(function (s, i) {
      return '<button type="button" class="btn" data-k-ir="' + s[0] + '"' + (i ? "" : ' aria-current="true"') + ">" + s[1] + "</button>";
    }).join("") + '</nav></div><div class="k-corpo" tabindex="-1"></div><div id="k-tip" role="tooltip"></div>';
  document.body.appendChild(tela);
  var aberto = false;
  var nav = dlg.querySelector(".k-nav");
  var corpo = dlg.querySelector(".k-corpo"), tip = dlg.querySelector("#k-tip");

  function render() {
    var t0 = performance.now(), y = corpo.firstChild ? corpo.scrollTop : 0;
    desenhos = []; nClip = 0;
    var r = calcular(), t1 = performance.now();
    var aviso = window.CAT_CARREGANDO ? '<p class="k-aviso">O catálogo ainda está chegando: os números se atualizam sozinhos quando ele terminar.</p>' : "";
    corpo.innerHTML = aviso + secGosto(r) + secCartao(r) + secAtividade(r) + secTraducoes(r) +
      '<p class="k-rodape">Calculado agora com os ' + mil(r.n) + " jogos deste aparelho. Nada sai daqui. Não existem nos dados: jogos zerados e horas jogadas; o que conta é o ✓ Já joguei da ficha.</p>";
    var t2 = performance.now();
    if (y) corpo.scrollTop = y;   // (só quando redesenha com a tela já rolada: ler/gravar a rolagem força uma montagem)
    if (aberto) pintar();
    window.K_TEMPO = Math.round(performance.now() - t0);
    window.K_PARTES = {contas: Math.round(t1 - t0), html: Math.round(t2 - t1), graficos: Math.round(performance.now() - t2)};
  }
  function abrir() {
    if (aberto) return;
    var t0 = performance.now();
    aberto = true; tela.hidden = false;
    nav.querySelectorAll("[data-k-ir]").forEach(function (b, i) { if (i) b.removeAttribute("aria-current"); else b.setAttribute("aria-current", "true"); });
    render();
    try { history.pushState({kEst: 1}, ""); empurrou = true; } catch (e) { empurrou = false; }
    window.K_ABRIR_MS = Math.round(performance.now() - t0);
    requestAnimationFrame(function () { if (aberto) try { corpo.focus({preventScroll: true}); } catch (e) {} });
  }
  var empurrou = false;
  function fechar() {
    if (!aberto) return;
    aberto = false; tela.hidden = true; if (io) io.disconnect(); corpo.textContent = ""; desenhos = [];
    esconder();
    if (empurrou) { empurrou = false; if (history.state && history.state.kEst) try { history.back(); } catch (e) {} }
    var b = document.getElementById("k-abrir");
    if (b) try { b.focus({preventScroll: true}); } catch (e) {}
  }
  window.K_aberto = function () { return aberto; };
  window.addEventListener("popstate", function () {
    // a ficha aberta por cima fecha primeiro (o voltar dela tira o estado dela; o nosso continua)
    if (aberto && !(history.state && history.state.kEst)) { empurrou = false; fechar(); }
  });
  document.addEventListener("estante-catalogo", function () { if (aberto) render(); });
  function algumDialogo() { return !!document.querySelector("dialog[open]"); }
  document.addEventListener("keydown", function (e) {
    if (aberto && e.key === "Escape" && !algumDialogo()) { e.preventDefault(); fechar(); }
  });
  // o foco fica dentro da tela enquanto ela está aberta (menos quando a ficha abre por cima)
  document.addEventListener("focusin", function (e) {
    if (aberto && !algumDialogo() && !tela.contains(e.target)) try { corpo.focus({preventScroll: true}); } catch (er) {}
  });

  function marcarNav() {
    var secs = corpo.querySelectorAll(".k-sec"), atual = "gosto", lim = corpo.getBoundingClientRect().top + 60;
    for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= lim) atual = secs[i].id.replace("k-s-", "");
    if (corpo.scrollTop + corpo.clientHeight >= corpo.scrollHeight - 4 && secs.length) atual = secs[secs.length - 1].id.replace("k-s-", "");
    nav.querySelectorAll("[data-k-ir]").forEach(function (b) { if (b.dataset.kIr === atual) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
  }
  var navT = 0;
  corpo.addEventListener("scroll", function () { esconder(); if (!navT) navT = requestAnimationFrame(function () { navT = 0; marcarNav(); }); }, {passive: true});

  // a roda do mouse fora do painel não rola a lista de trás
  tela.addEventListener("wheel", function (e) { if (e.target === tela) e.preventDefault(); }, {passive: false});
  tela.addEventListener("click", function (e) {
    if (e.target === tela) { fechar(); return; }
    var b = e.target.closest ? e.target.closest("button") : null;
    if (!b) {
      var alvo = e.target.closest ? e.target.closest("[data-tip]") : null;
      if (alvo && alvo.getAttribute("data-tip")) { mostrar(alvo, e.clientX, e.clientY); clearTimeout(tipT); tipT = setTimeout(esconder, 2600); }
      return;
    }
    if (b.hasAttribute("data-k-fechar")) { fechar(); return; }
    if (b.dataset.kIr) {
      var s = document.getElementById("k-s-" + b.dataset.kIr);
      if (s) corpo.scrollTo({top: s.offsetTop - corpo.offsetTop - 8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
      return;
    }
    if (b.hasAttribute("data-k-gens")) { todosGen = !todosGen; render(); return; }
    if (b.dataset.kModo) { modo = b.dataset.kModo; gravar(KM, modo); render(); return; }
    if (b.dataset.kTempo) { tempo = b.dataset.kTempo; gravar(KT, tempo); render(); return; }
    if (b.dataset.kFicha) { esconder(); try { abrirFicha(b.dataset.kFicha); } catch (er) {} return; }
    if (b.hasAttribute("data-k-avaliar")) {
      // espera o voltar da nossa tela terminar antes do Avaliar empurrar o dele
      var foi = false, vai = function () { if (foi) return; foi = true; removeEventListener("popstate", vai); if (window.T_abrir) window.T_abrir(); };
      addEventListener("popstate", vai);
      fechar();
      setTimeout(vai, 400);
    }
  });
  // dica ao passar o mouse (no toque: tocar mostra por um tempo)
  var tipT = 0, tipEl = null;
  function mostrar(el, x, y) {
    tip.textContent = el.getAttribute("data-tip");
    tip.classList.add("on");
    var w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth;
    var l = Math.max(8, Math.min(vw - w - 8, x - w / 2)), t = y - h - 12;
    if (t < 8) t = y + 18;
    tip.style.left = l + "px"; tip.style.top = t + "px";
    tipEl = el;
  }
  function esconder() { tip.classList.remove("on"); tipEl = null; }
  dlg.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el && el.getAttribute("data-tip")) mostrar(el, e.clientX, e.clientY); else if (tipEl) esconder();
  });
  dlg.addEventListener("pointerleave", esconder);
  var rzT = 0;
  window.addEventListener("resize", function () { if (!aberto) return; clearTimeout(rzT); rzT = setTimeout(function () {
    corpo.querySelectorAll("[data-k-ok]").forEach(function (c) { c.removeAttribute("data-k-ok"); });
    pintar();
  }, 150); });

  // ---------- botão no topo, junto dos outros ----------
  function botao() {
    if (document.getElementById("k-abrir")) return;
    var caixa = document.getElementById("p-pac");
    if (!caixa) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn k-abrir"; b.id = "k-abrir"; b.textContent = "📊 Estatísticas";
    b.setAttribute("aria-haspopup", "dialog");
    b.addEventListener("click", abrir);
    var ha = document.getElementById("t-abrir") || document.getElementById("s-abrir") || document.getElementById("p-abrir");
    if (ha && ha.parentNode === caixa) ha.insertAdjacentElement("afterend", b); else caixa.appendChild(b);
  }
  botao();
  window.K_abrir = abrir;
})();

