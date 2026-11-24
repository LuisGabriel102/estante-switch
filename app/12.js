/* mod_P_pacotes.js */
// App: o catálogo (18 mil jogos) vem em pacotes por gênero. O app abre só com as suas listas;
// "📦 Gêneros do catálogo" baixa ou apaga cada gênero neste aparelho.
// Também: na capa grande da ficha e no visor, troca a capa diminuída por uma mais nítida.
(function () {
  "use strict";
  var PAC = window.PACOTES || {}, inst = (window.PACOTES_INST || []).slice(), falhou = window.PACOTES_FALHOU || [];
  var CHAVE = "estante-switch-v1-pacotes", CACHE = "estante-pacotes";
  var caixa = document.getElementById("p-pac");
  var ordem = GEN_ORDER.filter(function (g) { return PAC[g]; }).concat(Object.keys(PAC).filter(function (g) { return GEN_ORDER.indexOf(g) < 0; }));
  function rot(g) { return (GENRES[g] && GENRES[g].label) || g; }
  function mb(kb) { return kb >= 1024 ? (kb / 1024).toFixed(1).replace(".", ",") + " MB" : kb + " KB"; }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(inst)); } catch (e) {} }

  function resumo() {
    if (!caixa) return;
    var ok = inst.filter(function (g) { return falhou.indexOf(g) < 0; });
    var t = ok.length
      ? "Catálogo neste aparelho: <strong>" + ok.map(rot).join(", ") + "</strong> (" + ok.length + " de " + ordem.length + " gêneros)."
      : "O catálogo não está neste aparelho: aparecem só as suas listas. Baixe os gêneros que quiser.";
    if (falhou.length) t += ' <span class="p-erro">Não abriu: ' + falhou.map(rot).join(", ") + " (sem internet?).</span>";
    caixa.innerHTML = '<button type="button" class="btn" id="p-abrir">📦 Gêneros do catálogo</button><p>' + t + "</p>";
  }

  var dlg = document.createElement("dialog");
  dlg.id = "p-dlg";
  dlg.setAttribute("aria-labelledby", "p-tit");
  document.body.appendChild(dlg);

  function desenhar(msg) {
    var tot = 0;
    var linhas = ordem.map(function (g) {
      var p = PAC[g], tem = inst.indexOf(g) >= 0;
      if (tem) tot += p.kb;
      return '<div class="p-lin' + (tem ? " tem" : "") + '"><span class="p-nome">' + (tem ? "✓ " : "") + esc(rot(g)) + "</span>" +
        '<span class="p-info">' + p.n.toLocaleString("pt-BR") + " jogos · " + mb(p.kb) + "</span>" +
        (tem ? '<button type="button" class="btn" data-p-apagar="' + g + '">Apagar</button>'
             : '<button type="button" class="btn" data-p-baixar="' + g + '">⬇ Baixar</button>') + "</div>";
    }).join("");
    dlg.innerHTML = '<div class="p-in"><div class="p-topo"><h2 id="p-tit">Gêneros do catálogo</h2>' +
      '<button type="button" class="p-x" data-p-fechar aria-label="Fechar">✕</button></div>' +
      "<p>Cada gênero baixado fica guardado neste aparelho e abre até sem internet. Quanto menos gêneros, mais leve fica. " +
      "As suas listas estão sempre aqui, com ou sem gênero baixado.</p>" +
      (msg ? '<p class="p-erro">' + esc(msg) + "</p>" : "") + linhas +
      '<p class="p-uso" id="p-uso">Gêneros baixados: ' + mb(tot) + ".</p>" +
      "<p class=\"p-uso\">As capas e fotos de um gênero você guarda no botão \"⬇ Baixar\" do título do gênero, na lista. Elas são apagadas no mesmo botão.</p></div>";
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) {
      var u = document.getElementById("p-uso");
      if (u && e.usage) u.textContent = "Gêneros baixados: " + mb(tot) + ". Tudo o que o app guarda neste aparelho: " + mb(Math.round(e.usage / 1024)) + ".";
    });
  }

  function recarregar() { location.reload(); }

  function baixar(g, b) {
    b.disabled = true; b.textContent = "Baixando…";
    var url = "pacotes/" + g + ".js?v=" + PAC[g].v;
    var fim = function () {
      if (inst.indexOf(g) < 0) inst.push(g);
      salvar();
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
      b.textContent = "Abrindo…";
      recarregar();
    };
    if (!("caches" in window)) { fim(); return; }
    caches.open(CACHE).then(function (c) { return c.add(url); }).then(fim, function () {
      desenhar("Não deu pra baixar " + rot(g) + ". Confira a internet e tente de novo.");
    });
  }

  function apagar(g, b) {
    b.disabled = true; b.textContent = "Apagando…";
    inst = inst.filter(function (x) { return x !== g; });
    salvar();
    if (!("caches" in window)) { recarregar(); return; }
    caches.open(CACHE).then(function (c) {
      return c.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { var m = /\/pacotes\/([a-z]+)\.js/.exec(k.url); return m && m[1] === g; }).map(function (k) { return c.delete(k); }));
      });
    }).then(recarregar, recarregar);
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "p-abrir") { desenhar(); dlg.showModal(); return; }
    if (t.hasAttribute("data-p-fechar")) { dlg.close(); return; }
    if (t.dataset.pBaixar) { baixar(t.dataset.pBaixar, t); return; }
    if (t.dataset.pApagar) { apagar(t.dataset.pApagar, t); return; }
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
  var car = document.getElementById("carregando");
  if (car) car.remove();
})();

