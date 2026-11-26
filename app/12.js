/* mod_P_pacotes.js */
// App: o catálogo (18 mil jogos) vem em pacotes por gênero. O app abre com as suas listas e, logo depois,
// em segundo plano, junta TODOS os gêneros (sem precisar clicar em nada). A lista é redesenhada uma vez só,
// no mesmo lugar (busca, filtros, rolagem e ficha aberta continuam como estavam).
// 26/11 (tarde): não dá mais pra "tirar" gênero (confundia com baixar imagens e escondia o catálogo).
//  - Com internet o catálogo vem inteiro, sempre; ele fica guardado sozinho e abre até sem internet.
//  - Gênero que não chegou: aviso bem à vista, embaixo, com "Tentar de novo" (tenta só os que faltaram, sem
//    recarregar a página). Quando a internet volta, tenta sozinho.
//  - O botão "📥 Usar sem internet" abre o painel do mod_I (catálogo + capas e fotos guardadas).
// Também: na capa grande da ficha e no visor, troca a capa diminuída por uma mais nítida.
(function () {
  "use strict";
  var PAC = window.PACOTES || {}, falhou = window.PACOTES_FALHOU || [];
  var CACHE = "estante-pacotes";
  var caixa = document.getElementById("p-pac");
  var ordem = GEN_ORDER.filter(function (g) { return PAC[g]; }).concat(Object.keys(PAC).filter(function (g) { return GEN_ORDER.indexOf(g) < 0; }));
  var ativos = ordem.slice();
  var url = window.PACOTES_URL || function (g) { return "pacotes/" + g + ".js?v=" + PAC[g].v; };
  var feitos = [];   // gêneros já juntados
  function rot(g) { return (GENRES[g] && GENRES[g].label) || g; }
  function mil(n) { return n.toLocaleString("pt-BR"); }
  function carregando() { return !!window.CAT_CARREGANDO; }
  var nCat = ativos.reduce(function (s, g) { return s + (PAC[g].n || 0); }, 0);

  // ---------- estilo do aviso ----------
  var css = document.createElement("style");
  css.textContent = [
    "#p-aviso { position: fixed; left: 12px; right: 12px; bottom: calc(var(--a-barra-h, 64px) + 12px); z-index: 30; max-width: 560px; margin: 0 auto;",
    "  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 12px 14px; border-radius: 14px; border: 2px solid var(--veto);",
    "  background: var(--surface); color: var(--ink); box-shadow: 0 8px 28px rgba(0,0,0,.25); font-size: 15px; }",
    "#p-aviso[hidden] { display: none; }",
    "#p-aviso .p-av-txt { flex: 1 1 220px; }",
    "#p-aviso button { font: inherit; font-weight: 700; min-height: 44px; padding: 6px 14px; border-radius: 10px; cursor: pointer; }",
    "#p-aviso .p-av-sim { background: var(--accent); color: #fff; border: 0; }",
    "#p-aviso .p-av-nao { background: transparent; color: var(--ink); border: 1px solid var(--line); }",
    ".p-txt .p-link { font: inherit; font-weight: 600; color: var(--accent); background: none; border: 0; padding: 4px 2px; cursor: pointer; text-decoration: underline; }",
    ".p-txt.p-falta { color: var(--veto); font-weight: 600; }",
    // o link só aparece quando o botão "📥 Usar sem internet" está escondido (tela do catálogo do mod_L)
    ".p-txt [data-p-off] { display: none; }",
    "html.l-on:not(.l-lista) .p-txt [data-p-off] { display: inline; }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- o texto do topo: o total certo, e um aviso enquanto o catálogo chega ----------
  var resumoAnt = renderResumo;
  // a data vem do texto que o montador grava no topo (pre_lista.py põe a data do dia)
  var ATU = (function () { var s = document.getElementById("sub"), m = s && /Atualizado em ([\d\/]+)/.exec(s.textContent); return m ? m[1] : ""; })();
  renderResumo = function () {
    var r = resumoAnt.apply(this, arguments);
    var sub = document.getElementById("sub");
    if (sub) sub.textContent = carregando()
      ? mil(DATA.length) + " jogos das suas listas já aqui. Chegando o catálogo: mais " + mil(nCat) + " jogos…"
      : mil(DATA.length) + " jogos: as suas listas, as minhas sugestões e o catálogo, juntos." + (ATU ? " Atualizado em " + ATU + "." : "");
    return r;
  };

  // ---------- estado do catálogo (o painel "Usar sem internet" do mod_I lê daqui) ----------
  window.CAT_ESTADO = function () {
    return {ordem: ordem.slice(), feitos: feitos.slice(), falhou: falhou.slice(), carregando: carregando(), jogos: nCat};
  };
  function avisarMudou() { try { document.dispatchEvent(new CustomEvent("estante-cat-estado")); } catch (e) {} }

  function resumo() {
    if (!caixa) return;
    var t, ok = feitos.filter(function (g) { return falhou.indexOf(g) < 0; });
    if (carregando()) t = "Juntando o catálogo… (" + ok.length + " de " + ordem.length + " gêneros)";
    else if (!falhou.length) t = "Catálogo completo: <strong>" + mil(nCat) + " jogos</strong> em " + ordem.length + " gêneros.";
    else t = "Faltam " + falhou.length + " de " + ordem.length + " gêneros do catálogo: " + falhou.map(rot).join(", ") + '. <button type="button" class="p-link" data-p-denovo>Tentar de novo</button>';
    t += ' <button type="button" class="p-link" data-p-off>📥 Usar sem internet</button>';
    var p = caixa.querySelector("p.p-txt");
    if (!p) {
      caixa.insertAdjacentHTML("afterbegin", '<button type="button" class="btn" id="p-abrir">📥 Usar sem internet</button>');
      caixa.insertAdjacentHTML("beforeend", '<p class="p-txt" aria-live="polite"></p>');
      p = caixa.querySelector("p.p-txt");
    }
    p.classList.toggle("p-falta", !carregando() && falhou.length > 0);
    p.innerHTML = t;
    aviso();
    avisarMudou();
  }

  // ---------- aviso bem à vista quando falta parte do catálogo ----------
  var av = document.createElement("div");
  av.id = "p-aviso"; av.setAttribute("role", "alert"); av.hidden = true;
  document.body.appendChild(av);
  var avFechado = "";
  function aviso() {
    var chave = falhou.slice().sort().join(",");
    if (carregando() || !falhou.length || chave === avFechado) { av.hidden = true; return; }
    var semRede = navigator.onLine === false;
    av.innerHTML = '<span class="p-av-txt">⚠ ' + (falhou.length === ordem.length ? "O catálogo não chegou" : "Parte do catálogo não chegou (" + falhou.map(rot).join(", ") + ")") +
      (semRede ? ": você está sem internet. Tento de novo sozinho quando ela voltar." : ". Por isso aparecem menos jogos.") + "</span>" +
      '<button type="button" class="p-av-sim" data-p-denovo>Tentar de novo</button><button type="button" class="p-av-nao" data-p-avfecha>Agora não</button>';
    av.hidden = false;
  }

  // ---------- juntar o catálogo à lista ----------
  var porIdP = {};
  DATA.forEach(function (g) { porIdP[g.id] = g; });
  var lidos = (window.PAC || []).length;   // os pacotes que já vieram (os guardados) o app juntou ao abrir
  function juntarNovos() {
    var lista = window.PAC || [], novos = [];
    for (; lidos < lista.length; lidos++) {
      var p = lista[lidos];
      p.data.forEach(function (g) {
        var v = porIdP[g.id];
        if (v) { if (v.l === 5 && !v.b) Object.assign(v, g); return; }   // já estava (guardado): atualiza no lugar
        porIdP[g.id] = g; DATA.push(g); novos.push(g);
      });
      Object.keys(p.ficha || {}).forEach(function (id) { if (!FICHA[id]) FICHA[id] = p.ficha[id]; });
      Object.keys(p.extra || {}).forEach(function (id) { if (!EXTRA[id]) EXTRA[id] = p.extra[id]; });
      if (feitos.indexOf(p.gn) < 0 && PAC[p.gn]) feitos.push(p.gn);
      var fi = falhou.indexOf(p.gn);
      if (fi >= 0) falhou.splice(fi, 1);   // chegou numa nova tentativa
      lista[lidos] = {gn: p.gn, data: [], ficha: {}, extra: {}};   // solta a memória (os jogos já estão no DATA)
    }
    if (!novos.length) return 0;
    if (typeof juntarOrdemNome === "function") juntarOrdemNome(novos);   // o lugar de cada um no alfabeto
    (window.CAT_AO_CRESCER || []).forEach(function (f) { try { f(novos); } catch (e) {} });
    return novos.length;
  }
  // marcações de jogos que estavam "fora" (o jogo não estava no aparelho) e agora chegaram: voltam pro lugar
  function absorverFora() {
    if (typeof FORA === "undefined") return 0;
    var n = 0, tem = function (id) { return !!porIdP[id]; };
    FORA.sel = FORA.sel.filter(function (id) { if (tem(id) && counted(porIdP[id])) { state.sel.add(id); n++; return false; } return !tem(id); });
    FORA.fav = FORA.fav.filter(function (id) { if (tem(id)) { state.fav.add(id); n++; return false; } return true; });
    ["pl", "mt"].forEach(function (k) {
      Object.keys(FORA[k]).forEach(function (id) { if (tem(id)) { if (!(id in state[k])) state[k][id] = FORA[k][id]; delete FORA[k][id]; n++; } });
    });
    Object.keys(FORA.pls).forEach(function (pid) {
      var p = (state.pls || []).filter(function (x) { return x.id === pid; })[0];
      if (!p) return;
      FORA.pls[pid] = FORA.pls[pid].filter(function (id) { if (tem(id)) { if (p.j.indexOf(id) < 0) p.j.push(id); n++; return false; } return true; });
      if (!FORA.pls[pid].length) delete FORA.pls[pid];
    });
    return n;
  }

  // a sessão de antes (o mod_S regrava em 2 s): se a ficha aberta era de um jogo do catálogo, abre quando ele chegar
  var sesIni = null;
  try { sesIni = JSON.parse(localStorage.getItem(KEY + "-sessao") || "null"); } catch (e) {}
  var mexeu = false;
  ["touchstart", "wheel", "keydown", "pointerdown"].forEach(function (t) { addEventListener(t, function () { mexeu = true; }, {capture: true, passive: true, once: true}); });

  function terminar() {
    var t0 = performance.now();
    window.CAT_CARREGANDO = false;
    var abs = absorverFora();
    try { renderResumo(); renderTiles(); renderMeter(); if (abs) renderPlaylists(); } catch (e) {}
    resumo();
    setTimeout(function () { redesenhar(t0); }, 0);   // a lista numa tarefa à parte: a tela respira entre uma e outra
  }
  function redesenhar(t0) {
    var y0 = window.scrollY;
    renderList();   // o mod_G segura a lista no mesmo jogo
    // continuar de onde parou: rolagem e ficha de um jogo do catálogo (só na 1ª vez e se você ainda não mexeu)
    if (sesIni && !mexeu) {
      var f = document.getElementById("ficha");
      if (sesIni.ficha && porIdP[sesIni.ficha] && f && !f.open) { try { abrirFicha(sesIni.ficha); } catch (e) {} }
      if (sesIni.y && y0 < sesIni.y - 4 && !(f && f.open)) window.scrollTo(0, sesIni.y);
    }
    sesIni = null;
    window.CAT_PRONTO_EM = Math.round(performance.now());   // pra medir: catálogo inteiro na tela
    if (window.CAT_TEMPOS) window.CAT_TEMPOS.push(["redesenho", Math.round(t0), Math.round(performance.now() - t0)]);
    guardarNoCache();
    try { document.dispatchEvent(new CustomEvent("estante-catalogo", {detail: {jogos: DATA.length}})); } catch (e) {}
  }

  // os pacotes ficam no cache (o service worker também guarda; aqui garante, caso ele ainda não estivesse ativo)
  function guardarNoCache() {
    if (!("caches" in window)) return;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    caches.open(CACHE).then(function (c) {
      return c.keys().then(function (ks) {
        var tem = {};
        ks.forEach(function (k) { tem[new URL(k.url).pathname.split("/").pop() + new URL(k.url).search] = 1; });
        var vai = feitos.filter(function (g) { return falhou.indexOf(g) < 0 && !tem[url(g).split("/").pop()]; });
        // um por vez, sem pressa
        return vai.reduce(function (pr, g) { return pr.then(function () { return c.add(url(g)).catch(function () {}); }); }, Promise.resolve());
      });
    }).catch(function () {});
  }

  function rodar(lista) {
    var T = window.CAT_TEMPOS = window.CAT_TEMPOS || [["começo", Math.round(performance.now())]];
    var depoisDeCada = function (i) { var t0 = performance.now(); try { juntarNovos(); } catch (e) {} resumo(); if (i != null) T.push([lista[i], Math.round(t0), Math.round(performance.now() - t0)]); };
    window.CAT_CARREGANDO = true;
    resumo();
    window.CAT_RODAR(lista.map(url), function (s) {
      var g = s.split("/")[1].split(".")[0];
      if (falhou.indexOf(g) < 0) falhou.push(g);
      return true;
    }, function () { depoisDeCada(); terminar(); }, depoisDeCada);
  }
  window.CAT_COMECAR = function () {
    if (!ativos.length) { window.CAT_CARREGANDO = false; resumo(); renderResumo(); return; }
    rodar(ativos);
  };
  // de novo, só os que faltaram (sem recarregar a página: filtros, rolagem e ficha ficam como estão)
  var tentando = false;
  function tentarDeNovo() {
    if (tentando || carregando() || !falhou.length) return;
    tentando = true;
    var lista = falhou.slice();
    falhou.length = 0;
    avFechado = "";
    rodar(lista);
    var esp = function () { if (carregando()) setTimeout(esp, 300); else tentando = false; };
    esp();
  }
  window.CAT_TENTAR = tentarDeNovo;
  window.addEventListener("online", function () { setTimeout(tentarDeNovo, 800); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && falhou.length && navigator.onLine !== false) tentarDeNovo(); });

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "p-abrir" || t.hasAttribute("data-p-off")) { if (window.I_abrir) window.I_abrir(); return; }
    if (t.hasAttribute("data-p-denovo")) { tentarDeNovo(); return; }
    if (t.hasAttribute("data-p-avfecha")) { avFechado = falhou.slice().sort().join(","); av.hidden = true; return; }
  });

  // ---------- capa nítida na ficha e no visor ----------
  function nitidaP(im, w) {
    var s = im.getAttribute("src");
    if (!s || s.indexOf("https://wsrv.nl/?url=") !== 0 || s.indexOf("&w=" + w + "&") >= 0) return;
    var c = navigator.connection;
    if ((c && c.saveData) || navigator.onLine === false) return;
    var novo = s.replace(/&w=\d+&/, "&w=" + w + "&");
    var pre = new Image();
    pre.referrerPolicy = "no-referrer";
    pre.onload = function () { if (im.isConnected && im.getAttribute("src") === s) im.setAttribute("src", novo); };
    pre.src = novo;
  }
  function melhorar() {
    var h = document.querySelector("#ficha .f-heroi-capa img");
    if (h) nitidaP(h, 900);
    document.querySelectorAll("#visor[open] .vz-slide img").forEach(function (im) { nitidaP(im, 1280); });
  }
  document.addEventListener("click", function () { setTimeout(melhorar, 60); setTimeout(melhorar, 400); }, true);

  resumo();
  try { renderResumo(); } catch (e) {}
  var car = document.getElementById("carregando");
  if (car) car.remove();
})();

