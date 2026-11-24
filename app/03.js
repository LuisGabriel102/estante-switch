/* mod_A2_desfazer.js */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function medir() {
    var b = $("barra"), l = $("a-lembrete");
    var r = document.documentElement.style;
    r.setProperty("--a2-barra-h", (b ? b.offsetHeight : 70) + "px");
    r.setProperty("--a2-extra", (l && !l.hidden ? l.offsetHeight + 8 : 0) + "px");
  }
  // ---------- 4: desfazer ----------
  var ant = {sel: new Set(state.sel), fav: new Set(state.fav)};
  var fx = document.createElement("div");
  fx.className = "a2-desfazer"; fx.hidden = true; fx.setAttribute("role", "status");
  fx.innerHTML = '<span id="a2-txt"></span><button type="button" id="a2-btn">Desfazer</button>';
  document.body.appendChild(fx);
  var tim = 0, guardado = null;
  function perdeu(a, b) { var n = false; a.forEach(function (x) { if (!b.has(x)) n = true; }); return n; }
  var _save = save;
  save = function () {
    _save.apply(this, arguments);
    var perdeuSel = perdeu(ant.sel, state.sel), perdeuFav = perdeu(ant.fav, state.fav);
    if (perdeuSel || perdeuFav) {
      guardado = ant;
      var n = 0; ant.sel.forEach(function (x) { if (!state.sel.has(x)) n++; }); ant.fav.forEach(function (x) { if (!state.fav.has(x)) n++; });
      $("a2-txt").textContent = n > 1 ? n + " itens tirados." : (perdeuFav && !perdeuSel ? "Estrela tirada." : "Jogo desmarcado.");
      medir(); fx.hidden = false;
      clearTimeout(tim); tim = setTimeout(function () { fx.hidden = true; guardado = null; }, 5000);
    }
    ant = {sel: new Set(state.sel), fav: new Set(state.fav)};
  };
  $("a2-btn").addEventListener("click", function () {
    if (!guardado) return;
    state.sel = new Set(guardado.sel); state.fav = new Set(guardado.fav);
    guardado = null; fx.hidden = true; clearTimeout(tim);
    save(); renderMeter(); renderList();
  });
  // ---------- 6: botão para o topo ----------
  var up = document.createElement("button");
  up.type = "button"; up.className = "a2-topo"; up.hidden = true;
  up.setAttribute("aria-label", "Voltar ao topo"); up.textContent = "↑";
  document.body.appendChild(up);
  var raf = 0;
  window.addEventListener("scroll", function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var v = window.scrollY > window.innerHeight * 2;
      if (up.hidden === v) { if (v) medir(); up.hidden = !v; }
    });
  }, {passive: true});
  up.addEventListener("click", function () {
    var calmo = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top: 0, behavior: calmo ? "auto" : "smooth"});
  });
  window.addEventListener("resize", medir);
  medir();
})();

