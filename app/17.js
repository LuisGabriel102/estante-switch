/* mod_Q_etiquetas.js */
// Etiquetas (várias por jogo): fileira de chips perto do botão Filtros, combinadas com E (todas precisam bater),
// botão "limpar", contagem em cada chip e as etiquetas do jogo na ficha (tocar filtra).
// Precisa de: ETIQ (etiquetas_def.js) e g.et = "px tb jr" em cada jogo de DATA. Carregar por último.
// Ganchos (sem mexer no 01.js):
//  - window.B_chips(g): o filtro da lista (renderList, quadro e as contas do 11.js) já chama B_chips por último;
//    este módulo embrulha o B_chips do mod_B (06.js) e acrescenta "tem todas as etiquetas escolhidas".
//  - window.B_chipsN(): embrulhado para somar um número que muda a cada combinação de etiquetas
//    (o 10.js e o 11.js usam B_chipsN() nas assinaturas de cache; >0 também acende o "Limpar filtros").
//  - renderList, renderFiltros (marca o fim da contagem), limparFiltros e abrirFicha: embrulhados (o original roda primeiro).
(function () {
  "use strict";
  var DEF = typeof ETIQ !== "undefined" ? ETIQ : window.ETIQ;
  if (!DEF || typeof DATA === "undefined") return;
  var GRUPOS = typeof ETIQ_GRUPOS !== "undefined" ? ETIQ_GRUPOS : {};
  var CODS = Object.keys(DEF);
  var BIT = {};
  CODS.forEach(function (c, i) { BIT[c] = Math.pow(2, i); });
  var CHAVE = (typeof KEY !== "undefined" ? KEY : "estante-switch-v1") + "-Q-etiq";

  // ---------- índice: um Set de ids por etiqueta, refeito só quando DATA muda de tamanho ----------
  var idx = {}, pos = {}, feitoCom = -1;
  function indexa() {
    if (feitoCom === DATA.length) return;
    idx = {}; pos = {};
    CODS.forEach(function (c) { idx[c] = new Set(); });
    for (var i = 0; i < DATA.length; i++) {
      var g = DATA[i];
      pos[g.id] = i;
      if (!g.et) continue;
      var p = g.et.split(" ");
      for (var j = 0; j < p.length; j++) if (idx[p[j]]) idx[p[j]].add(g.id);
    }
    feitoCom = DATA.length;
    inter = null;
  }

  // ---------- escolha (fica salva neste aparelho) ----------
  var sel = [];
  try { sel = (JSON.parse(localStorage.getItem(CHAVE) || "[]") || []).filter(function (c) { return DEF[c]; }); } catch (e) { sel = []; }
  function salva() { try { localStorage.setItem(CHAVE, JSON.stringify(sel)); } catch (e) {} }
  var inter = null;  // Set dos ids que têm todas as etiquetas escolhidas
  function interseccao() {
    indexa();
    if (inter || !sel.length) return inter;
    var ord = sel.slice().sort(function (a, b) { return idx[a].size - idx[b].size; });
    var r = new Set();
    idx[ord[0]].forEach(function (id) {
      for (var k = 1; k < ord.length; k++) if (!idx[ord[k]].has(id)) return;
      r.add(id);
    });
    inter = r;
    return r;
  }
  function mascara() { var m = 0; sel.forEach(function (c) { m += BIT[c]; }); return m; }

  // ---------- gancho no filtro ----------
  // contagem dos chips: no DATA.filter do renderList, cada jogo que chega aqui já passou por todos os outros
  // filtros (B_chips é a última condição). A conta vale do começo do renderList até ele chamar renderFiltros
  // (logo depois do filtro); como reforço, para se a ordem de DATA voltar pra trás.
  var contando = false, ultPos = -1, cont = {}, totalVis = 0;
  var chipsAnt = window.B_chips, chipsNAnt = window.B_chipsN;
  window.B_chips = function (g) {
    if (chipsAnt && !chipsAnt(g)) return false;
    var ok = !sel.length || interseccao().has(g.id);
    if (contando) {
      var p = pos[g.id];
      if (p === undefined || p <= ultPos) contando = false;
      else {
        ultPos = p;
        if (ok) {
          totalVis++;
          if (g.et) { var e = g.et.split(" "); for (var j = 0; j < e.length; j++) cont[e[j]] = (cont[e[j]] || 0) + 1; }
        }
      }
    }
    return ok;
  };
  window.B_chipsN = function () { return (chipsNAnt ? chipsNAnt() : 0) + (sel.length ? 8 * mascara() : 0); };

  // ---------- fileira de chips ----------
  var css = document.createElement("style");
  css.textContent =
    ".etq-bar{display:flex;gap:6px;align-items:center;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;padding:2px 2px 6px;margin:6px 0 2px;-webkit-overflow-scrolling:touch;flex-basis:100%;min-width:0;max-width:100%}" +
    ".etq-bar::-webkit-scrollbar{height:4px}.etq-bar::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}" +
    ".etq-rot{flex:0 0 auto;font-size:13px;font-weight:700;color:var(--muted);padding-right:2px}" +
    ".etq-sep{flex:0 0 auto;width:1px;align-self:stretch;margin:6px 2px;background:var(--line)}" +
    ".etq{flex:0 0 auto;font:inherit;font-size:13px;font-weight:600;min-height:34px;padding:3px 11px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}" +
    ".etq .n{font-size:11px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}" +
    ".etq[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}.etq[aria-pressed=true] .n{color:inherit;opacity:.85}" +
    ".etq.zero{opacity:.45}" +
    ".etq-limpar{flex:0 0 auto;font:inherit;font-size:13px;font-weight:700;min-height:34px;padding:3px 11px;border-radius:999px;border:1px dashed var(--accent);background:transparent;color:var(--accent);cursor:pointer;white-space:nowrap}" +
    ".etq-limpar[hidden]{display:none}" +
    ".ficha-etq{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}.ficha-etq .etq{min-height:32px}" +
    "@media (min-width:900px){.etq-bar{flex-wrap:wrap;overflow:visible}}";
  document.head.appendChild(css);
  var bar = document.createElement("div");
  bar.className = "etq-bar"; bar.id = "etq-bar";
  bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Etiquetas: escolha uma ou mais (o jogo precisa ter todas)");
  var h = '<span class="etq-rot" aria-hidden="true">Etiquetas</span><button type="button" class="etq-limpar" data-etq-limpar hidden>✕ limpar</button>', ultG = null;
  CODS.forEach(function (c) {
    if (ultG !== null && DEF[c].grupo !== ultG) h += '<span class="etq-sep" aria-hidden="true"></span>';
    ultG = DEF[c].grupo;
    h += '<button type="button" class="etq" data-etq="' + c + '" aria-pressed="false" title="' + (GRUPOS[DEF[c].grupo] || "") + '">' + DEF[c].label + ' <span class="n"></span></button>';
  });
  bar.innerHTML = h;
  var ancora = document.querySelector(".chips-b") || document.getElementById("btn-filtros");
  if (ancora) ancora.after(bar); else document.body.prepend(bar);
  var BOT = {};
  bar.querySelectorAll("[data-etq]").forEach(function (b) { BOT[b.dataset.etq] = b; });
  var limparB = bar.querySelector("[data-etq-limpar]");

  function pintar() {
    CODS.forEach(function (c) {
      var b = BOT[c], on = sel.indexOf(c) >= 0, n = cont[c] || 0;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.querySelector(".n").textContent = n.toLocaleString("pt-BR");
      b.classList.toggle("zero", !on && n === 0);
      b.setAttribute("aria-label", DEF[c].label + ", " + n + (n === 1 ? " jogo" : " jogos") + (on ? ", ligada" : ""));
    });
    limparB.hidden = !sel.length;
  }
  function escolhe(c, liga) {
    var i = sel.indexOf(c);
    if (liga === undefined) liga = i < 0;
    if (liga && i < 0) sel.push(c);
    if (!liga && i >= 0) sel.splice(i, 1);
    inter = null; salva(); renderList();
  }
  bar.addEventListener("click", function (e) {
    if (e.target.closest("[data-etq-limpar]")) { sel = []; inter = null; salva(); renderList(); return; }
    var b = e.target.closest("[data-etq]");
    if (b) escolhe(b.dataset.etq);
  });

  // ---------- embrulhos ----------
  var renderAnt = renderList;
  renderList = function () {
    indexa();
    cont = {}; totalVis = 0; ultPos = -1; contando = true;
    try { return renderAnt.apply(this, arguments); }
    finally { contando = false; pintar(); }
  };
  var filtrosAnt = renderFiltros;
  renderFiltros = function () { contando = false; return filtrosAnt.apply(this, arguments); };
  var limparAnt = limparFiltros;
  limparFiltros = function () { sel = []; inter = null; salva(); return limparAnt.apply(this, arguments); };

  var fichaAnt = abrirFicha;
  abrirFicha = function (id) {
    var r = fichaAnt.apply(this, arguments);
    try {
      var fi = document.getElementById("ficha"), g = null;
      for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) { g = DATA[i]; break; }
      if (fi && g && g.et && fi.open) {
        var cods = g.et.split(" ").filter(function (c) { return DEF[c]; });
        if (cods.length) {
          var d = document.createElement("div");
          d.className = "ficha-etq"; d.setAttribute("role", "group"); d.setAttribute("aria-label", "Etiquetas do jogo (toque pra filtrar a lista)");
          d.innerHTML = cods.map(function (c) {
            return '<button type="button" class="etq" data-etq-ficha="' + c + '" aria-pressed="' + (sel.indexOf(c) >= 0) + '">' + DEF[c].label + "</button>";
          }).join("");
          var alvo = fi.querySelector(".ficha-dados");
          if (alvo) alvo.after(d); else (fi.querySelector(".ficha-in") || fi).appendChild(d);
        }
      }
    } catch (e) {}
    return r;
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-etq-ficha]") : null;
    if (!b) return;
    var fi = document.getElementById("ficha");
    if (fi && fi.open && fi.close) fi.close();
    escolhe(b.dataset.etqFicha, true);
    try { bar.scrollIntoView({block: "center", behavior: "smooth"}); var bt = BOT[b.dataset.etqFicha]; if (bt) bt.scrollIntoView({inline: "center", block: "nearest"}); } catch (er) {}
  });

  // primeira pintura (a lista já foi desenhada antes deste módulo carregar)
  renderList();
})();

