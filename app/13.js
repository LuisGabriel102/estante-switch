/* mod_S_sessao.js */
// 1) Continua de onde parou: busca, filtros, "Mostrar mais", a posição da tela e a ficha aberta voltam iguais.
// 2) Histórico: fichas que você abriu, marcações, estrelas, planos e playlists, com dia e hora.
(function () {
  "use strict";
  var SES = KEY + "-sessao", HIS = KEY + "-historico", MAX = 2000;
  var CAMPOS = ["q", "status", "list", "sort", "genre", "rom", "minha", "size", "plano", "dur", "idioma", "onlyHype", "onlyFav", "onlyMarked", "onlyNew", "plAtiva"];
  var SELECTS = {busca: "q", lista: "list", genero: "genre", romance: "rom", minha: "minha", tamanho: "size", plano: "plano", duracao: "dur", idioma: "idioma", ordem: "sort"};
  var CHECKS = {"so-destaque": "onlyHype", "so-interesse": "onlyFav", "so-marcados": "onlyMarked", "so-novos": "onlyNew"};
  var porId = {};
  DATA.forEach(function (g) { porId[g.id] = g; }); (window.CAT_AO_CRESCER || []).push(function (novos) { novos.forEach(function (g) { porId[g.id] = g; }); });
  var fichaId = null, restaurando = true;

  // ---------- histórico ----------
  var his = [];
  try { his = JSON.parse(localStorage.getItem(HIS) || "[]"); if (!Array.isArray(his)) his = []; } catch (e) { his = []; }
  function gravarHis() { try { localStorage.setItem(HIS, JSON.stringify(his.slice(-MAX))); } catch (e) {} }
  function anotar(a, id, x) {
    var ult = his[his.length - 1], agora = Date.now();
    // abrir a mesma ficha de novo em 10 min não repete
    if (a === "ficha" && ult && ult.a === "ficha" && ult.id === id && agora - ult.t < 600000) return;
    var e = {t: agora, a: a};
    if (id) e.id = id;
    if (x !== undefined) e.x = x;
    his.push(e);
    if (his.length > MAX) his = his.slice(-MAX);
    gravarHis();
  }
  window.S_historico = function () { return his.slice(); };

  function fotoMarcas() {
    var pl = {};
    Object.keys(state.pl || {}).forEach(function (id) { pl[id] = JSON.stringify(state.pl[id]); });
    var pls = {};
    (state.pls || []).forEach(function (p) { pls[p.id] = {n: p.n, j: p.j.slice()}; });
    return {sel: new Set(state.sel), fav: new Set(state.fav), pl: pl, pls: pls};
  }
  var antes = fotoMarcas();
  function diferencas() {
    var d = fotoMarcas(), muitos = [];
    function conj(a, b, sim, nao) {
      var mais = [], menos = [];
      b.forEach(function (id) { if (!a.has(id)) mais.push(id); });
      a.forEach(function (id) { if (!b.has(id)) menos.push(id); });
      if (mais.length > 15) anotar(sim + "-varios", null, mais.length); else mais.forEach(function (id) { anotar(sim, id); });
      if (menos.length > 15) anotar(nao + "-varios", null, menos.length); else menos.forEach(function (id) { anotar(nao, id); });
    }
    conj(antes.sel, d.sel, "marcou", "desmarcou");
    conj(antes.fav, d.fav, "estrela", "sem-estrela");
    Object.keys(d.pl).forEach(function (id) {
      if (d.pl[id] === antes.pl[id]) return;
      var n = state.pl[id] || {}, v = {};
      try { v = JSON.parse(antes.pl[id] || "{}"); } catch (e) {}
      ["w", "q", "j"].forEach(function (k) { if ((n[k] || 0) !== (v[k] || 0)) anotar("plano", id, k + (n[k] ? "+" : "-")); });
    });
    Object.keys(d.pls).forEach(function (pid) {
      var a = antes.pls[pid] ? antes.pls[pid].j : [], b = d.pls[pid].j;
      b.forEach(function (id) { if (a.indexOf(id) < 0) anotar("pl+", id, d.pls[pid].n); });
      a.forEach(function (id) { if (b.indexOf(id) < 0) anotar("pl-", id, d.pls[pid].n); });
    });
    antes = d;
  }
  // jogos do catálogo que você marcou depois: guardados neste aparelho, aparecem mesmo sem o gênero baixado
  var GUARD = KEY + "-guardados";
  function guardarCat() {
    var ids = new Set();
    state.sel.forEach(function (id) { ids.add(id); });
    state.fav.forEach(function (id) { ids.add(id); });
    Object.keys(state.pl || {}).forEach(function (id) { ids.add(id); });
    Object.keys(state.mt || {}).forEach(function (id) { ids.add(id); });
    (state.pls || []).forEach(function (p) { p.j.forEach(function (id) { ids.add(id); }); });
    var gu = {};
    try { gu = JSON.parse(localStorage.getItem(GUARD) || "{}") || {}; } catch (e) { gu = {}; }
    var novo = {}, mudou = false;
    ids.forEach(function (id) {
      var g = porId[id];
      if (g && g.l === 5 && !g.b) {
        novo[id] = gu[id] || {g: JSON.parse(JSON.stringify(g)), f: FICHA[id] || null, x: EXTRA[id] || null};
        if (!gu[id]) mudou = true;
      } else if (!g && gu[id]) novo[id] = gu[id];  // gênero não baixado agora: continua guardado
    });
    if (Object.keys(gu).some(function (id) { return !novo[id]; })) mudou = true;
    if (mudou) try { localStorage.setItem(GUARD, JSON.stringify(novo)); } catch (e) {}
  }
  var saveAnt = save;
  save = function () {
    var r = saveAnt.apply(this, arguments);
    try { diferencas(); } catch (e) {}
    try { guardarCat(); } catch (e) {}
    atualizarInteresse();
    return r;
  };

  // botão bem à vista: só os jogos que te interessam (com estrela)
  function atualizarInteresse() {
    var b = document.getElementById("s-interesse");
    if (!b) return;
    b.textContent = state.onlyFav ? "★ Mostrando só os que me interessam (" + state.fav.size + ") · ver todos" : "★ Ver só os que me interessam (" + state.fav.size + ")";
    b.setAttribute("aria-pressed", state.onlyFav ? "true" : "false");
  }
  window.S_interesse = atualizarInteresse;

  var abrirAnt = abrirFicha;
  abrirFicha = function (id) {
    var r = abrirAnt.apply(this, arguments);
    if (porId[id]) { fichaId = id; if (!restaurando) anotar("ficha", id); guardarSessao(); }
    return r;
  };
  ficha.addEventListener("close", function () { fichaId = null; guardarSessao(); });

  var buscaT = 0, ultBusca = "";
  document.getElementById("busca").addEventListener("input", function (e) {
    clearTimeout(buscaT);
    buscaT = setTimeout(function () {
      var q = e.target.value.trim();
      if (q.length >= 3 && q !== ultBusca) { ultBusca = q; anotar("busca", null, q); }
    }, 2500);
  });

  // ---------- continuar de onde parou ----------
  function guardarSessao() {
    if (restaurando) return;
    var o = {t: Date.now(), y: Math.round(window.scrollY), ficha: fichaId, limS: state.limS || {}};
    CAMPOS.forEach(function (k) { o[k] = state[k]; });
    try { localStorage.setItem(SES, JSON.stringify(o)); } catch (e) {}
  }
  var rolT = 0;
  window.addEventListener("scroll", function () { clearTimeout(rolT); rolT = setTimeout(guardarSessao, 300); }, {passive: true});
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") guardarSessao(); });
  window.addEventListener("pagehide", guardarSessao);
  document.addEventListener("change", function () { setTimeout(guardarSessao, 50); }, true);
  document.addEventListener("click", function () { setTimeout(guardarSessao, 150); }, true);
  document.addEventListener("input", function () { clearTimeout(rolT); rolT = setTimeout(guardarSessao, 600); }, true);

  function restaurar() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SES) || "null"); } catch (e) { s = null; }
    if (!s || typeof s !== "object") return;
    CAMPOS.forEach(function (k) { if (k in s) state[k] = s[k]; });
    if (s.limS && typeof s.limS === "object") state.limS = s.limS;
    Object.keys(SELECTS).forEach(function (el) {
      var c = document.getElementById(el), k = SELECTS[el];
      if (!c) return;
      if (c.tagName === "SELECT") {
        var tem = Array.prototype.some.call(c.options, function (o) { return o.value === String(state[k]); });
        if (!tem) state[k] = c.value;  // opção que sumiu (gênero apagado, por exemplo): fica o padrão
        else c.value = state[k];
      } else c.value = state[k] || "";
    });
    Object.keys(CHECKS).forEach(function (el) { var c = document.getElementById(el); if (c) c.checked = !!state[CHECKS[el]]; });
    if (state.plAtiva && !(state.pls || []).some(function (p) { return p.id === state.plAtiva; })) state.plAtiva = null;
    try { renderPlaylists(); renderTiles(); renderList(); } catch (e) {}
    var y = s.y || 0, mexeu = false;
    var parar = function () { mexeu = true; };
    window.addEventListener("touchstart", parar, {passive: true, once: true});
    window.addEventListener("wheel", parar, {passive: true, once: true});
    [0, 250, 800, 1600].forEach(function (ms) {
      setTimeout(function () { if (!mexeu && Math.abs(window.scrollY - y) > 4) window.scrollTo(0, y); }, ms);
    });
    if (s.ficha && porId[s.ficha]) setTimeout(function () { try { abrirFicha(s.ficha); } catch (e) {} }, 300);
  }
  try { restaurar(); } catch (e) {}
  setTimeout(function () { restaurando = false; guardarSessao(); }, 1800);

  // ---------- tela do histórico ----------
  var caixa = document.getElementById("p-pac");
  if (caixa) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn"; b.id = "s-abrir"; b.textContent = "🕘 Histórico";
    var pa = document.getElementById("p-abrir");
    if (pa) pa.insertAdjacentElement("afterend", b); else caixa.prepend(b);
    var bi = document.createElement("button");
    bi.type = "button"; bi.className = "btn s-int"; bi.id = "s-interesse";
    caixa.prepend(bi);
    atualizarInteresse();
  }
  document.addEventListener("change", function (e) { if (e.target && e.target.id === "so-interesse") atualizarInteresse(); });
  try { guardarCat(); } catch (e) {}
  var dlg = document.createElement("dialog");
  dlg.id = "s-dlg"; dlg.setAttribute("aria-labelledby", "s-tit");
  document.body.appendChild(dlg);
  var filtro = "tudo";
  var TXT = {
    ficha: "Abriu a ficha", marcou: "✓ Marcou", desmarcou: "Desmarcou", estrela: "★ Deu estrela", "sem-estrela": "Tirou a estrela",
    busca: "🔍 Buscou", "pl+": "🎵 Pôs na playlist", "pl-": "Tirou da playlist"
  };
  var PLANO = {"w+": "▶ Quero jogar", "w-": "Tirou de Quero jogar", "q+": "✎ Quero traduzir", "q-": "Tirou de Quero traduzir", "j+": "✔ Já joguei", "j-": "Tirou de Já joguei"};
  function dia(t) {
    var d = new Date(t), h = new Date(), o = new Date(); o.setDate(h.getDate() - 1);
    if (d.toDateString() === h.toDateString()) return "Hoje";
    if (d.toDateString() === o.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", {weekday: "long", day: "numeric", month: "long"});
  }
  function hora(t) { return new Date(t).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"}); }
  function linha(e) {
    var g = e.id && porId[e.id], o;
    if (e.a === "plano") o = PLANO[e.x] || "Plano";
    else if (/-varios$/.test(e.a)) o = {"marcou-varios": "✓ Marcou ", "desmarcou-varios": "Desmarcou ", "estrela-varios": "★ Deu estrela em ", "sem-estrela-varios": "Tirou a estrela de "}[e.a] + e.x + " jogos de uma vez";
    else o = TXT[e.a] || e.a;
    var nome = g ? esc(g.n) : (e.id ? '<span class="s-fora">jogo de um gênero não baixado</span>' : "");
    if (e.a === "busca") nome = "“" + esc(e.x) + "”";
    if (e.a === "pl+" || e.a === "pl-") o += " “" + esc(e.x) + "”";
    var capa = g && g.img ? '<img src="' + esc(imgURL(g.img)) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="s-sem"></span>';
    var tag = g ? "button" : "div";
    return "<" + tag + (g ? ' type="button" data-s-ficha="' + esc(e.id) + '"' : "") + ' class="s-lin">' + capa +
      '<span class="s-txt"><span class="s-o">' + o + '</span><span class="s-n">' + nome + '</span></span><span class="s-h">' + hora(e.t) + "</span></" + tag + ">";
  }
  function desenhar() {
    var lista = his.slice().reverse().filter(function (e) {
      if (filtro === "fichas") return e.a === "ficha";
      if (filtro === "marcas") return e.a !== "ficha" && e.a !== "busca";
      return true;
    }).slice(0, 400);
    var html = "", d0 = "";
    lista.forEach(function (e) { var d = dia(e.t); if (d !== d0) { html += '<h3 class="s-dia">' + d + "</h3>"; d0 = d; } html += linha(e); });
    var vistos = {};
    his.forEach(function (e) { if (e.a === "ficha") vistos[e.id] = 1; });
    dlg.innerHTML = '<div class="p-in"><div class="p-topo"><h2 id="s-tit">Histórico</h2><button type="button" class="p-x" data-s-fechar aria-label="Fechar">✕</button></div>' +
      "<p>" + (function (n) { return n === 1 ? "1 ficha aberta" : n + " fichas diferentes abertas"; })(Object.keys(vistos).length) + " neste aparelho. Toque num jogo para abrir a ficha.</p>" +
      '<div class="s-filtros" role="group" aria-label="Mostrar">' +
      [["tudo", "Tudo"], ["fichas", "Fichas abertas"], ["marcas", "Marcações"]].map(function (f) {
        return '<button type="button" class="btn" data-s-filtro="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + "</button>";
      }).join("") + "</div>" +
      (html || '<p class="s-vazio">Nada ainda. Abra fichas, marque jogos e dê estrelas: tudo aparece aqui.</p>') +
      (his.length ? '<button type="button" class="btn s-apagar" data-s-apagar>Apagar o histórico</button>' : "") + "</div>";
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "s-interesse") {
      state.onlyFav = !state.onlyFav;
      var c = document.getElementById("so-interesse");
      if (c) c.checked = state.onlyFav;
      renderList(); atualizarInteresse(); guardarSessao();
      var alvo = document.getElementById("mostrando");
      if (alvo) alvo.scrollIntoView({block: "start"});
      return;
    }
    if (t.id === "s-abrir") { filtro = "tudo"; desenhar(); dlg.showModal(); return; }
    if (t.hasAttribute("data-s-fechar")) { dlg.close(); return; }
    if (t.dataset.sFiltro) { filtro = t.dataset.sFiltro; desenhar(); return; }
    if (t.dataset.sFicha) { dlg.close(); abrirFicha(t.dataset.sFicha); return; }
    if (t.hasAttribute("data-s-apagar")) {
      if (t.dataset.certeza) { his = []; gravarHis(); desenhar(); }
      else { t.dataset.certeza = "1"; t.textContent = "Toque de novo para apagar tudo"; }
    }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
})();

