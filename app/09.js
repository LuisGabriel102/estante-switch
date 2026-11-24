/* mod_F_capas.js */
// 24/11: a ficha abre com a capa grande no topo; as setas de jogo anterior e próximo ficam dos lados dela.
// Tocar na capa, ou numa foto da galeria, abre o visor em tela cheia: capa e fotos lado a lado, deslize pra passar.
// O botão voltar do celular fecha só o visor e deixa a ficha aberta.
(function () {
  "use strict";
  var porId = {};
  DATA.forEach(function (g) { porId[g.id] = g; });
  var atual = null;
  function calmo() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }

  // ---------- 1: capa grande no topo da ficha ----------
  function heroi(id) {
    var g = porId[id], inn = ficha.querySelector(".ficha-in");
    ficha.classList.remove("com-heroi");
    if (!g || !g.img || !inn) return;
    var url = esc(imgURL(g.img));
    var h = document.createElement("div");
    h.className = "f-heroi";
    h.innerHTML = '<img class="capa f-heroi-fundo" data-heroi="1" src="' + url + '" alt="" aria-hidden="true" referrerpolicy="no-referrer">' +
      '<button type="button" class="f-heroi-capa" data-vz-abrir="0" aria-label="Ver a capa em tela cheia">' +
      '<img class="capa" data-heroi="1" src="' + url + '" alt="Capa de ' + esc(g.n) + '" referrerpolicy="no-referrer">' +
      '<span class="f-heroi-lupa" aria-hidden="true">⤢</span></button>';
    var nav = inn.querySelector(".nav-b2");
    if (nav) { h.appendChild(nav); h.classList.add("com-nav"); }
    inn.insertBefore(h, inn.firstChild);
    ficha.classList.add("com-heroi");
  }
  // capa que não carregou (sem internet, ou dentro do app do Claude): a ficha volta a ser como antes
  function semHeroi() {
    var h = ficha.querySelector(".f-heroi"), inn = ficha.querySelector(".ficha-in");
    if (!h) return;
    var nav = h.querySelector(".nav-b2");
    if (nav && inn) inn.insertBefore(nav, h);
    h.remove();
    ficha.classList.remove("com-heroi");
  }
  document.addEventListener("error", function (e) {
    var t = e.target, g = porId[atual];
    if (!t || t.tagName !== "IMG" || !t.getAttribute("data-heroi") || !g || !g.img) return;
    if (t.src !== imgURL(g.img)) return;   // imagem de uma ficha que já foi trocada
    semHeroi();
  }, true);

  var abrirAnt = abrirFicha;
  abrirFicha = function (id) {
    abrirAnt.apply(this, arguments);
    atual = id;
    try { heroi(id); } catch (e) { /* segue com a ficha de antes */ }
  };

  // ---------- 2: visor em tela cheia ----------
  var visor = document.createElement("dialog");
  visor.id = "visor";
  visor.setAttribute("aria-label", "Capa e fotos em tela cheia");
  document.body.appendChild(visor);
  var vz = {n: 0, i: 0, empurrou: false, ignorar: false, raf: 0};
  function trilhoVz() { return visor.querySelector(".vz-trilho"); }
  function marcaVz() {
    var c = visor.querySelector(".vz-conta");
    if (c) c.textContent = vz.n > 1 ? (vz.i + 1) + " / " + vz.n : "";
    visor.querySelectorAll(".vz-pontos i").forEach(function (p, k) { p.classList.toggle("on", k === vz.i); });
    var a = visor.querySelector('[data-vz="-1"]'), b = visor.querySelector('[data-vz="1"]');
    if (a) a.disabled = vz.i <= 0;
    if (b) b.disabled = vz.i >= vz.n - 1;
  }
  function irVz(i, suave) {
    var t = trilhoVz();
    if (!t) return;
    vz.i = Math.max(0, Math.min(vz.n - 1, i));
    t.scrollTo({left: vz.i * t.clientWidth, behavior: suave && !calmo() ? "smooth" : "auto"});
    marcaVz();
  }
  function abrirVisor(id, i) {
    var g = porId[id];
    if (!g || visor.open) return;
    var itens = [];
    if (g.img) itens.push({src: imgURL(g.img), capa: true, alt: "Capa de " + g.n});
    ((FICHA[id] || {}).sh || []).forEach(function (h, k) { itens.push({src: fotoURL(h), capa: false, alt: "Foto " + (k + 1) + " de " + g.n}); });
    if (!itens.length) return;
    vz.n = itens.length;
    visor.innerHTML = '<div class="vz-trilho">' + itens.map(function (x) {
      return '<figure class="vz-slide"><img' + (x.capa ? ' class="capa"' : "") + ' src="' + esc(x.src) + '" alt="' + esc(x.alt) + '" referrerpolicy="no-referrer" draggable="false"></figure>';
    }).join("") + "</div>" +
      '<div class="vz-topo"><span class="vz-nome">' + esc(g.n) + '</span><span class="vz-conta"></span>' +
      '<button type="button" class="vz-x" data-vz="fechar" aria-label="Fechar">✕</button></div>' +
      (vz.n > 1 ? '<button type="button" class="vz-seta ant" data-vz="-1" aria-label="Anterior">‹</button>' +
        '<button type="button" class="vz-seta prox" data-vz="1" aria-label="Próxima">›</button>' +
        '<div class="vz-pontos" aria-hidden="true">' + new Array(vz.n + 1).join("<i></i>") + "</div>" : "");
    visor.showModal();
    irVz(i || 0, false);
    try { history.pushState({visor: id}, ""); vz.empurrou = true; } catch (e) { vz.empurrou = false; }
    var t = trilhoVz();
    t.addEventListener("scroll", function () {
      if (vz.raf) return;
      vz.raf = requestAnimationFrame(function () {
        vz.raf = 0;
        var k = Math.max(0, Math.min(vz.n - 1, Math.round(t.scrollLeft / Math.max(1, t.clientWidth))));
        if (k !== vz.i) { vz.i = k; marcaVz(); }
      });
    }, {passive: true});
  }
  visor.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-vz]") : null;
    if (b) {
      if (b.dataset.vz === "fechar") visor.close();
      else irVz(vz.i + Number(b.dataset.vz), true);
      return;
    }
    // toque fora da imagem fecha
    if (e.target.classList && e.target.classList.contains("vz-slide")) visor.close();
  });
  visor.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { irVz(vz.i + 1, true); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { irVz(vz.i - 1, true); e.preventDefault(); }
  });
  visor.addEventListener("close", function () {
    visor.innerHTML = "";
    if (vz.empurrou) {
      vz.empurrou = false; vz.ignorar = true;
      try { history.back(); } catch (e) { vz.ignorar = false; }
    }
  });
  // o botão voltar fecha só o visor: quem chama isto é o mod_F_voltar, que escuta antes da ficha
  window.F_VOLTAR = function () {
    if (vz.ignorar) { vz.ignorar = false; return true; }
    if (visor.open) { vz.empurrou = false; visor.close(); return true; }
    return false;
  };
  window.addEventListener("resize", function () { if (visor.open) irVz(vz.i, false); });

  // abrir: tocar na capa grande, ou numa foto da galeria (sem contar o deslize que troca a foto)
  var toque = null;
  ficha.addEventListener("pointerdown", function (e) { toque = [e.clientX, e.clientY]; }, true);
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !atual) return;
    var h = e.target.closest("[data-vz-abrir]");
    if (h) { abrirVisor(atual, Number(h.getAttribute("data-vz-abrir")) || 0); return; }
    if (e.target.id === "ficha-foto") {
      if (toque && Math.abs(e.clientX - toque[0]) + Math.abs(e.clientY - toque[1]) > 12) return;
      var g = porId[atual];
      abrirVisor(atual, (g && g.img ? 1 : 0) + (typeof fotoI === "number" ? fotoI : 0));
    }
  });
})();

