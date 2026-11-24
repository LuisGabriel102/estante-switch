/* mod_R_recomenda.js */
// "💡 Para você": recomendações a partir das suas estrelas e marcações, só entre os jogos deste aparelho
// (suas listas + gêneros baixados). Ficam de fora: o que já tem estrela/marcação/plano, fichas que você
// já abriu, os pulados do Descobrir e os que você dispensar aqui ("Não me interessa").
// Duas abas: "Pra jogar" (tem PT-BR oficial ou tradução de fã pronta) e "Pra traduzir" (só inglês).
(function () {
  "use strict";
  var KN = KEY + "-R-nao", KP = KEY + "-D-pulados";
  var nao = new Set();
  try { nao = new Set(JSON.parse(localStorage.getItem(KN) || "[]")); } catch (e) {}
  var porId = {};
  DATA.forEach(function (g) { porId[g.id] = g; });
  var aba = "jogar";
  var TEXTO = {rpg: 1, tatica: 1, vn: 1, investigacao: 1, historia: 1, estrategia: 0.5};
  var COMUNS = new Set("edition remastered deluxe switch nintendo definitive collection complete the and game games of hd remaster chronicles legend story".split(" "));

  function nota(g) { return (EXTRA[g.id] && EXTRA[g.id].nt) || 0; }
  function horas(g) { return (EXTRA[g.id] && EXTRA[g.id].hl) || 0; }
  function palavras(n) { return (n.toLowerCase().match(/[a-zà-ú0-9]{4,}/g) || []).filter(function (w) { return !COMUNS.has(w); }); }

  function perfil() {
    var gosto = new Set();
    state.fav.forEach(function (id) { gosto.add(id); });
    state.sel.forEach(function (id) { gosto.add(id); });
    var gen = {}, tot = 0, serie = {}, exemplo = {};
    gosto.forEach(function (id) {
      var g = porId[id];
      if (!g) return;
      gen[g.gn] = (gen[g.gn] || 0) + 1; tot++;
      palavras(g.n).forEach(function (w) { serie[w] = (serie[w] || 0) + 1; if (!exemplo[w]) exemplo[w] = g.n; });
    });
    return {gen: gen, tot: tot || 1, serie: serie, exemplo: exemplo};
  }

  function excluidos() {
    var fora = new Set(nao);
    state.fav.forEach(function (id) { fora.add(id); });
    state.sel.forEach(function (id) { fora.add(id); });
    Object.keys(state.pl || {}).forEach(function (id) { fora.add(id); });
    Object.keys(state.mt || {}).forEach(function (id) { fora.add(id); });
    try { JSON.parse(localStorage.getItem(KP) || "[]").forEach(function (id) { fora.add(id); }); } catch (e) {}
    var vistos = 0;
    if (window.S_historico) S_historico().forEach(function (e) { if (e.a === "ficha" && !fora.has(e.id)) { fora.add(e.id); vistos++; } });
    return {fora: fora, vistos: vistos};
  }

  function serieDe(g, p) {
    var ws = palavras(g.n);
    for (var i = 0; i < ws.length; i++) if (p.serie[ws[i]] >= 2) return p.exemplo[ws[i]];
    return null;
  }

  function lista(qual) {
    var p = perfil(), ex = excluidos(), out = [];
    DATA.forEach(function (g) {
      if (ex.fora.has(g.id) || g.s === "veto" || g.s === "espera") return;
      var paraJogar = g.s === "pt" || g.s === "pronta";
      if ((qual === "jogar") !== paraJogar) return;
      var share = (p.gen[g.gn] || 0) / p.tot, nt = nota(g), h = horas(g);
      if (!share) return;
      if (qual === "jogar" && nt && nt < 75) return;
      if (qual === "jogar" && !nt && g.l === 5) return;  // do catálogo e sem nota: pouco confiável
      var s = share * 3 + (nt ? nt / 50 : 1.3), por = [], sr = serieDe(g, p);
      if (sr) { s += 0.8; por.push("da mesma série de " + sr); }
      if (g.l < 5) s += 0.3;  // escolhido a dedo pra sua lista
      if (qual === "traduzir") {
        s += (TEXTO[g.gn] || 0) * 0.6;
        if (h && h <= 30) s += 0.5; else if (h > 60) s -= 0.6;
        if (/tradu[çc][ãa]o de f[ãa] no PC|portar/i.test(g.t || "")) { s += 0.7; por.push("tem tradução de fã no PC pra aproveitar"); }
        if (!nt && g.l === 5) s -= 0.8;
      }
      por.push(GENRES[g.gn] ? GENRES[g.gn].label + ", como " + Math.round(share * 100) + "% das suas escolhas" : "");
      if (nt) por.push("nota " + nt);
      if (h) por.push("~" + Math.round(h) + " h de jogo");
      if (qual === "jogar") por.push(g.s === "pt" ? "PT-BR oficial" : "tradução de fã pronta");
      else por.push("só em inglês");
      if (g.rom === "sim") por.push("romance central");
      out.push({g: g, s: s, por: por.filter(Boolean)});
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return {itens: out.slice(0, 30), vistos: ex.vistos, total: out.length};
  }

  var caixa = document.getElementById("p-pac");
  if (caixa) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn"; b.id = "r-abrir"; b.textContent = "💡 Para você";
    var ha = document.getElementById("s-abrir") || document.getElementById("p-abrir");
    if (ha) ha.insertAdjacentElement("afterend", b); else caixa.appendChild(b);
  }
  var dlg = document.createElement("dialog");
  dlg.id = "r-dlg"; dlg.setAttribute("aria-labelledby", "r-tit");
  document.body.appendChild(dlg);

  function desenhar() {
    var r = lista(aba), inst = (window.PACOTES_INST || []).length, totG = Object.keys(window.PACOTES || {}).length;
    var html = r.itens.map(function (it, i) {
      var g = it.g;
      return '<div class="r-lin"><button type="button" class="r-capa" data-r-ficha="' + esc(g.id) + '" aria-label="Ver a ficha de ' + esc(g.n) + '">' +
        (g.img ? '<img src="' + esc(imgURL(g.img)) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : "") + "</button>" +
        '<div class="r-txt"><button type="button" class="r-nome" data-r-ficha="' + esc(g.id) + '">' + (i + 1) + ". " + esc(g.n) + "</button>" +
        '<span class="r-por">' + esc(it.por.join(" · ")) + "</span>" +
        '<span class="r-bts"><button type="button" class="btn" data-r-estrela="' + esc(g.id) + '">★ Me interessa</button>' +
        '<button type="button" class="btn" data-r-nao="' + esc(g.id) + '">✕ Não me interessa</button></span></div></div>';
    }).join("");
    dlg.innerHTML = '<div class="p-in"><div class="p-topo"><h2 id="r-tit">Para você</h2><button type="button" class="p-x" data-r-fechar aria-label="Fechar">✕</button></div>' +
      '<div class="s-filtros" role="group" aria-label="Recomendações">' +
      '<button type="button" class="btn" data-r-aba="jogar" aria-pressed="' + (aba === "jogar") + '">🎮 Pra jogar</button>' +
      '<button type="button" class="btn" data-r-aba="traduzir" aria-pressed="' + (aba === "traduzir") + '">✎ Pra traduzir</button></div>' +
      "<p>" + (aba === "jogar"
        ? "Jogos em português (oficial ou de fã) parecidos com os que você deu estrela ou marcou, e que você ainda não abriu."
        : "Jogos só em inglês, do jeito que você gosta, com prioridade pros que têm muito texto e cabem em poucas semanas de tradução.") +
      " Vêm das suas listas e dos " + inst + " de " + totG + " gêneros do catálogo baixados" + (inst < totG ? ": baixe mais gêneros (📦) pra ter mais opções." : ".") +
      (r.vistos ? " " + r.vistos + (r.vistos === 1 ? " jogo que você já abriu ficou de fora." : " jogos que você já abriu ficaram de fora.") : "") + "</p>" +
      (html || '<p class="s-vazio">Nada por aqui agora. Baixe mais gêneros ou dê estrelas em mais jogos.</p>') +
      (nao.size ? '<button type="button" class="btn s-apagar" data-r-voltar>Mostrar de novo os ' + nao.size + " dispensados</button>" : "") + "</div>";
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    if (t.id === "r-abrir") { desenhar(); dlg.showModal(); return; }
    if (t.hasAttribute("data-r-fechar")) { dlg.close(); return; }
    if (t.dataset.rAba) { aba = t.dataset.rAba; desenhar(); dlg.querySelector(".p-in").scrollTop = 0; return; }
    if (t.dataset.rFicha) { dlg.close(); abrirFicha(t.dataset.rFicha); return; }
    if (t.dataset.rEstrela) {
      state.fav.add(t.dataset.rEstrela); save();
      try { renderList(); renderMeter(); } catch (err) {}
      desenhar(); return;
    }
    if (t.dataset.rNao) {
      nao.add(t.dataset.rNao);
      try { localStorage.setItem(KN, JSON.stringify(Array.from(nao))); } catch (err) {}
      desenhar(); return;
    }
    if (t.hasAttribute("data-r-voltar")) {
      nao.clear(); try { localStorage.removeItem(KN); } catch (err) {}
      desenhar();
    }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
})();

