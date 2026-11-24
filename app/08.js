/* mod_D_descobrir.js */
// item 12: modo Descobrir — um jogo por vez em tela cheia.
// Direita (ou ★) = estrela; esquerda (ou ✕) = pular; "Desfazer" volta o último; "Ver ficha" abre a ficha.
// Fila: jogos sem estrela e não pulados, melhor nota primeiro. Pulados ficam guardados em KEY + "-D-pulados".
(function () {
  const KP = KEY + "-D-pulados";
  let pulados = new Set();
  try { pulados = new Set(JSON.parse(localStorage.getItem(KP) || "[]")); } catch (e) { pulados = new Set(); }
  let fila = [], hist = [], mudouLista = false, aberto = false;

  const tela = document.createElement("div");
  tela.className = "desc-tela"; tela.hidden = true;
  tela.setAttribute("role", "dialog"); tela.setAttribute("aria-label", "Descobrir jogos");
  tela.innerHTML = '<div class="desc-topo"><h2>Descobrir</h2><span class="desc-conta" id="desc-conta"></span>' +
    '<button type="button" class="desc-x" data-desc="fechar" aria-label="Fechar">✕</button></div>' +
    '<div class="desc-palco" id="desc-palco"></div>' +
    '<div class="desc-botoes"><button type="button" data-desc="desfazer">↶ Desfazer</button>' +
    '<button type="button" class="desc-nao" data-desc="nao" aria-label="Pular">✕</button>' +
    '<button type="button" class="desc-sim" data-desc="sim" aria-label="Dar estrela">★</button>' +
    '<button type="button" data-desc="ficha">Ver ficha</button></div>';
  document.body.appendChild(tela);
  const palco = tela.querySelector("#desc-palco");

  // botão para abrir, ao lado de "Filtros"
  const bf = document.getElementById("btn-filtros");
  if (bf) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn desc-abrir"; b.dataset.desc = "abrir"; b.textContent = "🔥 Descobrir";
    bf.insertAdjacentElement("afterend", b);
  }

  function montarFila() {
    fila = DATA.filter(function (g) { return g.s !== "veto" && !state.fav.has(g.id) && !pulados.has(g.id); });
    // primeiro os da sua lista e os conhecidos (com horas do HowLongToBeat); depois o resto. Dentro de cada faixa, maior nota.
    const faixaD = function (g) { const e = ex(g); return g.l !== 5 ? 0 : (e.hl && e.nt) ? 1 : e.nt ? 2 : 3; };
    fila.sort(function (a, b) { return (faixaD(a) - faixaD(b)) || ((ex(b).nt || 0) - (ex(a).nt || 0)) || (b.h - a.h); });
  }

  function cardHTML1(g) {
    const e = ex(g), f = FICHA[g.id] || {}, tags = [];
    if (GENRES[g.gn]) tags.push(GENRES[g.gn].label);
    if (e.nt) tags.push("★ " + e.nt + "/100");
    if (e.hl) tags.push("⏱ " + horas(e.hl));
    const ik = idiomaKey(g);
    tags.push(ik === "dub" ? "🎙 Dublado" : ik === "leg" ? "💬 PT-BR" : ik === "fa" ? "💬 Tradução de fã" : ik === "minha" ? "✎ Sua tradução" : "Sem português");
    if (ROM[g.rom] && (g.rom === "sim" || g.rom === "opc" || g.rom === "leve")) tags.push("♥ " + ROM[g.rom].label);
    if (g.g) tags.push(fmt(g.g) + " GB");
    const foto = f.sh && f.sh.length ? '<img class="desc-foto" src="' + esc(fotoURL(f.sh[0])) + '" alt="" referrerpolicy="no-referrer">' : "";
    const texto = f.d || g.t || "";
    return '<div class="desc-card" id="desc-card" data-id="' + g.id + '">' +
      '<span class="desc-selo sim">★ QUERO</span><span class="desc-selo nao">PULAR</span>' +
      (g.img ? '<img class="desc-capa" src="' + esc(imgURL(g.img)) + '" alt="" referrerpolicy="no-referrer">' : "") +
      '<div class="desc-info"><h3>' + esc(g.n) + '</h3><div class="desc-tags">' +
      tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>" +
      (texto ? "<p>" + esc(texto) + "</p>" : "") + "</div>" + foto + "</div>";
  }

  function mostrar() {
    const g = fila[0];
    document.getElementById("desc-conta").textContent = fila.length.toLocaleString("pt-BR") + " na fila";
    if (!g) { palco.innerHTML = '<div class="desc-fim">Acabou a fila. Você já viu todos os jogos!</div>'; return; }
    palco.innerHTML = cardHTML1(g);
    const prox = fila[1];
    if (prox && prox.img) { const im = new Image(); im.referrerPolicy = "no-referrer"; im.src = imgURL(prox.img); }
    ligarArrasto(palco.querySelector(".desc-card"));
  }

  function decidir(sim) {
    const g = fila[0], card = document.getElementById("desc-card");
    if (!g) return;
    if (sim) { state.fav.add(g.id); save(); if (typeof renderMeter === "function") renderMeter(); mudouLista = true; }
    else { pulados.add(g.id); try { localStorage.setItem(KP, JSON.stringify(Array.from(pulados))); } catch (e) {} }
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    hist.push({id: g.id, sim: sim});
    fila.shift();
    if (card && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      card.style.transform = "translateX(" + (sim ? 120 : -120) + "%) rotate(" + (sim ? 12 : -12) + "deg)";
      card.style.opacity = "0";
      setTimeout(mostrar, 220);
    } else mostrar();
  }

  function desfazer() {
    const u = hist.pop();
    if (!u) return;
    const g = DATA.find(function (x) { return x.id === u.id; });
    if (!g) return;
    if (u.sim) { state.fav.delete(g.id); save(); if (typeof renderMeter === "function") renderMeter(); mudouLista = true; }
    else { pulados.delete(g.id); try { localStorage.setItem(KP, JSON.stringify(Array.from(pulados))); } catch (e) {} }
    fila.unshift(g);
    mostrar();
  }

  function ligarArrasto(card) {
    if (!card) return;
    let x0 = null, y0 = 0, dx = 0, horiz = false;
    const selS = card.querySelector(".desc-selo.sim"), selN = card.querySelector(".desc-selo.nao");
    card.addEventListener("pointerdown", function (e) { x0 = e.clientX; y0 = e.clientY; dx = 0; horiz = false; });
    card.addEventListener("pointermove", function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      if (!horiz && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - y0)) { horiz = true; card.classList.add("arrastando"); try { card.setPointerCapture(e.pointerId); } catch (er) {} }
      if (!horiz) return;
      card.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 25) + "deg)";
      selS.style.opacity = Math.max(0, Math.min(1, dx / 90));
      selN.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    function soltar() {
      if (x0 === null) return;
      x0 = null; card.classList.remove("arrastando");
      if (horiz && Math.abs(dx) > 90) { decidir(dx > 0); return; }
      card.style.transform = ""; selS.style.opacity = 0; selN.style.opacity = 0;
    }
    card.addEventListener("pointerup", soltar);
    card.addEventListener("pointercancel", soltar);
  }

  function abrir() {
    montarFila(); hist = []; mudouLista = false; aberto = true;
    tela.hidden = false; document.documentElement.classList.add("desc-aberto");
    history.pushState({descobrir: true}, "");
    mostrar();
  }
  function fechar(peloVoltar) {
    if (!aberto) return;
    aberto = false; tela.hidden = true; document.documentElement.classList.remove("desc-aberto");
    palco.innerHTML = "";
    if (mudouLista) renderList();
    if (!peloVoltar && history.state && history.state.descobrir) history.back();
  }

  document.addEventListener("click", function (e) {
    const b = e.target.closest ? e.target.closest("[data-desc]") : null;
    if (!b) return;
    const a = b.dataset.desc;
    if (a === "abrir") abrir();
    else if (a === "fechar") fechar(false);
    else if (a === "sim") decidir(true);
    else if (a === "nao") decidir(false);
    else if (a === "desfazer") desfazer();
    else if (a === "ficha" && fila[0]) abrirFicha(fila[0].id);
  });
  window.addEventListener("popstate", function () {
    // a ficha aberta por cima do Descobrir fecha primeiro (outro módulo cuida dela)
    if (aberto && !(history.state && history.state.descobrir) && !(document.getElementById("ficha") || {}).open) fechar(true);
  });
  document.addEventListener("keydown", function (e) {
    if (!aberto || (document.getElementById("ficha") || {}).open) return;
    if (e.key === "ArrowRight") decidir(true);
    else if (e.key === "ArrowLeft") decidir(false);
    else if (e.key === "Escape") fechar(false);
  });
})();

