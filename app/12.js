/* mod_P_pacotes.js */
// App: o catálogo (18 mil jogos) vem em pacotes por gênero. O app abre com as suas listas e, logo depois,
// em segundo plano, junta TODOS os gêneros (sem precisar clicar em nada). A lista é redesenhada uma vez só,
// no mesmo lugar (busca, filtros, rolagem e ficha aberta continuam como estavam).
// "📦 Gêneros do catálogo" serve pra tirar algum gênero (ou pôr de volta) neste aparelho.
// Também: na capa grande da ficha e no visor, troca a capa diminuída por uma mais nítida.
(function () {
  "use strict";
  var PAC = window.PACOTES || {}, fora = (window.PACOTES_FORA || []).slice(), falhou = window.PACOTES_FALHOU || [];
  var CHAVE = "estante-switch-v1-pacotes-fora", CACHE = "estante-pacotes";
  var caixa = document.getElementById("p-pac");
  var ordem = GEN_ORDER.filter(function (g) { return PAC[g]; }).concat(Object.keys(PAC).filter(function (g) { return GEN_ORDER.indexOf(g) < 0; }));
  var ativos = ordem.filter(function (g) { return fora.indexOf(g) < 0; });
  var url = window.PACOTES_URL || function (g) { return "pacotes/" + g + ".js?v=" + PAC[g].v; };
  var feitos = [];   // gêneros já juntados
  function rot(g) { return (GENRES[g] && GENRES[g].label) || g; }
  function mil(n) { return n.toLocaleString("pt-BR"); }
  function mb(kb) { return kb >= 1024 ? (kb / 1024).toFixed(1).replace(".", ",") + " MB" : kb + " KB"; }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(fora)); } catch (e) {} }
  function carregando() { return !!window.CAT_CARREGANDO; }
  var nCat = ativos.reduce(function (s, g) { return s + (PAC[g].n || 0); }, 0);

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

  function resumo() {
    if (!caixa) return;
    var t, ok = feitos.filter(function (g) { return falhou.indexOf(g) < 0; });
    if (carregando()) t = "Juntando o catálogo… (" + feitos.length + " de " + ativos.length + " gêneros)";
    else if (!ativos.length) t = "Catálogo desligado neste aparelho: aparecem só as suas listas.";
    else if (!fora.length && ok.length === ordem.length) t = "Catálogo completo: <strong>" + mil(nCat) + " jogos</strong> em " + ordem.length + " gêneros.";
    else t = "Catálogo: " + ok.length + " de " + ordem.length + " gêneros" + (fora.length ? " (tirados: " + fora.map(rot).join(", ") + ")" : "") + ".";
    if (falhou.length) t += ' <span class="p-erro">Não abriu: ' + falhou.map(rot).join(", ") + ' (sem internet?). <button type="button" class="limpar" data-p-denovo>Tentar de novo</button></span>';
    var p = caixa.querySelector("p.p-txt");
    if (!p) {
      caixa.insertAdjacentHTML("afterbegin", '<button type="button" class="btn" id="p-abrir">📦 Gêneros do catálogo</button>');
      caixa.insertAdjacentHTML("beforeend", '<p class="p-txt" aria-live="polite"></p>');
      p = caixa.querySelector("p.p-txt");
    }
    p.innerHTML = t;
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
    // continuar de onde parou: rolagem e ficha de um jogo do catálogo (só se você ainda não mexeu)
    if (sesIni && !mexeu) {
      var f = document.getElementById("ficha");
      if (sesIni.ficha && porIdP[sesIni.ficha] && f && !f.open) { try { abrirFicha(sesIni.ficha); } catch (e) {} }
      if (sesIni.y && y0 < sesIni.y - 4 && !(f && f.open)) window.scrollTo(0, sesIni.y);
    }
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

  window.CAT_COMECAR = function () {
    if (!ativos.length) { window.CAT_CARREGANDO = false; resumo(); renderResumo(); return; }
    // cada pacote que chega já entra no DATA (é rápido); o redesenho fica pro fim, uma vez só
    var T = window.CAT_TEMPOS = [["começo", Math.round(performance.now())]];
    var depoisDeCada = function (i) { var t0 = performance.now(); try { juntarNovos(); } catch (e) {} resumo(); if (i != null) T.push([ativos[i], Math.round(t0), Math.round(performance.now() - t0)]); };
    window.CAT_RODAR(ativos.map(url), function (s) {
      var g = s.split("/")[1].split(".")[0];
      if (falhou.indexOf(g) < 0) falhou.push(g);
      return true;
    }, function () { depoisDeCada(); terminar(); }, depoisDeCada);
  };

  // ---------- tirar / pôr de volta um gênero ----------
  var dlg = document.createElement("dialog");
  dlg.id = "p-dlg";
  dlg.setAttribute("aria-labelledby", "p-tit");
  document.body.appendChild(dlg);

  function desenhar(msg) {
    var tot = 0;
    var linhas = ordem.map(function (g) {
      var p = PAC[g], tem = fora.indexOf(g) < 0;
      if (tem) tot += p.kb;
      return '<div class="p-lin' + (tem ? " tem" : "") + '"><span class="p-nome">' + (tem ? "✓ " : "") + esc(rot(g)) + "</span>" +
        '<span class="p-info">' + mil(p.n) + " jogos · " + mb(p.kb) + (tem ? "" : " · tirado") + "</span>" +
        (tem ? '<button type="button" class="btn" data-p-tirar="' + g + '">Tirar</button>'
             : '<button type="button" class="btn" data-p-por="' + g + '">Pôr de volta</button>') + "</div>";
    }).join("");
    dlg.innerHTML = '<div class="p-in"><div class="p-topo"><h2 id="p-tit">Gêneros do catálogo</h2>' +
      '<button type="button" class="p-x" data-p-fechar aria-label="Fechar">✕</button></div>' +
      "<p>Todos os gêneros vêm junto e ficam guardados neste aparelho: abre até sem internet. " +
      "Se quiser deixar mais leve, tire algum gênero. As suas listas e os jogos que você marcou ficam sempre aqui.</p>" +
      (msg ? '<p class="p-erro">' + esc(msg) + "</p>" : "") + linhas +
      '<p class="p-uso" id="p-uso">Catálogo neste aparelho: ' + mb(tot) + ".</p>" +
      "<p class=\"p-uso\">As capas e fotos de um gênero você guarda no botão \"⬇ Baixar\" do título do gênero, na lista. Elas são apagadas no mesmo botão.</p></div>";
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) {
      var u = document.getElementById("p-uso");
      if (u && e.usage) u.textContent = "Catálogo neste aparelho: " + mb(tot) + ". Tudo o que o app guarda neste aparelho: " + mb(Math.round(e.usage / 1024)) + ".";
    });
  }

  function recarregar() { location.reload(); }

  function tirar(g, b) {
    b.disabled = true; b.textContent = "Tirando…";
    if (fora.indexOf(g) < 0) fora.push(g);
    salvar();
    if (!("caches" in window)) { recarregar(); return; }
    caches.open(CACHE).then(function (c) {
      return c.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return new URL(k.url).pathname.split("/").pop() === g + ".js"; }).map(function (k) { return c.delete(k); }));
      });
    }).then(recarregar, recarregar);
  }

  function por(g, b) {
    b.disabled = true; b.textContent = "Pondo…";
    fora = fora.filter(function (x) { return x !== g; });
    salvar();
    recarregar();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "p-abrir") { desenhar(); dlg.showModal(); return; }
    if (t.hasAttribute("data-p-fechar")) { dlg.close(); return; }
    if (t.hasAttribute("data-p-denovo")) { recarregar(); return; }
    if (t.dataset.pTirar) { tirar(t.dataset.pTirar, t); return; }
    if (t.dataset.pPor) { por(t.dataset.pPor, t); return; }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

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

