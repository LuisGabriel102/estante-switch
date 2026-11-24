/* mod_B_decidir.js */
(function () {
  "use strict";
  var KB = KEY + "-B-chips";
  var ALIAS = {ff: "final fantasy", p5: "persona 5", p5r: "persona 5 royal", p4g: "persona 4 golden", p3r: "persona 3 reload", p3p: "persona 3 portable",
    xc: "xenoblade chronicles", dq: "dragon quest", mh: "monster hunter", smt: "shin megami tensei", fe: "fire emblem", rf: "rune factory",
    botw: "zelda breath of the wild", totk: "zelda tears of the kingdom", loz: "zelda", ac: "animal crossing", sv: "pokemon", bdsp: "pokemon"};
  var NN = {}, PAL = {}, WP = null;
  function nn(g) { return NN[g.id] || (NN[g.id] = norm(g.n)); }
  function pal(g) { return PAL[g.id] || (PAL[g.id] = nn(g).split(/[^a-z0-9]+/).filter(Boolean)); }
  function expande(q) {
    return q.split(/\s+/).map(function (t) {
      if (ALIAS[t]) return ALIAS[t];
      var m = /^([a-z]+)(\d+)$/.exec(t);
      if (m && ALIAS[m[1]] && m[1].length >= 2) return ALIAS[m[1]] + " " + m[2];
      return t;
    }).join(" ");
  }
  function dist(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= la; i++) { d[i] = [i]; }
    for (j = 0; j <= lb; j++) d[0][j] = j;
    for (i = 1; i <= la; i++) for (j = 1; j <= lb; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[la][lb];
  }
  function tokOk(t, ws) {
    var k = /^\d+$/.test(t) ? 0 : t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0;
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (w.indexOf(t) === 0) return true;
      if (k && (dist(t, w, k) <= k || (w.length > t.length && dist(t, w.slice(0, t.length), k) <= k))) return true;
    }
    return false;
  }
  var ult = null, exatos = null, tol = null, tolerante = false;
  function prep(q) {
    if (ult === q) return;
    ult = q;
    var e = expande(q);
    exatos = new Set();
    DATA.forEach(function (g) { if (nn(g).indexOf(e) >= 0) exatos.add(g.id); });
    tolerante = exatos.size < 5;
    tol = null;
    if (tolerante) {
      var ts = e.split(/[^a-z0-9]+/).filter(Boolean);
      tol = new Set();
      if (ts.length) DATA.forEach(function (g) {
        if (exatos.has(g.id)) return;
        var ws = pal(g);
        for (var i = 0; i < ts.length; i++) if (!tokOk(ts[i], ws)) return;
        tol.add(g.id);
      });
    }
  }
  window.B_ok = function (g, q) { prep(q); return exatos.has(g.id) || (tol && tol.has(g.id)); };

  // chips
  var CH = {rom: "♥ Com romance", pt: "PT-BR", nota: "★ Nota 80+", curto: "⏱ Até 30 h", fav: "★ Minhas estrelas"};
  var on = {};
  try { on = JSON.parse(localStorage.getItem(KB) || "{}") || {}; } catch (e) { on = {}; }
  function salva() { try { localStorage.setItem(KB, JSON.stringify(on)); } catch (e) {} }
  window.B_chipsN = function () { return Object.keys(on).filter(function (k) { return on[k]; }).length; };
  window.B_chips = function (g) {
    if (on.rom && g.rom !== "sim" && g.rom !== "opc") return false;
    if (on.pt && !idiomaKey(g)) return false;
    if (on.nota && !((ex(g).nt || 0) >= 80)) return false;
    if (on.curto && !(ex(g).hl > 0 && ex(g).hl <= 30)) return false;
    if (on.fav && !state.fav.has(g.id)) return false;
    return true;
  };
  var bar = document.createElement("div");
  bar.className = "chips-b"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Filtros rápidos");
  Object.keys(CH).forEach(function (k) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip-b"; b.dataset.chipB = k; b.textContent = CH[k];
    b.setAttribute("aria-pressed", on[k] ? "true" : "false");
    bar.appendChild(b);
  });
  document.getElementById("btn-filtros").after(bar);
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-chip-b]"); if (!b) return;
    var k = b.dataset.chipB; on[k] = !on[k]; if (!on[k]) delete on[k];
    b.setAttribute("aria-pressed", on[k] ? "true" : "false");
    salva(); renderList();
  });
  var limpOrig = limparFiltros;
  limparFiltros = function () {
    on = {}; salva();
    bar.querySelectorAll(".chip-b").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    limpOrig();
  };

  // ordem "melhor pra mim"
  var sel = document.getElementById("ordem");
  var op = document.createElement("option"); op.value = "mim"; op.textContent = "Melhor pra mim";
  sel.insertBefore(op, sel.options[1]);
  var dica = document.createElement("p");
  dica.className = "ordem-dica-b"; dica.hidden = true;
  dica.textContent = "Olha a nota, o romance, o português e os gêneros que você mais marca com ★.";
  sel.after(dica);
  sel.addEventListener("change", function () { dica.hidden = sel.value !== "mim"; });
  var porId = null;
  function mapa() { if (!porId) { porId = {}; DATA.forEach(function (g) { porId[g.id] = g; }); } return porId; }
  var sortedOrig = sorted;
  sorted = function (arr) {
    var r;
    if (state.sort === "mim") {
      var m = mapa(), cont = {}, tot = 0;
      state.fav.forEach(function (id) { var g = m[id]; if (g) { cont[g.gn] = (cont[g.gn] || 0) + 1; tot++; } });
      var pt = {dub: 10, leg: 8, fa: 6, minha: 6};
      var par = arr.map(function (g) {
        var nt = ex(g).nt, s = nt ? nt * 0.6 : -15;
        s += g.rom === "sim" ? 12 : g.rom === "opc" ? 8 : g.rom === "leve" ? 3 : 0;
        s += pt[idiomaKey(g)] || 0;
        if (tot) s += 20 * (cont[g.gn] || 0) / tot;
        if (g.h > 0) s += 8;
        return [s, g];
      });
      par.sort(function (a, b) { return (b[0] - a[0]) || COLL.compare(a[1].n, b[1].n); });
      r = par.map(function (p) { return p[1]; });
    } else r = sortedOrig(arr);
    if (ult && state.q.trim() && tolerante && exatos) {
      var a = [], b = [];
      r.forEach(function (g) { (exatos.has(g.id) ? a : b).push(g); });
      r = a.concat(b);
    }
    return r;
  };

  // parecidos
  var STOP = {the: 1, of: 1, a: 1, an: 1, and: 1, in: 1, to: 1, edition: 1, deluxe: 1, definitive: 1, remastered: 1, remaster: 1, remake: 1, hd: 1, royal: 1, golden: 1, collection: 1, complete: 1, ultimate: 1, special: 1, legacy: 1, classic: 1, reimagined: 1, director: 1, cut: 1};
  var abrirOrig = abrirFicha, ioPar = null;
  abrirFicha = function (id) {
    abrirOrig(id);
    // 24/11 (2): os parecidos, e as 6 capas deles, só são montados quando você chega perto do fim da ficha
    try {
      if (ioPar) { ioPar.disconnect(); ioPar = null; }
      var inn = ficha.querySelector(".ficha-in");
      if (!inn || !("IntersectionObserver" in window)) { parecidos(id); return; }
      var marca = document.createElement("div");
      marca.className = "parecidos-b-marca";
      inn.appendChild(marca);
      var io = new IntersectionObserver(function (es) {
        if (!es.some(function (x) { return x.isIntersecting; })) return;
        io.disconnect();
        if (ioPar === io) ioPar = null;
        if (!marca.isConnected) return;
        marca.remove();
        try { parecidos(id); } catch (e) {}
      }, {root: ficha, rootMargin: "0px 0px 600px 0px"});
      ioPar = io;
      io.observe(marca);
    } catch (e) {}
  };
  function parecidos(id) {
    var g0 = mapa()[id], inn = ficha.querySelector(".ficha-in");
    if (!g0 || !inn) return;
    var w0 = pal(g0).filter(function (w) { return !STOP[w] && !/^\d+$/.test(w); }), n0 = ex(g0).nt, res = [];
    DATA.forEach(function (g) {
      if (g.id === id) return;
      var s = 0, ws = pal(g);
      var comum = 0;
      for (var i = 0; i < w0.length && i < 3; i++) if (ws.indexOf(w0[i]) >= 0) comum++;
      if (comum) s += 3 + comum * 2;
      if (g.gn === g0.gn) s += 3;
      if (!comum && g.gn !== g0.gn) return;
      if (g.rom === g0.rom) s += 1;
      var n = ex(g).nt;
      if (n && n0) { var d = Math.abs(n - n0); s += d <= 8 ? 2 : d <= 15 ? 1 : 0; }
      if (g.img) s += 0.5;
      res.push([s, n || 0, g]);
    });
    res.sort(function (a, b) { return (b[0] - a[0]) || (b[1] - a[1]); });
    res = res.slice(0, 6);
    if (!res.length) return;
    var sec = document.createElement("section");
    sec.className = "parecidos-b";
    sec.innerHTML = "<h3>Parecidos com este</h3><div class=\"lista\">" + res.map(function (r) {
      return '<button type="button" class="par-b" data-par-b="' + esc(r[2].id) + '">' + coverHTML(r[2], "") + '<span class="nm">' + esc(r[2].n) + "</span></button>";
    }).join("") + "</div>";
    inn.appendChild(sec);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-par-b]") : null;
    if (!b) return;
    ficha.showModal = function () {};
    try { abrirFicha(b.dataset.parB); } finally { delete ficha.showModal; }
    ficha.scrollTop = 0;
  });

  // deslizar nas fotos
  var x0 = null, y0 = 0;
  ficha.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest(".ficha-palco") && !e.target.closest("button")) { x0 = e.clientX; y0 = e.clientY; } else x0 = null;
  });
  ficha.addEventListener("pointercancel", function () { x0 = null; });
  ficha.addEventListener("pointerup", function (e) {
    if (x0 == null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) mostrarFoto(fotoI + (dx < 0 ? 1 : -1));
  });
  if (B_chipsN()) renderList();
})();

