/* mod_B2_ficha.js */
(function () {
  "use strict";
  var KN = KEY + "-B-notas", notas = {};
  try { notas = JSON.parse(localStorage.getItem(KN) || "{}") || {}; } catch (e) { notas = {}; }
  function salva() { try { localStorage.setItem(KN, JSON.stringify(notas)); } catch (e) {} }

  // ícone 📝 nas capas
  var cvOrig = coverHTML;
  coverHTML = function (g, extra) {
    var r = cvOrig(g, extra);
    if (notas[g.id] && r.slice(-7) === "</span>") r = r.slice(0, -7) + '<span class="nota-ico-b2" title="Tem nota sua">📝</span></span>';
    return r;
  };
  function iconeDom(id) {
    var tem = !!notas[id];
    document.querySelectorAll('#lista-jogos [data-card="' + id + '"] .cover').forEach(function (c) {
      var i = c.querySelector(".nota-ico-b2");
      if (tem && !i) { i = document.createElement("span"); i.className = "nota-ico-b2"; i.title = "Tem nota sua"; i.textContent = "📝"; c.appendChild(i); }
      else if (!tem && i) i.remove();
    });
  }

  // vizinhos na lista visível
  function ids() {
    var vistos = {}, r = [];
    document.querySelectorAll("#lista-jogos [data-card]").forEach(function (el) {
      var id = el.getAttribute("data-card");
      if (!vistos[id]) { vistos[id] = 1; r.push(id); }
    });
    return r;
  }
  var atual = null;
  function vai(passo) {
    var l = ids(), i = l.indexOf(atual), j = i + passo;
    if (i < 0 || j < 0 || j >= l.length) return;
    ficha.showModal = function () {};
    try { abrirFicha(l[j]); } finally { delete ficha.showModal; }
    ficha.scrollTop = 0;
  }

  var abrirOrig = abrirFicha;
  abrirFicha = function (id) {
    abrirOrig(id);
    atual = id;
    var inn = ficha.querySelector(".ficha-in");
    if (!inn) return;
    var l = ids(), i = l.indexOf(id);
    if (i >= 0) {
      var nav = document.createElement("div");
      nav.className = "nav-b2";
      nav.innerHTML = '<button type="button" data-viz-b2="-1" aria-label="Jogo anterior"' + (i === 0 ? " disabled" : "") + '>‹</button><span>' + (i + 1) + " de " + l.length + '</span><button type="button" data-viz-b2="1" aria-label="Próximo jogo"' + (i === l.length - 1 ? " disabled" : "") + ">›</button>";
      inn.insertBefore(nav, inn.firstChild);
    }
    var sec = document.createElement("section");
    sec.className = "notas-b2";
    sec.innerHTML = '<h3>Minhas notas</h3><label class="sr" for="nota-b2">Minhas notas sobre este jogo</label><textarea id="nota-b2" rows="3" maxlength="2000" placeholder="Escreva aqui o que quiser lembrar deste jogo."></textarea>';
    var ta = sec.querySelector("textarea");
    ta.value = notas[id] || "";
    var t = null;
    function grava() {
      clearTimeout(t);
      var v = ta.value.trim();
      if (v) notas[id] = v; else delete notas[id];
      salva(); iconeDom(id);
    }
    ta.addEventListener("input", function () { clearTimeout(t); t = setTimeout(grava, 500); });
    ta.addEventListener("blur", grava);
    ta.addEventListener("keydown", function (e) { e.stopPropagation(); });
    inn.appendChild(sec);
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-viz-b2]") : null;
    if (b && !b.disabled) vai(Number(b.dataset.vizB2));
  });

  // deslizar fora das fotos
  var x0 = null, y0 = 0;
  ficha.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (t.closest && t.closest(".ficha-palco, .ficha-mini, .parecidos-b, button, a, input, textarea, select, label")) x0 = null;
    else { x0 = e.clientX; y0 = e.clientY; }
  });
  ficha.addEventListener("pointercancel", function () { x0 = null; });
  ficha.addEventListener("pointerup", function (e) {
    if (x0 == null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 2) vai(dx < 0 ? 1 : -1);
  });
  if (Object.keys(notas).length) renderList();
})();

