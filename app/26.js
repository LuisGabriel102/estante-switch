/* mod_L_navegar.js */
// 26/11 (agL): navegação em CATÁLOGO, como app de loja no celular.
//  - Tela inicial que só rola pra baixo (pedido de 26/11: nada de fileira de lado): seções em grade de capas (2 linhas:
//    6 no celular, ~10 no PC) — Continuar, Seus interesses, Mais a sua cara, Joias escondidas, Suas traduções, playlists —
//    e uma seção "Gêneros" com quadradinhos (ícone, nome, quantos) em vez de 24 fileiras. "Ver tudo ›" abre o catálogo.
//  - Catálogo: tela própria em grade de capas, com título, contagem, ordem (Mais a sua cara / Nota / Nome / Mais novos),
//    os filtros ligados em chips (tocar tira) e "carregar mais" sozinho ao rolar. O voltar do celular volta (history).
//  - Gênero direto: tocar num gênero (prateleira, menu do alto da lista, seletor antigo, gênero escrito na ficha)
//    abre o catálogo daquele gênero, rolado pro topo.
//  - Filtros numa folha só (de baixo no celular, painel do lado no PC), com seções curtas e "Mostrar N jogos".
//    Por baixo, mexe no MESMO state de sempre (state.genre, state.rom, state.idioma, state.size, state.dur, os chips do
//    mod_B, as etiquetas do mod_Q, o "Só as joias" do mod_J): busca, sessão, sincronizar e "Mais a sua cara" continuam iguais.
//  - A lista antiga continua na aba "☰ Lista completa". Enquanto o catálogo está na tela, a lista antiga não é
//    redesenhada (custava ~0,8 s no celular a cada filtro); ela é refeita na hora em que você abre a aba.
// Fica antes do mod_F_busca.js (a busca embrulha o renderList daqui). Ganchos pra outros módulos e testes: window.L_nav,
// window.L_IDS() (a ordem dos jogos da tela atual, pras setas da ficha do mod_B2; ver montar_app.py).
(function () {
  "use strict";
  var H = document.documentElement;
  if (typeof DATA === "undefined" || typeof state === "undefined" || typeof renderList !== "function") { H.classList.remove("l-on"); return; }
  H.classList.add("l-on");

  var PASSO = 24;            // capas por vez no catálogo
  var LINHAS_HOME = 2;       // linhas de capas em cada seção da tela inicial
  var KO = KEY + "-L-ordem", KN = KEY + "-L-nota";
  function ler(k, p) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? p : v; } catch (e) { return p; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function mil(n) { return Number(n).toLocaleString("pt-BR"); }
  function jogos(n) { return mil(n) + (n === 1 ? " jogo" : " jogos"); }
  function reduz() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  var T = window.L_TEMPOS = {};

  // ---------- estilo ----------
  var css = document.createElement("style");
  css.id = "l-css";
  css.textContent = [
    // o que fica escondido com o catálogo na tela (os elementos continuam no DOM: os outros módulos usam)
    "html.l-on:not(.l-lista) main.wrap > :not(header):not(#l-raiz):not(#aviso-capas) { display: none !important; }",
    "html.l-on:not(.l-lista) #sub, html.l-on:not(.l-lista) #resumo, html.l-on:not(.l-lista) #p-pac > .btn, html.l-on:not(.l-lista) header .n-lugar, html.l-on:not(.l-lista) header .c-topo, html.l-on:not(.l-lista) #a-busca-fixa { display: none !important; }",
    "html.l-on:not(.l-lista) header h1 { font-size: 26px; margin: 0; }",
    "html.l-on:not(.l-lista) #p-pac:not(:has(> :not(.btn))) { display: none; }",
    "html.l-on:not(.l-lista) #p-pac .p-txt { font-size: 13px; margin: 2px 0 0; }",
    // na lista antiga: os chips rápidos e a fileira de etiquetas viraram a folha de filtros
    "html.l-on .chips-b, html.l-on #etq-bar { display: none !important; }",
    "html.l-on.l-lista #l-raiz > :not(.l-abas) { display: none !important; }",
    "#l-raiz { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; min-width: 0; max-width: 100%; }",
    "#l-home, #l-col { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; }",
    "#l-raiz[hidden], #l-raiz [hidden] { display: none !important; }",
    // abas
    ".l-abas { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); }",
    ".l-abas button { font: inherit; font-weight: 700; font-size: 15px; min-height: 42px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; }",
    ".l-abas button[aria-selected=true] { background: var(--accent); color: var(--accent-ink); }",
    "#l-raiz.l-em-col .l-abas { display: none; }",
    "html.l-lista #l-raiz .l-abas { display: grid; }",
    // barra presa no alto: voltar, busca, filtros e os filtros ligados
    ".l-barra { position: sticky; top: 0; z-index: 6; margin: 0 -16px; padding: 8px 16px 8px; background: var(--bg); box-shadow: 0 6px 10px -10px rgba(0,0,0,.35); }",
    "@media (min-width: 700px) { .l-barra { margin: 0 -20px; padding: 10px 20px; } }",
    ".l-linha { display: flex; gap: 8px; align-items: center; }",
    ".l-voltar { flex: none; width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 26px; line-height: 1; cursor: pointer; }",
    ".l-busca { flex: 1; min-width: 0; position: relative; }",
    ".l-busca input { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px; min-height: 44px; padding: 8px 12px 8px 38px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }",
    ".l-busca::before { content: '🔎'; position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; opacity: .7; pointer-events: none; }",
    ".l-fbtn { flex: none; font: inherit; font-weight: 700; min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }",
    ".l-fbtn .l-fn:not(:empty) { min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 13px; display: inline-grid; place-items: center; }",
    ".l-ativos { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 2px; }",
    ".l-ativos::-webkit-scrollbar { display: none; }",
    ".l-ativos:empty { display: none; }",
    ".l-chip { flex: none; font: inherit; font-size: 14px; font-weight: 600; min-height: 36px; padding: 2px 8px 2px 12px; border-radius: 999px; border: 1px solid var(--accent); background: var(--accent-soft); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }",
    ".l-chip .x { font-size: 13px; width: 20px; height: 20px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--accent); color: var(--accent-ink); }",
    ".l-chip.l-limpa { border-style: dashed; background: transparent; color: var(--accent); padding: 2px 12px; }",
    "#filtros .l-ativos { flex-basis: 100%; }",
    // atalhos
    ".l-atalhos { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 4px; }",
    ".l-atalhos button { flex: none; font: inherit; font-size: 13px; font-weight: 600; min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; white-space: nowrap; }",
    ".l-todos { width: 100%; font: inherit; font-weight: 700; font-size: 15px; min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--accent); cursor: pointer; text-align: left; padding: 0 16px; display: flex; justify-content: space-between; align-items: center; }",
    ".l-aviso { margin: 0; padding: 10px 14px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); color: var(--muted); font-size: 14px; }",
    // prateleiras
    ".l-prat { margin: 0; }",
    ".l-prat:not([data-n]) { min-height: var(--l-ph, 262px); }",
    ".l-prat[data-n] { content-visibility: auto; contain-intrinsic-size: auto var(--l-ph, 262px); }",
    ".l-calc { margin: 0; padding: 40px 4px; color: var(--muted); font-size: 14px; }",
    ".l-prat-cab { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; min-height: 40px; }",
    ".l-prat-cab h2 { margin: 0; flex: 1; min-width: 0; font-family: var(--font-display); font-size: 19px; line-height: 1.2; }",
    ".l-prat-cab h2 button { font: inherit; color: var(--ink); background: none; border: 0; padding: 0; cursor: pointer; text-align: left; display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }",
    ".l-prat-cab h2 svg { width: 22px; height: 22px; flex: none; color: var(--accent); }",
    ".l-prat-cab .n { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--muted); white-space: nowrap; }",
    ".l-vt-link { flex: none; font: inherit; font-size: 14px; font-weight: 700; color: var(--accent); background: none; border: 0; padding: 8px 4px 8px 10px; cursor: pointer; min-height: 40px; white-space: nowrap; }",
    ".l-mini { display: grid; grid-template-columns: repeat(var(--l-hc, 3), minmax(0, 1fr)); gap: 12px 8px; }",
    ".l-mini .vit-item { min-width: 0; }",
    ".l-mini .vit-card { width: 100%; }",
    ".l-mini .vit-card .cover { width: 100%; }",
    ".l-prat .capa-nome, .l-grade .capa-nome { min-height: 2.5em; }",
    "@media (max-width: 699px) {",
    "  .l-mini .vit-card .capa-nome { font-size: 12.5px; }",
    "  .l-mini .fav-capa, .l-mini .pl-rapido { width: 26px; height: 26px; font-size: 14px; top: 5px; }",
    "  .l-mini .fav-capa { left: 5px; } .l-mini .pl-rapido { right: 5px; }",
    "  .l-mini .selos { left: 3px; right: 3px; bottom: 3px; gap: 2px; }",
    "  .l-mini .selo { font-size: 10px; padding: 0 4px; }",
    "  .l-mini .selos .selo:nth-child(n+4) { display: none; }",
    "}",
    // gêneros em quadradinhos
    ".l-gens { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }",
    "@media (min-width: 700px) { .l-gens { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }",
    ".l-gen-t { font: inherit; text-align: left; cursor: pointer; display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 2px 10px; min-height: 58px; padding: 8px 12px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }",
    ".l-gen-t svg { grid-row: span 2; width: 30px; height: 30px; color: var(--accent); }",
    ".l-gen-t b { font-size: 14px; line-height: 1.2; }",
    ".l-gen-t small { font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }",
    ".l-gen-t:hover { border-color: var(--accent); }",
    // catálogo
    ".l-col-cab { display: grid; gap: 4px; }",
    ".l-col-cab h2 { margin: 0; font-family: var(--font-display); font-size: 26px; line-height: 1.15; display: flex; align-items: center; gap: 10px; }",
    ".l-col-cab h2 svg { width: 28px; height: 28px; flex: none; color: var(--accent); }",
    ".l-col-sub { margin: 0; color: var(--muted); font-size: 14px; }",
    ".l-col-sub strong { color: var(--ink); }",
    ".l-ordem { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0; align-items: center; }",
    ".l-ordem::-webkit-scrollbar { display: none; }",
    ".l-ordem .rot { flex: none; font-size: 13px; font-weight: 700; color: var(--muted); }",
    ".l-ordem button { flex: none; font: inherit; font-size: 14px; font-weight: 600; min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; white-space: nowrap; }",
    ".l-ordem button[aria-pressed=true] { background: var(--ink); border-color: var(--ink); color: var(--bg); }",
    ".l-grade { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; }",
    "html[data-cols='1'] .l-grade { grid-template-columns: minmax(0, 1fr); }",
    "html[data-cols='3'] .l-grade { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 8px; }",
    "html[data-cols='4'] .l-grade { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 6px; }",
    "@media (min-width: 700px) { .l-grade, html[data-cols] .l-grade { grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 18px 14px; } }",
    ".l-grade .vit-item { min-width: 0; content-visibility: auto; contain-intrinsic-size: auto 250px; }",
    ".l-grade .vit-card { width: 100%; }",
    ".l-grade .vit-card .cover { width: 100%; }",
    ".l-mais { font: inherit; font-weight: 700; min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; margin-top: 6px; }",
    ".l-vazio { padding: 22px 16px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); text-align: center; display: grid; gap: 10px; justify-items: center; }",
    ".l-vazio p { margin: 0; }",
    ".l-btn { font: inherit; font-weight: 700; min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-ink); cursor: pointer; }",
    ".l-sug { margin: 0; padding: 12px 14px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); line-height: 1.5; }",
    ".l-sug button { font: inherit; font-weight: 700; color: var(--accent-ink); background: var(--accent); border: 0; border-radius: 999px; padding: 2px 12px; min-height: 32px; cursor: pointer; }",
    // gênero clicável na ficha
    "#l-col-tit:focus { outline: none; }",
    "#ficha .gen.l-gen { color: var(--accent); cursor: pointer; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }",
    "#ficha .gen.l-gen::after { content: ' ›'; }",
    "#ficha .gen.l-gen:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 4px; }",
    // folha de filtros
    "#l-folha { padding: 0; border: 0; background: transparent; color: var(--ink); max-width: none; max-height: none; margin: 0; overflow: visible; }",
    "#l-folha:modal { top: auto; bottom: 0; left: 0; right: 0; width: 100%; }",
    "#l-folha::backdrop { background: rgba(8,12,20,.55); }",
    ".l-f-in { box-sizing: border-box; max-height: 88dvh; display: flex; flex-direction: column; background: var(--surface); border-radius: 20px 20px 0 0; box-shadow: 0 -10px 40px rgba(0,0,0,.3); }",
    ".l-f-cab { display: flex; align-items: center; gap: 8px; padding: 10px 12px 8px 18px; border-bottom: 1px solid var(--line); position: relative; }",
    ".l-f-cab::before { content: ''; position: absolute; top: 5px; left: 50%; width: 40px; height: 4px; margin-left: -20px; border-radius: 4px; background: var(--line); }",
    ".l-f-cab h2 { margin: 6px 0 0; flex: 1; font-family: var(--font-display); font-size: 21px; }",
    ".l-f-x { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--bg); color: var(--ink); font-size: 18px; cursor: pointer; }",
    ".l-f-corpo { overflow-y: auto; overscroll-behavior: contain; padding: 4px 18px 12px; }",
    ".l-f-sec { padding: 12px 0 8px; border-bottom: 1px solid var(--line); }",
    ".l-f-sec:last-child { border-bottom: 0; }",
    ".l-f-sec h3 { margin: 0 0 8px; font-size: 15px; }",
    ".l-f-calc { margin: 6px 0 0; color: var(--muted); font-size: 13px; }",
    ".l-f-sec h3 small { font-weight: 500; color: var(--muted); font-size: 13px; }",
    ".l-f-sec h4 { margin: 8px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }",
    ".l-pills { display: flex; flex-wrap: wrap; gap: 6px; }",
    ".l-pills button { font: inherit; font-size: 14px; font-weight: 600; min-height: 38px; padding: 2px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }",
    ".l-pills button .n { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }",
    ".l-pills button[aria-pressed=true] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }",
    ".l-pills button[aria-pressed=true] .n { color: inherit; opacity: .85; }",
    ".l-pills button.zero { opacity: .5; }",
    ".l-f-pe { display: flex; gap: 10px; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); }",
    ".l-f-pe button { font: inherit; font-weight: 700; min-height: 50px; border-radius: 14px; cursor: pointer; }",
    ".l-f-limpar { flex: none; padding: 0 16px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }",
    ".l-f-ok { flex: 1; border: 0; background: var(--accent); color: var(--accent-ink); font-size: 16px; }",
    "@media (min-width: 700px) {",
    "  #l-folha:modal { top: 0; bottom: 0; left: auto; right: 0; width: 440px; height: 100dvh; }",
    "  .l-f-in { height: 100%; max-height: none; border-radius: 0; box-shadow: -10px 0 40px rgba(0,0,0,.3); }",
    "  .l-f-cab::before { display: none; }",
    "}"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- jogos por id (e os que chegam do catálogo) ----------
  var porId = {};
  DATA.forEach(function (g) { porId[g.id] = g; }); (window.CAT_AO_CRESCER || []).push(function (novos) { novos.forEach(function (g) { porId[g.id] = g; }); });   // (numa linha só: o montar_app.py não inscreve de novo)

  function nt(g) { var e = EXTRA[g.id]; return (e && e.nt) || 0; }
  function gostoR(g) { try { return window.notaGosto ? notaGosto(g) : null; } catch (e) { return null; } }
  function gosto(g) { var r = gostoR(g); return r ? r.n : 50; }
  function ehJoia(g) { try { return !!(window.J_ehJoia && J_ehJoia(g.id)); } catch (e) { return false; } }
  function plAt() { try { return typeof playlistAtiva === "function" ? playlistAtiva() : null; } catch (e) { return null; } }
  function qAtual() { return norm((state.q || "").trim()); }

  // ---------- filtros: os mesmos do renderList (01.js), mais a nota daqui ----------
  state.lNota = [70, 80, 90].indexOf(Number(ler(KN, 0))) >= 0 ? Number(ler(KN, 0)) : 0;
  // "Pra você" (bolinhas do mod_W: notaGosto(g).cor): escolha de várias, ex. 🟢 + 🟡. Fica só neste aparelho
  // (como os outros filtros: a sessão do mod_S também não vai pro sincronizar).
  var KC = KEY + "-L-cor";
  var CORES = [["verde", "🟢", "Vai gostar"], ["amarelo", "🟡", "Talvez"], ["vermelho", "🔴", "Acho que não"]];
  function corValida(c) { return CORES.some(function (x) { return x[0] === c; }); }
  state.lCor = (function () { var v = ler(KC, []); return Array.isArray(v) ? v.filter(corValida).filter(function (c, i, a) { return a.indexOf(c) === i; }) : []; })();
  function temGosto() { return typeof window.notaGosto === "function"; }
  function corDe(g) { var r = gostoR(g); return r ? r.cor : ""; }
  function usaCor() { return state.lCor.length > 0 && state.lCor.length < 3 && temGosto(); }
  var ignCor = false;   // no base() a cor é conferida à parte (pra contar cada bolinha)
  if (typeof tamOk === "function") {
    var tamAntL = tamOk;
    tamOk = function (g) {
      return (!state.lNota || nt(g) >= state.lNota) && (ignCor || !usaCor() || state.lCor.indexOf(corDe(g)) >= 0) && tamAntL.apply(this, arguments);
    };
  }
  if (typeof filtrosAtivos === "function") {
    var ativosAntL = filtrosAtivos;
    filtrosAtivos = function () { return ativosAntL.apply(this, arguments) + (state.lNota ? 1 : 0) + (usaCor() ? 1 : 0); };
  }
  if (typeof limparFiltros === "function") {
    var limparAntL = limparFiltros;
    limparFiltros = function () { state.lNota = 0; gravar(KN, 0); state.lCor = []; gravar(KC, []); return limparAntL.apply(this, arguments); };
  }
  // a nota de gosto dos 19 mil: o mod_W guarda, mas só depois de calculada (alguns segundos depois de abrir, e de novo
  // depois de cada marcação). Aqui: calcula em pedaços (aquecer) e avisa quem esperava; enquanto isso, "calculando…".
  var gq = {quente: false, rodando: false, esperam: []};
  function gostoPronto(fim) {
    if (!temGosto() || gq.quente) return true;
    if (fim) gq.esperam.push(fim);
    if (gq.rodando) return false;
    gq.rodando = true;
    var n0 = DATA.length;
    var feito = function () {
      gq.rodando = false; gq.quente = DATA.length === n0;
      var l = gq.esperam; gq.esperam = [];
      l.forEach(function (f) { try { f(); } catch (e) {} });
    };
    if (aquecer(DATA, feito)) { feito(); return gq.quente; }
    return false;
  }
  function esfriar() { gq.quente = false; }
  function passa(g, q, pl, semGen) {
    return (!state.status || g.s === state.status) &&
      (state.list === "tudo" || (state.list === "all" ? (g.l !== 5 || state.status === "cat" || !!q) : String(g.l) === state.list)) &&
      (!state.onlyHype || g.h > 0) &&
      (semGen || state.genre === "all" || g.gn === state.genre) &&
      (!state.onlyMarked || state.sel.has(g.id)) &&
      (!state.onlyFav || state.fav.has(g.id)) &&
      romOk(g) && minhaOk(g) && planoOk(g) && durOk(g) && idiomaOk(g) &&
      (!pl || pl.j.indexOf(g.id) >= 0) &&
      tamOk(g) &&
      (!state.onlyNew || ehNovo(g)) &&
      (!q || (window.B_ok ? B_ok(g, q) : norm(g.n).indexOf(q) >= 0)) && (!window.B_chips || B_chips(g));
  }
  // chips do mod_B e etiquetas do mod_Q: o estado fica com eles; aqui só se lê (aria-pressed) e se liga/desliga (clique)
  function chipB(k) { return document.querySelector('.chips-b [data-chip-b="' + k + '"]'); }
  function chipBOn(k) { var b = chipB(k); return !!b && b.getAttribute("aria-pressed") === "true"; }
  function chipBPor(k, on) { var b = chipB(k); if (b && chipBOn(k) !== !!on) b.click(); }
  function etqBotoes() { return document.querySelectorAll("#etq-bar [data-etq]"); }
  // (a escolha das etiquetas fica gravada pelo mod_Q a cada clique; o aria-pressed da fileira dele só é repintado com a lista antiga)
  function etqSel() { var r = ler(KEY + "-Q-etiq", []); return Array.isArray(r) ? r.filter(function (c) { return !!document.querySelector('#etq-bar [data-etq="' + c + '"]'); }) : []; }
  function etqPor(c, on) { var b = document.querySelector('#etq-bar [data-etq="' + c + '"]'); if (b && (etqSel().indexOf(c) >= 0) !== !!on) b.click(); }
  function chipsAss() {
    var r = [];
    document.querySelectorAll(".chips-b [aria-pressed=true]").forEach(function (b) { r.push(b.dataset.chipB); });
    return r.join(",") + "/" + etqSel().join(",");
  }
  function assin() {
    return [state.status, state.list, state.onlyHype, state.genre, state.onlyMarked, state.onlyFav, state.rom, state.minha, state.plano, state.dur,
      state.idioma, state.size, state.onlyNew, state.plAtiva, state.soJoia, state.lNota, usaCor() ? state.lCor.join("+") : "", state.q, chipsAss(), DATA.length,
      state.onlyFav || state.size === "cabe" ? state.fav.size + ":" + state.sel.size : ""].join("|");
  }
  function filtroK() { var a = assin().split("|"); a.splice(a.length - 2, 1); return a.join("|"); }
  var cb = {k: null};
  function base() {
    var k = assin();
    if (cb.k === k) return cb;
    var t0 = performance.now(), q = qAtual(), pl = plAt(), gen = state.genre, semGen = [], semCor = [], lista = [];
    var cores = usaCor() ? state.lCor : null;
    if (cores && !gostoPronto(function () { cb.k = null; agendar(); if (folhaAberta()) pintarFolha(); })) {
      cb = {k: k, calc: true, semGen: [], semCor: [], lista: [], col: {}, set: null, gen: null};
      return cb;
    }
    ignCor = true;
    try {
      for (var i = 0; i < DATA.length; i++) {
        var g = DATA[i];
        if (!passa(g, q, pl, true)) continue;
        var gOk = gen === "all" || g.gn === gen, cOk = !cores || cores.indexOf(corDe(g)) >= 0;
        if (cOk) semGen.push(g);
        if (gOk) { semCor.push(g); if (cOk) lista.push(g); }
      }
    } finally { ignCor = false; }
    cb = {k: k, semGen: semGen, semCor: semCor, lista: lista, col: {}, set: null, gen: null};
    T.filtro = Math.round(performance.now() - t0);
    return cb;
  }
  function noBase(b) { if (!b.set) { b.set = new Set(); b.lista.forEach(function (g) { b.set.add(g.id); }); } return b.set; }
  function porGenero(b) {
    if (!b.gen) { b.gen = {}; b.lista.forEach(function (g) { (b.gen[g.gn] = b.gen[g.gn] || []).push(g); }); }
    return b.gen;
  }

  // ---------- ordem ----------
  var ORDENS = [["cara", "🎯 Mais a sua cara"], ["nota", "★ Nota"], ["nome", "A–Z Nome"], ["novos", "✨ Mais novos"]];
  var ordem = ler(KO, "cara");
  if (!ORDENS.some(function (o) { return o[0] === ordem; })) ordem = "cara";
  function posNome(g) { var o = ORDEM_NOME.get(g); return o === undefined ? 1e9 : o; }
  // "Mais novos": a última atualização da lista primeiro; depois pelo número do jogo na eShop (sai em ordem de lançamento)
  function chaveNovo(g) { var n = g.id.charAt(0) === "c" ? parseInt(g.id.substr(8, 6), 16) || 0 : -1; return (ehNovo(g) ? 1e9 : 0) + n; }
  function ordenar(arr, o) {
    var d = new Array(arr.length), i, g;
    for (i = 0; i < arr.length; i++) {
      g = arr[i];
      d[i] = o === "nota" ? [nt(g), 0, -posNome(g), g] : o === "nome" ? [-posNome(g), 0, 0, g] : o === "novos" ? [chaveNovo(g), 0, -posNome(g), g] : [gosto(g), nt(g), -posNome(g), g];
    }
    d.sort(function (a, b) { return (b[0] - a[0]) || (b[1] - a[1]) || (b[2] - a[2]); });
    var r = new Array(d.length);
    for (i = 0; i < d.length; i++) r[i] = d[i][3];
    return r;
  }

  // "Mais a sua cara" precisa da nota de gosto (mod_W) de cada jogo. Na 1ª vez (ou depois de mudar uma marcação) ela custa
  // ~40 µs por jogo no celular: com 19 mil, ~0,8 s de tela parada. Aqui ela é feita em pedaços de 30 ms, sem travar.
  // Devolve true se já estava pronta (fez tudo agora); senão chama fim() quando terminar.
  function aquecer(lista, fim) {
    var i = 0, junto = true;
    (function passo() {
      var t0 = performance.now();
      while (i < lista.length) { gostoR(lista[i++]); if ((i & 63) === 0 && performance.now() - t0 > 30) break; }
      if (i < lista.length) { junto = false; setTimeout(passo, 0); }
      else if (!junto) fim();
    })();
    return junto;
  }
  function precisaGosto(c, o) { return c === "cara" || (o === "cara" && c !== "busca" && c !== "recentes" && c.indexOf("pl:") !== 0); }

  // ---------- coleções (o que cada prateleira e cada catálogo mostram) ----------
  function recentesIds() {
    var h = [];
    try { h = window.S_historico ? S_historico() : []; } catch (e) { h = []; }
    var vis = {}, r = [];
    for (var i = h.length - 1; i >= 0 && r.length < 60; i--) {
      var e = h[i];
      if (e && e.a === "ficha" && e.id && !vis[e.id] && porId[e.id]) { vis[e.id] = 1; r.push(e.id); }
    }
    return r;
  }
  function ultFicha() { try { var h = window.S_historico ? S_historico() : []; for (var i = h.length - 1; i >= 0; i--) if (h[i].a === "ficha") return h[i].t + h[i].id; } catch (e) {} return ""; }
  function caraOk(g) {
    if (g.s === "veto" || g.x || state.fav.has(g.id) || plano(g, "j")) return false;
    var r = gostoR(g);
    return !r || r.cor === "verde";
  }
  function trad(g) { return !!minhaTr(g) || plano(g, "q"); }
  var ORD_TRAD = {ok: 0, rev: 1, pc: 2};
  function plDe(id) { return (state.pls || []).filter(function (p) { return p.id === id; })[0] || null; }
  // c: home | todos | busca | joias | fav | cara | trad | recentes | pl:<id> | gen:<gn> (só prateleira)
  function natural(c) { return c === "recentes" || c.indexOf("pl:") === 0 || c === "busca"; }
  function itens(c, o) {
    var b = base(), ch = c + "#" + (o || ""), x = b.col[ch];
    if (x) return x;
    var t0 = performance.now(), r;
    if (c === "busca") {
      r = sorted(b.lista.slice());
    } else if (c === "recentes") {
      var s1 = noBase(b);
      r = recentesIds().filter(function (id) { return s1.has(id); }).map(function (id) { return porId[id]; });
    } else if (c.indexOf("pl:") === 0) {
      var p = plDe(c.slice(3)), s2 = noBase(b);
      r = p ? p.j.filter(function (id) { return s2.has(id); }).map(function (id) { return porId[id]; }) : [];
    } else {
      var l;
      if (c.indexOf("gen:") === 0) l = porGenero(b)[c.slice(4)] || [];
      else if (c === "joias") l = b.lista.filter(ehJoia);
      else if (c === "fav") l = b.lista.filter(function (g) { return state.fav.has(g.id); });
      else if (c === "cara") l = b.lista.filter(caraOk);
      else if (c === "trad") l = b.lista.filter(trad);
      else l = b.lista;
      r = ordenar(l, o || "cara");
      if (c === "trad" && !o) r.sort(function (a, z) { var x1 = ORD_TRAD[minhaTr(a)], x2 = ORD_TRAD[minhaTr(z)]; return (x1 === undefined ? 3 : x1) - (x2 === undefined ? 3 : x2); });
    }
    T["col_" + c.split(":")[0]] = Math.round(performance.now() - t0);
    b.col[ch] = r;
    return r;
  }

  function contar(c) {
    var b = base();
    if (c === "todos" || c === "busca") return b.lista.length;
    var f = c === "joias" ? ehJoia : c === "fav" ? function (g) { return state.fav.has(g.id); } : c === "cara" ? caraOk : c === "trad" ? trad : null;
    if (!f) return itens(c, "").length;
    var n = 0;
    for (var i = 0; i < b.lista.length; i++) if (f(b.lista[i])) n++;
    return n;
  }

  // ---------- títulos ----------
  function temFiltro() { return ativos().length > 0; }
  function titulo(c) {
    if (c === "todos") {
      if (state.genre !== "all" && GENRES[state.genre]) return {t: GENRES[state.genre].label, ico: GENRES[state.genre].svg, d: GEN_DESC[state.genre] || ""};
      return {t: temFiltro() ? "Jogos com os seus filtros" : "Todos os jogos", d: ""};
    }
    if (c === "busca") return {t: "Busca: “" + esc((state.q || "").trim()) + "”", d: ""};
    if (c === "joias") return {t: "💎 Joias escondidas", d: "Nota alta dos jogadores e pouco conhecidos."};
    if (c === "fav") return {t: "★ Seus interesses", d: "Os jogos em que você deu estrela."};
    if (c === "cara") return {t: "🟢 Mais a sua cara", d: "Os que mais combinam com o que você marca (romance, RPG, português, gêneros), fora os que já têm estrela."};
    if (c === "trad") return {t: "✎ Suas traduções", d: "Pronta, revisando, traduzindo no PC e os que você quer traduzir."};
    if (c === "recentes") return {t: "🕘 Continuar de onde parou", d: "As fichas que você abriu por último."};
    if (c.indexOf("pl:") === 0) { var p = plDe(c.slice(3)); return {t: "🎵 " + esc(p ? p.n : "Playlist"), d: "Na ordem em que você pôs."}; }
    if (c.indexOf("gen:") === 0) { var k = c.slice(4); return {t: GENRES[k] ? GENRES[k].label : k, ico: GENRES[k] ? GENRES[k].svg : "", d: GEN_DESC[k] || ""}; }
    return {t: "Jogos", d: ""};
  }

  // ---------- filtros ligados (chips removíveis) ----------
  var ROT = {
    idioma: {dub: "🎙 Dublado", leg: "💬 PT-BR oficial", fa: "💬 Tradução pronta", sem: "Sem português"},
    rom: {com: "♥ Com romance", sim: "♥ Romance central", algum: "♡ Qualquer romance", nao: "Sem romance", nc: "Romance não conferido"},
    size: {p: "Até 2 GB", m: "2 a 5 GB", g: "5 a 10 GB", gg: "10 a 20 GB", xg: "Mais de 20 GB", cabe: "Cabe no cartão"},
    dur: {"5": "⏱ Até 5 h", "7": "⏱ Até 7 h", "10": "⏱ Até 10 h", "20": "⏱ Até 20 h", "40": "⏱ Até 40 h", mais: "⏱ Mais de 40 h"}
  };
  var CAMPO_EL = {genre: "genero", idioma: "idioma", rom: "romance", size: "tamanho", dur: "duracao", plano: "plano", minha: "minha", list: "lista"};
  var CHECK_EL = {onlyFav: "so-interesse", onlyMarked: "so-marcados", onlyNew: "so-novos", onlyHype: "so-destaque", soJoia: "j-so"};
  function por(k, v) {
    state[k] = v;
    var el = CAMPO_EL[k] ? $(CAMPO_EL[k]) : CHECK_EL[k] ? $(CHECK_EL[k]) : null;
    if (el) { if (CHECK_EL[k]) el.checked = !!v; else el.value = v; }
    if (k === "lNota") gravar(KN, v);
    if (k === "lCor") gravar(KC, v);
  }
  function txtOpcao(sel, v) { var el = $(sel), o = el && Array.prototype.filter.call(el.options, function (x) { return x.value === String(v); })[0]; return o ? o.textContent : String(v); }
  function ativos() {
    var r = [];
    function add(rot, tira) { r.push({rot: rot, tira: tira}); }
    if (state.genre !== "all" && GENRES[state.genre]) add(GENRES[state.genre].label, function () { por("genre", "all"); });
    if (state.idioma !== "all") add(ROT.idioma[state.idioma] || txtOpcao("idioma", state.idioma), function () { por("idioma", "all"); });
    if (chipBOn("pt")) add("💬 Em português", function () { chipBPor("pt", false); });
    if (state.rom !== "all") add(ROT.rom[state.rom] || txtOpcao("romance", state.rom), function () { por("rom", "all"); });
    if (chipBOn("rom")) add("♥ Com romance", function () { chipBPor("rom", false); });
    etqSel().forEach(function (c) { add("🏷 " + ((window.ETIQ || (typeof ETIQ !== "undefined" ? ETIQ : {}))[c] || {label: c}).label, function () { etqPor(c, false); }); });
    if (state.size !== "all") add(ROT.size[state.size] || txtOpcao("tamanho", state.size), function () { por("size", "all"); });
    if (state.dur !== "all") add(ROT.dur[state.dur] || txtOpcao("duracao", state.dur), function () { por("dur", "all"); });
    if (chipBOn("curto")) add("⏱ Até 30 h", function () { chipBPor("curto", false); });
    if (state.lNota) add("★ Nota " + state.lNota + "+", function () { por("lNota", 0); });
    if (usaCor()) add(CORES.filter(function (x) { return state.lCor.indexOf(x[0]) >= 0; }).map(function (x) { return x[1]; }).join("") + " Pra você", function () { por("lCor", []); });
    if (chipBOn("nota")) add("★ Nota 80+", function () { chipBPor("nota", false); });
    if (state.onlyFav) add("★ Com estrela", function () { por("onlyFav", false); });
    if (chipBOn("fav")) add("★ Minhas estrelas", function () { chipBPor("fav", false); });
    if (state.onlyMarked) add("✓ Marcados pra instalar", function () { por("onlyMarked", false); });
    if (state.onlyHype) add("🔥 Os que você destacou", function () { por("onlyHype", false); });
    if (state.onlyNew) add("✨ Novos na lista", function () { por("onlyNew", false); });
    if (state.soJoia) add("💎 Só joias", function () { por("soJoia", false); });
    if (state.plano !== "all") add(state.plano === "w" ? "▶ Quero jogar" : txtOpcao("plano", state.plano), function () { por("plano", "all"); });
    if (state.minha !== "all") add(txtOpcao("minha", state.minha), function () { por("minha", "all"); });
    if (state.list !== "tudo") add(txtOpcao("lista", state.list), function () { por("list", "tudo"); try { renderTiles(); } catch (e) {} });
    if (state.status && STATUS[state.status]) add(STATUS[state.status].label, function () { state.status = null; try { renderTiles(); } catch (e) {} });
    if (state.plAtiva) { var p = plAt(); add("🎵 " + (p ? p.n : "Playlist"), function () { state.plAtiva = null; try { renderPlaylists(); } catch (e) {} }); }
    return r;
  }
  var ativosAtual = [];
  function chipsHTML() {
    ativosAtual = ativos();
    if (!ativosAtual.length) return "";
    return ativosAtual.map(function (a, i) {
      return '<button type="button" class="l-chip" data-l-tira="' + i + '" aria-label="Tirar o filtro ' + esc(a.rot) + '">' + esc(a.rot) + '<span class="x" aria-hidden="true">✕</span></button>';
    }).join("") + (ativosAtual.length > 1 ? '<button type="button" class="l-chip l-limpa" data-l-limpar>Limpar tudo</button>' : "");
  }
  function pintarAtivos() {
    var h = chipsHTML();
    [elAtivos, elAtivos2].forEach(function (el) { if (el && el.innerHTML !== h) el.innerHTML = h; });
    var n = ativosAtual.length;
    elFn.textContent = n ? String(n) : "";
    btnFiltros.setAttribute("aria-label", n ? "Filtros, " + n + (n === 1 ? " ligado" : " ligados") : "Filtros");
  }
  function limparTudo() {
    // dentro do catálogo de um gênero, o gênero fica (ele é a "prateleira"); o ✕ do chip dele tira
    var gen = vista.c === "todos" ? state.genre : "all", q = state.q;
    limparFiltros();
    if (gen !== "all") por("genre", gen);
    if (q) { state.q = q; var bq = $("busca"); if (bq) bq.value = q; }
    renderList();
  }

  // ---------- DOM ----------
  var raiz = document.createElement("div");
  raiz.id = "l-raiz";
  raiz.innerHTML =
    '<div class="l-abas" role="tablist" aria-label="Como ver os jogos">' +
    '<button type="button" role="tab" data-l-aba="cat" aria-selected="true">🏠 Catálogo</button>' +
    '<button type="button" role="tab" data-l-aba="lista" aria-selected="false">☰ Lista completa</button></div>' +
    '<div class="l-barra" id="l-barra"><div class="l-linha">' +
    '<button type="button" class="l-voltar" data-l-voltar aria-label="Voltar" hidden>‹</button>' +
    '<div class="l-busca"><input type="search" id="l-busca" placeholder="Buscar jogo" aria-label="Buscar jogo" enterkeyhint="search" autocomplete="off"></div>' +
    '<button type="button" class="l-fbtn" id="l-fbtn" data-l-filtros aria-haspopup="dialog">Filtros<span class="l-fn" id="l-fn"></span></button></div>' +
    '<div class="l-ativos" id="l-ativos" role="group" aria-label="Filtros ligados"></div></div>' +
    '<div id="l-home"><div class="l-atalhos" id="l-atalhos" role="group" aria-label="Atalhos"></div>' +
    '<p class="l-aviso" id="l-carregando" hidden></p>' +
    '<button type="button" class="l-todos" data-l-abrir="todos" id="l-todos"></button>' +
    '<div id="l-prats"></div></div>' +
    '<div id="l-col" hidden><div class="l-col-cab"><h2 id="l-col-tit" tabindex="-1"></h2><p class="l-col-sub" id="l-col-sub"></p></div>' +
    '<div class="l-ordem" id="l-ordem" role="group" aria-label="Ordenar"></div>' +
    '<div id="l-col-msg"></div><div class="l-grade" id="l-grade"></div>' +
    '<button type="button" class="l-mais" id="l-mais" data-l-mais hidden></button></div>';
  var hd = document.querySelector("main.wrap > header") || document.querySelector("header");
  if (hd && hd.parentNode) hd.parentNode.insertBefore(raiz, hd.nextSibling); else document.body.prepend(raiz);
  var elHome = $("l-home"), elCol = $("l-col"), elPrats = $("l-prats"), elGrade = $("l-grade"), elMais = $("l-mais");
  var elAtivos = $("l-ativos"), elFn = $("l-fn"), btnFiltros = $("l-fbtn"), elBusca = $("l-busca"), btnVoltar = raiz.querySelector("[data-l-voltar]");
  // os filtros ligados também na lista antiga, no lugar dos chips rápidos
  var elAtivos2 = document.createElement("div");
  elAtivos2.className = "l-ativos"; elAtivos2.id = "l-ativos2"; elAtivos2.setAttribute("role", "group"); elAtivos2.setAttribute("aria-label", "Filtros ligados");
  (function () { var m = $("mostrando"); if (m && m.parentNode) m.parentNode.insertBefore(elAtivos2, m); })();

  // atalhos: os botões do topo (de outros módulos) continuam no DOM; aqui um atalho que clica neles
  var ATALHOS = ["r-abrir", "t-abrir", "j-abrir", "s-abrir", "k-abrir", "v-abrir", "n-abrir", "g-abrir", "p-abrir", "h-botao", "c-aj-btn"];
  // no celular: os 4 mais usados + "⋯ Mais" (o resto aparece embaixo, em linhas; nada rola pro lado)
  var atalhosTodos = false;
  function pintarAtalhos() {
    var h = "", n = 0, curto = innerWidth < 700 && !atalhosTodos, sobra = 0;
    ATALHOS.forEach(function (id) {
      var b = $(id);
      if (!b) return;
      if (curto && n >= 4) { sobra++; return; }
      n++;
      h += '<button type="button" data-l-atalho="' + id + '">' + esc(b.textContent.trim()) + "</button>";
    });
    if (sobra) h += '<button type="button" data-l-atalhos-mais aria-expanded="false">⋯ Mais ' + sobra + "</button>";
    var el = $("l-atalhos");
    if (el.innerHTML !== h) el.innerHTML = h;
  }

  // ---------- modo e vista ----------
  var vista = {c: "home"};
  function modoCat() { return !H.classList.contains("l-lista"); }
  var folha = null;
  function folhaAberta() { return !!(folha && folha.open); }

  // ---------- tela inicial: seções em grade (só rola pra baixo) ----------
  function pratsDef() {
    var l = [{k: "recentes"}, {k: "fav"}, {k: "cara"}, {k: "joias"}, {k: "gens"}, {k: "trad"}];
    (state.pls || []).forEach(function (p) { if (p.j.length) l.push({k: "pl:" + p.id}); });
    return l;
  }
  // colunas: 3 no celular; no PC, o que couber com capas de ~200 px (4 a 6)
  function colsHome() {
    if (innerWidth < 700) return 3;
    var w = elPrats.clientWidth || Math.min(innerWidth, 1120) - 40;
    return Math.max(4, Math.min(6, Math.floor((w + 14) / 210)));
  }
  var homeK = null, ioPrat = null, colsK = 0;
  function pintarPrat(sec) {
    var k = sec.dataset.prat, b = base();
    if (k === "gens") { pintarGens(sec, b); return; }
    var gr = sec.querySelector(".l-mini");
    if (!b.col[k + "#"] && k === "cara" && b.lista.length > 1500 && !aquecer(b.lista, function () { if (sec.isConnected && cb === b) pintarPrat(sec); })) {
      if (gr && !gr.children.length) gr.innerHTML = '<p class="l-calc">Vendo o que é a sua cara…</p>';
      return;
    }
    var l = itens(k), n = Math.min(l.length, colsK * LINHAS_HOME);
    if (!l.length) { sec.hidden = true; sec.dataset.n = "0"; return; }
    sec.hidden = false;
    sec.querySelector(".n").textContent = jogos(l.length);
    var vt = sec.querySelector(".l-vt-link");
    if (vt) vt.hidden = l.length <= n;
    gr.innerHTML = l.slice(0, n).map(vitCard).join("");
    sec.dataset.n = String(n);
    if (!altPrat && sec.offsetHeight > 100) { altPrat = sec.offsetHeight; elPrats.style.setProperty("--l-ph", altPrat + "px"); }
  }
  var altPrat = 0;
  function pintarGens(sec, b) {
    var gens = porGenero(b), h = "", tot = 0;
    GEN_ORDER.forEach(function (gn) {
      var n = (gens[gn] || []).length;
      if (!GENRES[gn] || !n) return;
      tot++;
      h += '<button type="button" class="l-gen-t" data-l-abrir="gen:' + gn + '" aria-label="' + esc(GENRES[gn].label) + ", " + jogos(n) + '">' + GENRES[gn].svg +
        "<b>" + esc(GENRES[gn].label) + "</b><small>" + jogos(n) + "</small></button>";
    });
    sec.hidden = !tot;
    sec.dataset.n = String(tot);
    sec.querySelector(".n").textContent = tot + (tot === 1 ? " gênero" : " gêneros");
    sec.querySelector(".l-gens").innerHTML = h;
  }
  function renderHome(forcar, y) {
    var b = base();
    var k = b.k + "|" + (state.pls || []).map(function (p) { return p.id + ":" + p.n + ":" + p.j.length; }).join(",") + "|" + ultFicha() + "|" + state.fav.size;
    pintarAtalhos();
    var tot = b.lista.length;
    $("l-todos").hidden = !!b.calc;
    $("l-todos").innerHTML = "<span>" + (temFiltro() ? "Ver os " + jogos(tot) + " com os seus filtros" : "Ver todos os " + jogos(tot)) + "</span><span aria-hidden=\"true\">›</span>";
    var car = $("l-carregando");
    car.hidden = !window.CAT_CARREGANDO && !b.calc;
    if (b.calc) car.textContent = "Calculando o “Pra você” dos " + jogos(DATA.length) + "… as seções aparecem em alguns segundos.";
    else if (window.CAT_CARREGANDO) car.textContent = "Juntando o catálogo completo… as seções se completam sozinhas.";
    if (b.calc) k += "|calc";
    var cols = colsHome();
    k += "|c" + cols;
    if (!forcar && k === homeK) { if (y !== undefined) window.scrollTo(0, y); return; }
    var t0 = performance.now();
    T.homeN = (T.homeN || 0) + 1;
    homeK = k;
    if (cols !== colsK) { colsK = cols; altPrat = 0; elPrats.style.setProperty("--l-hc", String(cols)); }
    elPrats.innerHTML = pratsDef().map(function (p) {
      var gens = p.k === "gens", ti = gens ? {t: "🎮 Gêneros", d: ""} : titulo(p.k);
      return '<section class="l-prat" data-prat="' + esc(p.k) + '" aria-label="' + esc(ti.t.replace(/<[^>]+>/g, "")) + '">' +
        '<div class="l-prat-cab"><h2>' + (gens ? "<span>" + ti.t + '</span> <span class="n"></span>' :
          '<button type="button" data-l-abrir="' + esc(p.k) + '">' + (ti.ico || "") + "<span>" + ti.t + '</span> <span class="n"></span></button>') + "</h2>" +
        (gens ? "" : '<button type="button" class="l-vt-link" data-l-abrir="' + esc(p.k) + '">Ver tudo ›</button>') + "</div>" +
        (gens ? '<div class="l-gens"></div>' : '<div class="l-mini"></div>') + "</section>";
    }).join("");
    if (y !== undefined) window.scrollTo(0, y);
    // as que já estão na tela (ou quase) são desenhadas agora; as outras quando chegam perto
    if (ioPrat) ioPrat.disconnect();
    var alto = innerHeight + 400;
    elPrats.querySelectorAll(".l-prat").forEach(function (s) {
      var r = s.getBoundingClientRect();
      if ((r.top < alto && r.bottom > -400) || !ioPrat || s.dataset.prat === "gens") pintarPrat(s);   // os gêneros são leves: sempre
      else ioPrat.observe(s);
    });
    T.home = Math.round(performance.now() - t0);
  }
  if ("IntersectionObserver" in window) {
    ioPrat = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        ioPrat.unobserve(e.target);
        try { pintarPrat(e.target); } catch (er) {}
      });
    }, {rootMargin: "500px 0px"});
  }
  // girou o celular / mudou a janela: outra quantidade de colunas
  var tRes = 0;
  window.addEventListener("resize", function () {
    clearTimeout(tRes);
    tRes = setTimeout(function () { if (modoCat() && vista.c === "home" && colsHome() !== colsK) renderHome(true); }, 200);
  });

  // ---------- catálogo (grade) ----------
  var colArr = [], colN = 0, colK = null, colF = null, colC = null, ioMais = null;
  function ordemDe(c) { return natural(c) ? "" : ordem; }
  function renderCol(c, opc) {
    opc = opc || {};
    var t0 = performance.now(), o = ordemDe(c), b0 = base();
    if (b0.calc) {
      colK = null; colF = null; colArr = [];
      pintarCabCol(c);
      $("l-col-sub").innerHTML = "Calculando…";
      $("l-col-msg").innerHTML = '<p class="l-calc">Calculando o “Pra você” dos ' + jogos(DATA.length) + "… a lista aparece em alguns segundos.</p>";
      elGrade.innerHTML = ""; pintarMais();
      return;
    }
    if (!b0.col[c + "#" + o] && precisaGosto(c, o) && b0.lista.length > 1500) {
      var cc = c;
      if (!aquecer(b0.lista, function () { if (vista.c === cc && cb === b0 && modoCat()) renderCol(cc, {forcar: true, n: opc.n}); })) {
        colK = null; colF = null; colArr = [];
        pintarCabCol(c);
        $("l-col-sub").innerHTML = "Montando a lista…";
        $("l-col-msg").innerHTML = '<p class="l-calc">Vendo o que é a sua cara nos ' + jogos(b0.lista.length) + "…</p>";
        elGrade.innerHTML = ""; pintarMais();
        return;
      }
    }
    var arr = itens(c, o);
    var k = base().k + "#" + c + "#" + o, f = filtroK() + "#" + c + "#" + o;
    if (!opc.forcar && k === colK) { pintarCabCol(c); return; }
    var mesmoFiltro = colF === f && !opc.n;
    colK = k; colF = f; colC = c; colArr = arr;
    var n = opc.n || (mesmoFiltro ? Math.max(PASSO, colN) : PASSO);
    colN = Math.min(arr.length, n);
    pintarCabCol(c);
    var msg = "";
    if (c === "busca") {
      var sug = "";
      try { sug = window.F_busca && F_busca.sugestao ? F_busca.sugestao() : ""; } catch (e) { sug = ""; }
      if (sug && norm(sug) !== qAtual()) msg = '<p class="l-sug">' + (arr.length ? "Não achei escrito assim: mostrando os parecidos." : "Não achei nada.") +
        ' Você quis dizer <button type="button" data-fb-sug="' + esc(sug) + '">' + esc(sug) + "</button>?</p>";
    }
    if (!arr.length) {
      var f = temFiltro();
      msg += '<div class="l-vazio"><p>' + (c === "busca" ? "Nenhum jogo com esse nome" + (f ? " e esses filtros." : ".") : c === "fav" && !f ? "Você ainda não deu estrela em nenhum jogo. Toque na ☆ de uma capa." : "Nenhum jogo aqui com esses filtros.") + "</p>" +
        (f ? '<button type="button" class="l-btn" data-l-limpar>Limpar os filtros</button>' : "") + "</div>";
    }
    $("l-col-msg").innerHTML = msg;
    elGrade.innerHTML = arr.slice(0, colN).map(vitCard).join("");
    pintarMais();
    T.grade = Math.round(performance.now() - t0);
  }
  function pintarCabCol(c) {
    var ti = titulo(c), n = colArr.length;
    var h = (ti.ico || "") + "<span>" + ti.t + "</span>";
    var el = $("l-col-tit");
    if (el.innerHTML !== h) el.innerHTML = h;
    $("l-col-sub").innerHTML = "<strong>" + jogos(n) + "</strong>" + (ti.d ? " · " + esc(ti.d) : "");
    var od = $("l-ordem");
    if (natural(c)) { od.hidden = true; od.innerHTML = ""; return; }
    od.hidden = false;
    var ho = '<span class="rot">Ordem:</span>' + ORDENS.map(function (x) { return '<button type="button" data-l-ordem="' + x[0] + '" aria-pressed="' + (x[0] === ordem) + '">' + x[1] + "</button>"; }).join("");
    if (od.innerHTML !== ho) od.innerHTML = ho;
  }
  function pintarMais() {
    var resta = colArr.length - colN;
    elMais.hidden = resta <= 0;
    if (resta > 0) elMais.textContent = "Mostrar mais " + Math.min(resta, PASSO) + " (" + mil(resta) + " restantes)";
  }
  function maisCol() {
    if (colN >= colArr.length) return;
    var t0 = performance.now(), m = Math.min(colArr.length, colN + PASSO);
    elGrade.insertAdjacentHTML("beforeend", colArr.slice(colN, m).map(vitCard).join(""));
    colN = m;
    pintarMais();
    T.mais = Math.round(performance.now() - t0);
  }
  if ("IntersectionObserver" in window) {
    ioMais = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; }) && vista.c !== "home" && modoCat()) {
        maisCol();
        // continua perto do fim (tela grande): olha de novo
        setTimeout(function () { if (!elMais.hidden) { ioMais.unobserve(elMais); ioMais.observe(elMais); } }, 120);
      }
    }, {rootMargin: "1200px 0px"});
    ioMais.observe(elMais);
  }

  // ---------- mostrar uma vista ----------
  function mostrar(c, opc) {
    opc = opc || {};
    vista.c = c;
    var home = c === "home";
    pintarAtivos();   // antes de rolar: a fileira de chips muda a altura do alto da tela
    raiz.classList.toggle("l-em-col", !home);
    elHome.hidden = !home; elCol.hidden = home;
    btnVoltar.hidden = home;
    if (home) {
      renderHome(opc.forcar, opc.y || 0);
    } else {
      renderCol(c, {n: opc.n, forcar: opc.forcar || true});
      window.scrollTo(0, opc.y || 0);
    }
    pintarAtivos();
    if (elBusca.value !== (state.q || "")) elBusca.value = state.q || "";
  }
  // redesenho pedido pelo renderList (filtro, marcação, catálogo que chegou...)
  var agendado = 0;
  function agendar() {
    if (agendado) return;
    agendado = requestAnimationFrame(function () { agendado = 0; atualizar(); });
  }
  function atualizar() {
    if (!modoCat() || folhaAberta()) { pintarAtivos(); return; }
    // o gênero da entrada do histórico acompanha o que está ligado
    try { var s = history.state; if (s && s.lv && s.g !== state.genre) history.replaceState(Object.assign({}, s, {g: state.genre}), ""); } catch (e) {}
    var q = (state.q || "").trim();
    if (q && vista.c !== "busca") { entrarBusca(); return; }
    if (vista.c === "home") renderHome(false);
    else {
      var antes = colF, y0 = window.scrollY, topoGrade = elCol.getBoundingClientRect().top + window.scrollY;
      renderCol(vista.c, {});
      if (antes && colF !== antes && y0 > topoGrade) window.scrollTo(0, Math.max(0, topoGrade - 70));
    }
    pintarAtivos();
  }

  // ---------- history: cada catálogo é uma entrada (o voltar do celular volta) ----------
  function entrada(c, x) { return Object.assign({lv: 1, c: c, g: state.genre}, x || {}); }
  function guardarLugar() {
    try {
      var s = history.state;
      if (s && s.lv) history.replaceState(Object.assign({}, s, {y: Math.round(window.scrollY), n: vista.c !== "home" ? colN : 0, g: s.c === vista.c ? state.genre : s.g}), "");
    } catch (e) {}
  }
  var esperando = null;
  // depois que o voltar (de uma ficha ou da folha) terminar, faz f
  function aposVoltar(f) {
    var feito = false;
    var vai = function () { if (feito) return; feito = true; if (esperando === vai) esperando = null; f(); };
    esperando = vai;
    setTimeout(vai, 900);
    return vai;
  }
  function abrir(chave, opc) {
    opc = opc || {};
    var t0 = performance.now();
    var c = chave, g = state.genre;
    if (chave.indexOf("gen:") === 0) { c = "todos"; g = chave.slice(4); }
    if (!modoCat()) { modoLista(false); }
    else guardarLugar();
    if (opc.generoAntes !== undefined) { try { history.replaceState(Object.assign({}, history.state, {g: opc.generoAntes}), ""); } catch (e) {} }
    var mudouG = g !== state.genre;
    if (mudouG) por("genre", g);
    // o catálogo abre já com a busca limpa (a busca tem a vista dela)
    if (c !== "busca" && (state.q || "").trim()) limparBusca();
    try { history.pushState(entrada(c), ""); } catch (e) {}
    mostrar(c, {forcar: true});
    if (mudouG) renderList();
    T.abrir = Math.round(performance.now() - t0);
    T.abrirQual = chave;
    try { $("l-col-tit").focus({preventScroll: true}); } catch (e) {}
  }
  function aplicar(s) {
    var t0 = performance.now();
    try { aplicar0(s); } finally { T.voltar = Math.round(performance.now() - t0); }
  }
  function aplicar0(s) {
    if (s.c === "lista") { if (modoCat()) modoLista(true); return; }
    if (!modoCat()) modoLista(false, true);
    var mudou = false;
    if (s.g && s.g !== state.genre) { por("genre", s.g); mudou = true; }
    if (s.c !== "busca" && (state.q || "").trim()) { limparBusca(); mudou = true; }
    if (s.c === "busca" && !(state.q || "").trim()) { s = Object.assign({}, s, {c: "home"}); }
    if (s.c === vista.c && !mudou) { pintarAtivos(); return; }
    mostrar(s.c, {y: s.y, n: s.n, forcar: s.c !== "home"});
    if (mudou) renderList();
  }
  window.addEventListener("popstate", function () {
    var s = history.state;
    if (folhaAberta() && !(s && s.lFolha)) { fecharFolha(true); return; }
    if (esperando) { var f = esperando; f(); return; }
    if (!s || !s.lv) return;   // a entrada de outro módulo (ficha, Avaliar...): ele cuida
    aplicar(s);
  });

  // ---------- abas ----------
  var sujoLista = true;
  function modoLista(on, semHist) {
    if (on === !modoCat()) return;
    if (on) {
      guardarLugar();
      H.classList.add("l-lista");
      if (!semHist) { try { history.replaceState(entrada("lista"), ""); } catch (e) {} }
      raiz.querySelectorAll("[data-l-aba]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.lAba === "lista")); });
      var t0 = performance.now();
      if (sujoLista) renderList();
      T.lista = Math.round(performance.now() - t0);
      window.scrollTo(0, 0);
    } else {
      H.classList.remove("l-lista");
      raiz.querySelectorAll("[data-l-aba]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.lAba === "cat")); });
    }
  }

  // ---------- busca ----------
  var bOrig = $("busca");
  function limparBusca() {
    state.q = "";
    if (bOrig) { bOrig.value = ""; bOrig.dispatchEvent(new Event("input", {bubbles: true})); }
    elBusca.value = "";
  }
  function entrarBusca() {
    guardarLugar();
    try { history.pushState(entrada("busca"), ""); } catch (e) {}
    mostrar("busca", {forcar: true});
  }
  elBusca.addEventListener("input", function () {
    var t0 = performance.now();
    if (bOrig) { bOrig.value = elBusca.value; bOrig.dispatchEvent(new Event("input", {bubbles: true})); }
    else { state.q = elBusca.value; renderList(); }
    if (!elBusca.value.trim() && vista.c === "busca") { try { history.back(); } catch (e) {} }
    T.buscaTecla = Math.round(performance.now() - t0);
  });
  elBusca.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); elBusca.blur(); } });
  if (bOrig) bOrig.addEventListener("input", function () { if (elBusca.value !== bOrig.value) elBusca.value = bOrig.value; });

  // ---------- renderList: com o catálogo na tela, a lista antiga espera ----------
  var renderAntL = renderList;
  renderList = function () {
    if (modoCat() || folhaAberta()) { sujoLista = true; agendar(); return; }
    sujoLista = false;
    var r = renderAntL.apply(this, arguments);
    pintarAtivos();
    return r;
  };
  // marcações (estrela, instalar...): só a prateleira "Seus interesses" e a contagem acompanham, sem redesenhar a tela
  var favAntes = state.fav.size;
  if (typeof save === "function") {
    var saveAntL = save;
    save = function () {
      var r = saveAntL.apply(this, arguments);
      esfriar();
      if (usaCor()) cb.k = null;
      if (state.fav.size !== favAntes) {
        favAntes = state.fav.size;
        setTimeout(function () {
          if (!modoCat() || vista.c !== "home") return;
          var s = elPrats.querySelector('[data-prat="fav"]');
          if (s && s.dataset.n) { cb.col = {}; pintarPrat(s); }
        }, 0);
      }
      return r;
    };
  }

  // ---------- setas da ficha (mod_B2): andam pela tela atual ----------
  var ultPrat = null;
  window.L_IDS = function () {
    if (!modoCat()) return null;
    var l = vista.c === "home" ? (ultPrat ? itens(ultPrat) : null) : colArr;
    return l ? l.map(function (g) { return g.id; }) : null;
  };
  document.addEventListener("click", function (e) {
    var v = e.target.closest ? e.target.closest("#l-raiz [data-ver]") : null;
    if (!v) return;
    var s = v.closest(".l-prat");
    ultPrat = s ? s.dataset.prat : null;
  }, true);

  // ---------- gênero na ficha: abre o catálogo do gênero ----------
  var abrirAntL = abrirFicha, ultVisto = null;
  abrirFicha = function (id) {
    var r = abrirAntL.apply(this, arguments);
    try {
      var g = porId[id], fi = $("ficha"), sp = fi && fi.querySelector(".ficha-titulo .gen");
      if (g && sp && GENRES[g.gn]) {
        sp.classList.add("l-gen"); sp.dataset.lGen = g.gn;
        sp.setAttribute("role", "link"); sp.setAttribute("tabindex", "0");
        sp.setAttribute("aria-label", "Ver todos os jogos de " + GENRES[g.gn].label);
      }
      if (fi && fi.open) ultVisto = id;
    } catch (e) {}
    return r;
  };
  function irAoGenero(gn) {
    var fi = $("ficha");
    // outros diálogos (Para você, Histórico...) fecham junto
    document.querySelectorAll("dialog[open]").forEach(function (d) { if (d !== fi && d.id !== "l-folha") try { d.close(); } catch (e) {} });
    if (fi && fi.open) {
      var pushed = history.state && history.state.ficha;
      if (pushed) aposVoltar(function () { abrir("gen:" + gn); });
      fi.close();
      if (!pushed) abrir("gen:" + gn);
    } else abrir("gen:" + gn);
  }
  document.addEventListener("click", function (e) {
    var sp = e.target.closest ? e.target.closest("#ficha .l-gen[data-l-gen]") : null;
    if (sp) { e.preventDefault(); irAoGenero(sp.dataset.lGen); }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target && e.target.matches && e.target.matches("#ficha .l-gen[data-l-gen]")) { e.preventDefault(); irAoGenero(e.target.dataset.lGen); }
  });
  // fechou a ficha depois de andar pelas setas: a grade vai até o último jogo visto
  var fichaEl = $("ficha");
  if (fichaEl) fichaEl.addEventListener("close", function () {
    var id = ultVisto; ultVisto = null;
    if (!id || !modoCat() || vista.c === "home") return;
    setTimeout(function () {
      var i = -1;
      for (var k = 0; k < colArr.length; k++) if (colArr[k].id === id) { i = k; break; }
      if (i < 0) return;
      while (colN <= i && colN < colArr.length) maisCol();
      var el = elGrade.querySelector('[data-previa="' + id + '"]');
      if (!el) return;
      var r = el.getBoundingClientRect(), topo = $("l-barra").getBoundingClientRect().bottom;
      if (r.top >= topo && r.bottom <= innerHeight - 60) return;
      window.scrollBy(0, r.top - topo - 20);
    }, 30);
  });
  // etiqueta tocada na ficha (mod_Q): com o catálogo, mostra os jogos dela em grade
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-etq-ficha]") : null;
    if (!b || !modoCat()) return;
    var ir = function () { if (vista.c === "home") abrir("todos"); else { window.scrollTo(0, 0); agendar(); } };
    if (history.state && history.state.ficha) aposVoltar(ir); else setTimeout(ir, 0);
  });
  // gênero no menu preso da lista antiga, no seletor antigo e o "Ver só as joias" da fileira antiga: viram catálogo
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var p = e.target.closest('#pular [data-pular^="sec-gen-"]');
    if (p) { e.preventDefault(); e.stopPropagation(); abrir("gen:" + p.dataset.pular.slice(8)); return; }
    var j = e.target.closest("[data-j-sojoias]");
    if (j) { e.preventDefault(); e.stopPropagation(); abrir("joias"); return; }
    var f = e.target.closest("#btn-filtros");
    if (f) { e.preventDefault(); e.stopPropagation(); abrirFolha(); }
  }, true);
  (function () {
    var sel = $("genero");
    if (!sel) return;
    sel.addEventListener("change", function () { if (sel.value !== "all") abrir("gen:" + sel.value); });
  })();

  // ---------- cliques na tela ----------
  raiz.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.dataset.lAbrir) { abrir(t.dataset.lAbrir); return; }
    if (t.dataset.lAba) {
      if (t.dataset.lAba === "lista") modoLista(true);
      else { modoLista(false); try { history.replaceState(entrada("home"), ""); } catch (er) {} mostrar("home", {forcar: true}); }
      return;
    }
    if (t.hasAttribute("data-l-voltar")) { try { history.back(); } catch (er) {} return; }
    if (t.hasAttribute("data-l-filtros")) { abrirFolha(); return; }
    if (t.dataset.lAtalho) { var o = $(t.dataset.lAtalho); if (o) o.click(); return; }
    if (t.hasAttribute("data-l-atalhos-mais")) { atalhosTodos = true; pintarAtalhos(); var p1 = $("l-atalhos").children[4]; if (p1) try { p1.focus(); } catch (er) {} return; }
    if (t.dataset.lOrdem) {
      ordem = t.dataset.lOrdem; gravar(KO, ordem);
      var t0 = performance.now();
      renderCol(vista.c, {forcar: true, n: PASSO});
      var topo = elCol.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > topo) window.scrollTo(0, Math.max(0, topo - 70));
      T.ordem = Math.round(performance.now() - t0);
      return;
    }
    if (t.hasAttribute("data-l-mais")) { maisCol(); return; }
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-l-tira], [data-l-limpar]") : null;
    if (!t || !(raiz.contains(t) || elAtivos2.contains(t))) return;
    if (t.hasAttribute("data-l-limpar")) { limparTudo(); return; }
    var a = ativosAtual[Number(t.dataset.lTira)];
    if (a) { a.tira(); renderList(); }
  });

  // =====================================================================
  // FOLHA DE FILTROS
  // =====================================================================
  folha = document.createElement("dialog");
  folha.id = "l-folha";
  folha.setAttribute("aria-labelledby", "l-folha-tit");
  folha.innerHTML = '<div class="l-f-in"><div class="l-f-cab"><h2 id="l-folha-tit">Filtros</h2><button type="button" class="l-f-x" data-l-ffechar aria-label="Fechar">✕</button></div>' +
    '<div class="l-f-corpo" id="l-f-corpo"></div>' +
    '<div class="l-f-pe"><button type="button" class="l-f-limpar" data-l-flimpar>Limpar tudo</button><button type="button" class="l-f-ok" data-l-fok id="l-f-ok">Mostrar</button></div></div>';
  document.body.appendChild(folha);
  var corpo = $("l-f-corpo");
  var SEC = [
    {id: "cor", t: "Pra você", dica: "as bolinhas das capas; dá pra escolher mais de uma"},
    {id: "pt", t: "Português", ops: [["all", "Tanto faz"], ["qq", "Em português (oficial, de fã ou sua)"], ["leg", "PT-BR oficial"], ["fa", "Tradução pronta (de fã)"], ["dub", "🎙 Dublado"], ["sem", "Sem português"]],
      v: function () { return chipBOn("pt") ? "qq" : state.idioma; },
      por: function (v) { chipBPor("pt", v === "qq"); por("idioma", v === "qq" ? "all" : v); }},
    {id: "rom", t: "Romance", ops: [["all", "Tanto faz"], ["com", "♥ Com romance"], ["sim", "♥ Romance central"], ["algum", "♡ Qualquer romance, até de fundo"], ["nao", "Sem romance"]],
      v: function () { return state.rom !== "all" ? state.rom : chipBOn("rom") ? "com" : "all"; },
      por: function (v) { chipBPor("rom", false); por("rom", v); }},
    {id: "gen", t: "Gênero"},
    {id: "etq", t: "Etiquetas", dica: "o jogo precisa ter todas as que você escolher"},
    {id: "tam", t: "Tamanho", ops: [["all", "Tanto faz"], ["p", "Até 2 GB"], ["m", "2 a 5 GB"], ["g", "5 a 10 GB"], ["gg", "10 a 20 GB"], ["xg", "Mais de 20 GB"], ["cabe", "Cabe no que sobra do cartão"]],
      v: function () { return state.size; }, por: function (v) { por("size", v); }},
    {id: "dur", t: "Duração", dica: "história principal", ops: [["all", "Tanto faz"], ["5", "Até 5 h"], ["10", "Até 10 h"], ["20", "Até 20 h"], ["40", "Até 40 h"], ["mais", "Mais de 40 h"]],
      v: function () { return state.dur !== "all" ? state.dur : chipBOn("curto") ? "30" : "all"; },
      por: function (v) { chipBPor("curto", false); por("dur", v); }},
    {id: "nota", t: "Nota dos jogadores", ops: [["0", "Tanto faz"], ["70", "70 ou mais"], ["80", "80 ou mais"], ["90", "90 ou mais"]],
      v: function () { return String(state.lNota || (chipBOn("nota") ? 80 : 0)); },
      por: function (v) { chipBPor("nota", false); por("lNota", Number(v)); }},
    {id: "meus", t: "Só os meus", multi: true}
  ];
  var MEUS = [
    ["fav", "★ Com estrela", function () { return state.onlyFav || chipBOn("fav"); }, function (on) { chipBPor("fav", false); por("onlyFav", on); }],
    ["sel", "✓ Marcados pra instalar", function () { return state.onlyMarked; }, function (on) { por("onlyMarked", on); }],
    ["w", "▶ Quero jogar", function () { return state.plano === "w"; }, function (on) { por("plano", on ? "w" : "all"); }],
    ["novo", "✨ Novos na lista", function () { return state.onlyNew; }, function (on) { por("onlyNew", on); }],
    ["joia", "💎 Só joias escondidas", function () { return !!state.soJoia; }, function (on) { por("soJoia", on); }]
  ];
  function pill(sec, v, rot, on, n) {
    return '<button type="button" data-l-op="' + sec + '" data-v="' + esc(v) + '" aria-pressed="' + (on ? "true" : "false") + '"' + (n === 0 && !on ? ' class="zero"' : "") + ">" + rot +
      (n !== undefined && n !== null ? ' <span class="n">' + mil(n) + "</span>" : "") + "</button>";
  }
  function colFolha() { return vista.c === "home" || !modoCat() ? "todos" : vista.c; }
  function pintarFolha() {
    var t0 = performance.now(), b = base(), c = colFolha();
    // contagem por gênero: com os outros filtros (sem o de gênero)
    var cg = {};
    b.semGen.forEach(function (g) { cg[g.gn] = (cg[g.gn] || 0) + 1; });
    var ce = {};
    b.lista.forEach(function (g) { if (g.et) { var p = g.et.split(" "); for (var i = 0; i < p.length; i++) ce[p[i]] = (ce[p[i]] || 0) + 1; } });
    var DEF = window.ETIQ || (typeof ETIQ !== "undefined" ? ETIQ : {}), GR = typeof ETIQ_GRUPOS !== "undefined" ? ETIQ_GRUPOS : {};
    var etq = etqSel();
    // contagem por bolinha: com os outros filtros (sem o de cor); só quando todas as notas de gosto existem
    var cc = null, prontoCor = temGosto() && !b.calc && gostoPronto(function () { if (folhaAberta()) pintarFolha(); });
    if (prontoCor) { cc = {}; (b.semCor || b.lista).forEach(function (g) { var x = corDe(g); cc[x] = (cc[x] || 0) + 1; }); }
    var h = SEC.map(function (s) {
      var corpoS = "";
      if (s.id === "cor") {
        if (!temGosto()) return "";
        corpoS = '<div class="l-pills">' + CORES.map(function (x) {
          var on = state.lCor.indexOf(x[0]) >= 0 && state.lCor.length < 3;
          return pill("cor", x[0], x[1] + " " + x[2], on, cc ? cc[x[0]] || 0 : null) ;
        }).join("") + "</div>" + (cc ? "" : '<p class="l-f-calc">calculando…</p>');
        return '<section class="l-f-sec"><h3>' + s.t + ' <small>(' + s.dica + ")</small></h3>" + corpoS + "</section>";
      }
      if (s.id === "gen") {
        corpoS = pill("gen", "all", "Todos", state.genre === "all", b.semGen.length) +
          GEN_ORDER.map(function (k) { return GENRES[k] ? pill("gen", k, GENRES[k].label, state.genre === k, cg[k] || 0) : ""; }).join("");
        corpoS = '<div class="l-pills">' + corpoS + "</div>";
      } else if (s.id === "etq") {
        var ult = null, grupos = "";
        Object.keys(DEF).forEach(function (cod) {
          var gr = DEF[cod].grupo;
          if (gr !== ult) { if (ult !== null) grupos += "</div>"; grupos += "<h4>" + esc(GR[gr] || gr) + '</h4><div class="l-pills">'; ult = gr; }
          grupos += pill("etq", cod, esc(DEF[cod].label), etq.indexOf(cod) >= 0, ce[cod] || 0);
        });
        corpoS = grupos + (ult !== null ? "</div>" : "");
        if (!corpoS) return "";
      } else if (s.multi) {
        corpoS = '<div class="l-pills">' + MEUS.filter(function (m) { return m[0] !== "novo" || (typeof NOVO !== "undefined" && NOVO); })
          .map(function (m) { return pill("meus", m[0], m[1], m[2]()); }).join("") + "</div>";
      } else {
        var v = s.v(), ops = s.ops.slice();
        if (!ops.some(function (o) { return o[0] === v; })) ops.push([v, s.id === "dur" && v === "30" ? "Até 30 h" : txtOpcao(s.id === "tam" ? "tamanho" : s.id === "dur" ? "duracao" : "idioma", v)]);
        corpoS = '<div class="l-pills">' + ops.map(function (o) { return pill(s.id, o[0], o[1], o[0] === v); }).join("") + "</div>";
      }
      return '<section class="l-f-sec"><h3>' + s.t + (s.dica ? " <small>(" + s.dica + ")</small>" : "") + "</h3>" + corpoS + "</section>";
    }).join("");
    var y = corpo.scrollTop;
    corpo.innerHTML = h;
    corpo.scrollTop = y;
    var n = contar(c);
    var ok = $("l-f-ok");
    ok.textContent = b.calc ? "Calculando…" : n ? "Mostrar " + jogos(n) : "Nenhum jogo: tire algum filtro";
    ok.disabled = false;
    T.folha = Math.round(performance.now() - t0);
  }
  var folhaEmpurrou = false, generoAntes = "all";
  function abrirFolha() {
    if (folhaAberta()) return;
    var t0 = performance.now();
    generoAntes = state.genre;
    pintarFolha();
    folha.showModal();
    corpo.scrollTop = 0;
    try { history.pushState({lFolha: 1}, ""); folhaEmpurrou = true; } catch (e) { folhaEmpurrou = false; }
    try { folha.querySelector("[data-l-ffechar]").focus({preventScroll: true}); } catch (e) {}
    T.abrirFolha = Math.round(performance.now() - t0);
  }
  function fecharFolha(peloVoltar, depois) {
    if (!folhaAberta()) { if (depois) depois(); return; }
    folha.close();
    var fim = function () {
      if (!modoCat()) { if (sujoLista) renderList(); }
      else atualizar();
      if (depois) depois();
    };
    if (folhaEmpurrou && !peloVoltar) {
      folhaEmpurrou = false;
      if (history.state && history.state.lFolha) { aposVoltar(fim); try { history.back(); } catch (e) {} return; }
    }
    folhaEmpurrou = false;
    fim();
  }
  folha.addEventListener("cancel", function (e) { e.preventDefault(); fecharFolha(false); });
  folha.addEventListener("click", function (e) {
    if (e.target === folha) { fecharFolha(false); return; }
    var b = e.target.closest ? e.target.closest("button") : null;
    if (!b) return;
    if (b.hasAttribute("data-l-ffechar")) { fecharFolha(false); return; }
    if (b.hasAttribute("data-l-flimpar")) {
      var gen = vista.c === "todos" && modoCat() ? state.genre : "all", q = state.q;
      limparFiltros();
      if (gen !== "all") por("genre", gen);
      if (q) { state.q = q; if (bOrig) bOrig.value = q; }
      pintarFolha();
      return;
    }
    if (b.hasAttribute("data-l-fok")) {
      var naHome = modoCat() && vista.c === "home";
      var ga = generoAntes;
      fecharFolha(false, function () {
        if (naHome && (temFiltro() || state.genre !== "all")) abrir("todos", {generoAntes: ga});
        else if (modoCat() && vista.c !== "home") window.scrollTo(0, 0);
        else if (!modoCat()) { var l = $("lista-jogos"); if (l) l.scrollIntoView({block: "start"}); }
      });
      return;
    }
    var op = b.dataset.lOp;
    if (!op) return;
    var v = b.dataset.v, t0 = performance.now();
    if (op === "gen") por("genre", state.genre === v ? "all" : v);
    else if (op === "cor") {
      var lc = state.lCor.length >= 3 ? [] : state.lCor.slice(), ic = lc.indexOf(v);
      if (ic >= 0) lc.splice(ic, 1); else lc.push(v);
      if (lc.length >= 3) lc = [];   // as três ligadas = tanto faz
      por("lCor", CORES.map(function (x) { return x[0]; }).filter(function (c2) { return lc.indexOf(c2) >= 0; }));
    }
    else if (op === "etq") etqPor(v, b.getAttribute("aria-pressed") !== "true");
    else if (op === "meus") { var m = MEUS.filter(function (x) { return x[0] === v; })[0]; if (m) m[3](!m[2]()); }
    else {
      var s = SEC.filter(function (x) { return x.id === op; })[0];
      if (s) s.por(b.getAttribute("aria-pressed") === "true" && v !== "all" && v !== "0" ? (op === "nota" ? "0" : "all") : v);
    }
    renderList();   // (a tela de trás só é refeita ao fechar)
    pintarFolha();
    T.filtroToque = Math.round(performance.now() - t0);
  });

  // ---------- começo ----------
  function iniciar() {
    var t0 = performance.now();
    var s = history.state;
    if (s && s.lv && s.c && s.c !== "lista" && s.c !== "home") {
      // recarregou com um catálogo aberto: volta nele
      aplicar(s);
      if (vista.c === "home") mostrar("home", {forcar: true});
    } else {
      try { history.replaceState(Object.assign(entrada("home"), {g: "all", y: 0}), ""); } catch (e) {}
      if ((state.q || "").trim()) { mostrar("home", {forcar: true}); entrarBusca(); }
      else if (state.genre !== "all" && GENRES[state.genre]) { var g = state.genre; mostrar("home", {forcar: true}); abrir("gen:" + g, {generoAntes: "all"}); }
      else mostrar("home", {forcar: true});
    }
    T.inicio = Math.round(performance.now() - t0);
  }
  try {
    iniciar();
  } catch (e) {
    // sem o catálogo, a lista antiga volta inteira
    H.classList.remove("l-on");
    raiz.hidden = true;
    window.L_ERRO = String(e && e.stack || e);
    try { renderList = renderAntL; renderList(); } catch (er) {}
  }
  // o catálogo inteiro chegou (pacotes): as prateleiras se completam
  document.addEventListener("estante-catalogo", function () { esfriar(); cb.k = null; agendar(); });

  window.L_nav = {
    abrir: abrir,
    vista: function () { return vista.c; },
    tempos: T,
    folha: abrirFolha,
    ativos: function () { return ativos().map(function (a) { return a.rot; }); },
    contar: function (c) { return contar(c || "todos"); }
  };
})();

