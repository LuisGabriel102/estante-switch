/* mod_A_navegar.js */
(function () {
  "use strict";
  // ---------- ajudantes ----------
  var K_COPIA = KEY + "-A-copia";   // {n: mudanças desde a cópia, ult: data da última cópia, adiar: n a partir do qual avisar}
  var K_POS = KEY + "-A-pos";       // onde parou
  function lerJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  var LIM = 20;

  // ---------- 1 e 2: cópia no Drive e lembrete ----------
  var cp = lerJSON(K_COPIA) || {};
  cp.n = cp.n || 0; cp.adiar = cp.adiar || LIM;
  var ultTxt = null;
  try { ultTxt = localStorage.getItem(KEY); } catch (e) {}

  // linha com o botão grande, antes do bloco "Guardar uma cópia"
  var det = document.querySelector("#pl-painel .mais-info");
  var linha = document.createElement("div");
  linha.className = "a-drive-linha";
  linha.innerHTML = '<button type="button" class="a-drive-btn" id="a-drive">Salvar cópia no Drive</button>' +
    '<p class="a-drive-info" id="a-drive-info"></p>';
  if (det) det.parentNode.insertBefore(linha, det); else $("pl-painel").appendChild(linha);

  var lem = document.createElement("div");
  lem.className = "a-lembrete"; lem.id = "a-lembrete"; lem.hidden = true;
  lem.setAttribute("role", "status");
  lem.innerHTML = '<span id="a-lem-txt"></span><button type="button" class="a-sim" id="a-lem-sim">Salvar agora</button>' +
    '<button type="button" id="a-lem-dep">Depois</button>';
  document.body.appendChild(lem);

  function dataCurtaA(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"});
  }
  function atualizarInfo() {
    $("a-drive-info").textContent = (cp.ult ? "Última cópia: " + dataCurtaA(cp.ult) + ". " : "Você ainda não salvou nenhuma cópia. ") +
      (cp.n ? cp.n + (cp.n === 1 ? " mudança" : " mudanças") + " desde então." : "Nada mudou desde então.");
  }
  function ajustarBarraH() {
    var b = $("barra");
    document.documentElement.style.setProperty("--a-barra-h", (b ? b.offsetHeight : 70) + "px");
  }
  function mostrarLembrete() {
    var deve = cp.n >= cp.adiar;
    if (deve && lem.hidden) {
      ajustarBarraH();
      $("a-lem-txt").textContent = cp.n + " mudanças sem cópia. Salvar no Drive?";
    }
    lem.hidden = !deve;
  }
  atualizarInfo(); mostrarLembrete();

  var salvando = false;
  function msg(t) { var m = $("pl-msg"); if (m) m.textContent = t; var i = $("a-drive-info"); if (i) i.textContent = t; }
  function feito() {
    cp.n = 0; cp.adiar = LIM; cp.ult = new Date().toISOString();
    gravar(K_COPIA, cp); lem.hidden = true;
  }
  function baixar(txt, nome) {
    var url = URL.createObjectURL(new Blob([txt], {type: "application/json"}));
    var l = document.createElement("a");
    l.href = url; l.download = nome;
    document.body.appendChild(l); l.click(); l.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function salvarNoDrive() {
    if (salvando) return;
    salvando = true;
    try { save(); } catch (e) {}
    var txt = null;
    try { txt = localStorage.getItem(KEY); } catch (e) {}
    if (!txt) txt = JSON.stringify({sel: Array.from(state.sel), fav: Array.from(state.fav), cap: state.cap, view: state.view, agrupar: state.agrupar, mt: state.mt, pl: state.pl, pls: state.pls, plsIni: true, c256: true});
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    var nome = "estante-marcacoes-" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + ".json";
    var arq = null;
    try { arq = new File([txt], nome, {type: "application/json"}); } catch (e) {}
    var podeCompartilhar = false;
    try { podeCompartilhar = !!(arq && navigator.share && navigator.canShare && navigator.canShare({files: [arq]})); } catch (e) {}
    if (podeCompartilhar) {
      navigator.share({files: [arq], title: "Estante do Switch: marcações"}).then(function () {
        feito(); atualizarInfo(); msg("Cópia enviada: " + nome + ".");
      }).catch(function (err) {
        if (err && err.name === "AbortError") { msg("Cópia cancelada. Nada foi salvo."); return; }
        baixar(txt, nome); feito(); msg("Cópia baixada: " + nome + ".");
      }).then(function () { salvando = false; atualizarInfo2(); });
    } else {
      baixar(txt, nome); feito(); msg("Cópia baixada: " + nome + ".");
      salvando = false;
    }
  }
  function atualizarInfo2() { /* mantém a mensagem do resultado por alguns segundos, depois mostra o resumo */ setTimeout(atualizarInfo, 6000); }
  $("a-drive").addEventListener("click", salvarNoDrive);
  $("a-lem-sim").addEventListener("click", salvarNoDrive);
  $("a-lem-dep").addEventListener("click", function () { cp.adiar = cp.n + LIM; gravar(K_COPIA, cp); lem.hidden = true; });
  // o "Baixar cópia" antigo também conta como cópia feita
  $("pl-exportar").addEventListener("click", function () { feito(); atualizarInfo(); });
  window.addEventListener("resize", ajustarBarraH);

  // conta mudanças reais: só quando o que foi gravado mudou
  var _save = save;
  save = function () {
    _save.apply(this, arguments);
    var t = null;
    try { t = localStorage.getItem(KEY); } catch (e) {}
    if (t !== ultTxt) {
      ultTxt = t; cp.n++; gravar(K_COPIA, cp); atualizarInfo(); mostrarLembrete();
    }
  };

  // ---------- 5: rolagem sem fim ----------
  var pausaMais = true;       // fica ligada até a posição ser restaurada
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (es) {
      if (pausaMais) return;
      es.forEach(function (e) {
        var b = e.target;
        if (!e.isIntersecting || !b.isConnected) return;
        io.unobserve(b);
        b.click();
        // depois do clique o botão pode continuar perto: olha de novo
        setTimeout(function () { if (b.isConnected) io.observe(b); }, 200);
      });
    }, {rootMargin: "800px 0px"});
  }
  function observarMais() {
    if (!io) return;
    io.disconnect();
    document.querySelectorAll("button[data-mais]").forEach(function (b) { io.observe(b); });
  }
  var _renderList = renderList;
  renderList = function () {
    _renderList.apply(this, arguments);
    observarMais();
  };

  // ---------- 3: voltar onde parou ----------
  var CAMPOS = [ // id do campo, chave no state, tipo
    ["busca", "q", "txt"], ["lista", "list", "sel"], ["genero", "genre", "sel"], ["romance", "rom", "sel"],
    ["minha", "minha", "sel"], ["plano", "plano", "sel"], ["duracao", "dur", "sel"], ["idioma", "idioma", "sel"],
    ["tamanho", "size", "sel"], ["ordem", "sort", "sel"],
    ["so-destaque", "onlyHype", "chk"], ["so-interesse", "onlyFav", "chk"], ["so-marcados", "onlyMarked", "chk"], ["so-novos", "onlyNew", "chk"]
  ];
  var pronto = false;
  function posAtual() {
    var o = {y: Math.round(window.scrollY), t: Date.now(), f: {}, limS: {}};
    CAMPOS.forEach(function (c) { o.f[c[1]] = state[c[1]]; });
    o.status = state.status || null;
    o.plAtiva = state.plAtiva || null;
    var ls = state.limS || {};
    Object.keys(ls).forEach(function (k) { if (ls[k] > PASSO) o.limS[k] = ls[k]; });
    // grupo no alto da tela e a distância dentro dele
    var gs = document.querySelectorAll("#lista-jogos .group"), alvo = null;
    for (var i = 0; i < gs.length; i++) { if (gs[i].getBoundingClientRect().top <= 1) alvo = gs[i]; else break; }
    if (alvo && alvo.id) { o.g = alvo.id; o.gd = Math.round(-alvo.getBoundingClientRect().top); }
    return o;
  }
  var tPos = 0;
  function gravarPos() { if (!pronto) return; clearTimeout(tPos); tPos = 0; gravar(K_POS, posAtual()); }
  function agendarPos() { if (!pronto) return; clearTimeout(tPos); tPos = setTimeout(gravarPos, 500); }
  window.addEventListener("scroll", agendarPos, {passive: true});
  ["change", "input"].forEach(function (ev) { document.addEventListener(ev, agendarPos, true); });
  document.addEventListener("click", agendarPos, true);
  window.addEventListener("pagehide", gravarPos);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") gravarPos(); });

  function restaurar() {
    var s = lerJSON(K_POS);
    try { history.scrollRestoration = "manual"; } catch (e) {}
    try {
      if (s && typeof s === "object") {
        var mudou = false;
        var f = s.f || {};
        CAMPOS.forEach(function (c) {
          var el = $(c[0]), v = f[c[1]];
          if (!el || v === undefined) return;
          if (c[2] === "chk") { v = !!v; if (state[c[1]] !== v) { state[c[1]] = v; el.checked = v; mudou = true; } }
          else {
            v = String(v);
            if (c[2] === "sel" && !Array.prototype.some.call(el.options, function (o) { return o.value === v; })) return;
            if (state[c[1]] !== v) { state[c[1]] = v; mudou = true; }
            el.value = v;
          }
        });
        var st = s.status;
        if (st && document.querySelector('.tile[data-status="' + st + '"]') && state.status !== st) { state.status = st; mudou = true; }
        if (s.plAtiva && state.pls.some(function (p) { return p.id === s.plAtiva; }) && state.plAtiva !== s.plAtiva) { state.plAtiva = s.plAtiva; mudou = true; }
        if (s.limS && typeof s.limS === "object") {
          state.limS = state.limS || {};
          Object.keys(s.limS).forEach(function (k) {
            var n = Number(s.limS[k]);
            if (n > PASSO && n < 100000 && state.limS[k] !== n) { state.limS[k] = n; mudou = true; }
          });
        }
        if (mudou) {
          if (typeof renderTiles === "function") renderTiles();
          if (typeof renderPlaylists === "function") renderPlaylists();
          renderList();
        }
        var go = function () {
          var y = Number(s.y) || 0;
          if (s.g) {
            var el = document.getElementById(s.g);
            if (el) y = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY + (Number(s.gd) || 0)));
          }
          window.scrollTo(0, y);
          return Math.round(window.scrollY);
        };
        if (s.y > 0) {
          var y1 = go();
          // imagens e fontes podem mexer na altura: tenta de novo uma vez, se a pessoa ainda não rolou
          setTimeout(function () { if (Math.abs(window.scrollY - y1) < 3) go(); }, 500);
        }
      }
    } catch (e) { /* lista mudou: segue sem restaurar */ }
    pausaMais = false;
    observarMais();
    pronto = true;
  }

  // ---------- 9: botão voltar do Android fecha a ficha ----------
  var fichaEl = $("ficha"), empurrou = false;
  try { if (history.state && history.state.ficha) history.replaceState(null, ""); } catch (e) {}
  var _abrirFicha = abrirFicha;
  abrirFicha = function (id) {
    _abrirFicha.apply(this, arguments);
    if (fichaEl && fichaEl.open && !empurrou) {
      try { history.pushState({ficha: id}, ""); empurrou = true; } catch (e) {}
    }
  };
  window.addEventListener("popstate", function () {
    if (empurrou) { empurrou = false; if (fichaEl && fichaEl.open) fichaEl.close(); }
  });
  if (fichaEl) fichaEl.addEventListener("close", function () {
    if (empurrou) { empurrou = false; try { history.back(); } catch (e) {} }
  });

  // ---------- 10: busca fixa no alto (celular) ----------
  var barraBusca = document.createElement("div");
  barraBusca.id = "a-busca-fixa";
  barraBusca.innerHTML = '<input type="search" id="a-busca2" placeholder="Buscar jogo" aria-label="Buscar jogo" enterkeyhint="search" autocomplete="off">';
  document.body.appendChild(barraBusca);
  var busca = $("busca"), busca2 = $("a-busca2");
  var curto = window.matchMedia("(max-width: 699px)");
  function mostrarBusca(sim) {
    if (!curto.matches) sim = false;
    if (!sim && document.activeElement === busca2) return;   // não tira enquanto digita
    if (barraBusca.classList.contains("on") === sim) return;
    barraBusca.classList.toggle("on", sim);
    document.documentElement.style.setProperty("--a-busca-h", sim ? barraBusca.offsetHeight + "px" : "0px");
  }
  var rafB = 0;
  window.addEventListener("scroll", function () {
    if (rafB) return;
    rafB = requestAnimationFrame(function () { rafB = 0; mostrarBusca(busca.getBoundingClientRect().bottom <= 0); });
  }, {passive: true});
  busca2.addEventListener("blur", function () {
    var r = busca.getBoundingClientRect();
    mostrarBusca(r.bottom <= 0);
  });
  busca2.addEventListener("keydown", function (e) { if (e.key === "Enter") busca2.blur(); });
  function irAoInicio() {
    var a = document.querySelector(".area-jogos");
    if (!a) return;
    var topo = a.getBoundingClientRect().top;
    var altBusca = barraBusca.classList.contains("on") ? barraBusca.offsetHeight : 0;
    if (topo < altBusca) window.scrollTo(0, Math.max(0, Math.round(topo + window.scrollY - altBusca)));
  }
  busca2.addEventListener("input", function () {
    busca.value = busca2.value;
    busca.dispatchEvent(new Event("input", {bubbles: true}));
    irAoInicio();
  });
  busca.addEventListener("input", function () {
    if (busca2.value !== busca.value) busca2.value = busca.value;
  });
  curto.addEventListener && curto.addEventListener("change", function () { mostrarBusca(false); });

  // ---------- começo ----------
  ajustarBarraH();
  restaurar();
  busca2.value = busca.value;
})();

