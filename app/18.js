/* mod_T_tinder.js */
// "🃏 Avaliar jogos": um jogo por vez em tela cheia, no jeito Tinder.
// Arrastar pra direita (ou ⭐, ou →) = Quero: dá estrela (state.fav, salvo pelo save() do app).
// Arrastar pra esquerda (ou ✖, ou ←) = Não quero: o jogo fica dispensado (KEY + "-T-nao", neste aparelho).
// Arrastar pra cima (ou ⏭, ou ↓) = Depois: vai pro fim da fila (e fica atrás dos outros por 7 dias).
// ↶ (ou Backspace) desfaz o último. Esc ou o voltar do celular saem.
// Fila: montada uma vez ao abrir (e ao trocar filtro), na ordem de window.notaGosto(g) quando existir.
// Dispensados: na lista principal descem pro fim do grupo (menos quando você busca); "Para você" pode esconder
// pelo window.T_dispensados() (ver montar_app.py).
(function () {
  "use strict";
  var KN = KEY + "-T-nao", KD = KEY + "-T-depois", KH = KEY + "-T-hoje", KF = KEY + "-T-filtro";
  var KRN = KEY + "-R-nao", KDP = KEY + "-D-pulados";
  var SEMANA = 7 * 864e5;
  function ler(k, padrao) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? padrao : v; } catch (e) { return padrao; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var nao = new Set(Array.isArray(ler(KN, [])) ? ler(KN, []) : []);
  var depois = ler(KD, {});
  if (!depois || typeof depois !== "object" || Array.isArray(depois)) depois = {};
  (function () {  // "depois" vencidos saem da lista guardada
    var agora = Date.now(), mudou = false;
    Object.keys(depois).forEach(function (id) { if (!(agora - depois[id] < SEMANA)) { delete depois[id]; mudou = true; } });
    if (mudou) gravar(KD, depois);
  })();
  function gravarNao() { gravar(KN, Array.from(nao)); }

  window.T_dispensados = function () { return new Set(nao); };
  window.T_dispensado = function (id) { return nao.has(id); };

  // ---------- o resto do app: dispensados descem pro fim do grupo (buscando, ficam onde estão) ----------
  if (typeof sorted === "function") {
    var sortedAnt = sorted;
    sorted = function (arr) {
      var r = sortedAnt.apply(this, arguments);
      if (!nao.size || !r || !r.length || (state.q && state.q.trim())) return r;
      var a = [], b = [];
      for (var i = 0; i < r.length; i++) (nao.has(r[i].id) ? b : a).push(r[i]);
      if (!b.length) return r;
      for (i = 0; i < a.length; i++) r[i] = a[i];
      for (var j = 0; j < b.length; j++) r[a.length + j] = b[j];
      return r;
    };
  }

  // ---------- estilo ----------
  var css = document.createElement("style");
  css.textContent = [
    ".t-abrir { white-space: nowrap; font-weight: 600; }",
    "html.t-aberto { overflow: hidden; }",
    ".t-tela { position: fixed; inset: 0; z-index: 60; background: var(--bg); color: var(--ink); padding: max(8px, env(safe-area-inset-top)) 12px calc(10px + env(safe-area-inset-bottom)); }",
    ".t-tela[hidden] { display: none; }",
    ".t-col { max-width: 520px; height: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }",
    ".t-topo { display: flex; align-items: center; gap: 10px; }",
    ".t-topo h2 { font-size: 19px; line-height: 1.2; }",
    ".t-conta { flex: 1; min-width: 0; font-size: 13px; color: var(--muted); line-height: 1.3; }",
    ".t-conta b { color: var(--ink); font-weight: 600; }",
    ".t-x { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-size: 18px; cursor: pointer; }",
    ".t-filtros { display: flex; flex-wrap: wrap; gap: 8px; }",
    ".t-filtros select, .t-filtros .btn { flex: none; min-height: 40px; font: inherit; font-size: 14px; border-radius: 999px; }",
    ".t-filtros select { flex: 1 1 170px; min-width: 0; border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 0 12px; }",
    ".t-filtros .btn[aria-pressed=\"true\"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }",
    ".t-palco { position: relative; flex: 1; min-height: 0; }",
    ".t-card { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 28px rgba(0,0,0,.16); touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; transition: transform .32s cubic-bezier(.2,.8,.25,1), opacity .32s ease; will-change: transform; z-index: 2; }",
    ".t-card.t-baixo { transform: translateY(10px) scale(.95); opacity: .75; z-index: 1; pointer-events: none; }",
    ".t-card.t-arr { transition: none; cursor: grabbing; }",
    ".t-card.t-voa { z-index: 3; pointer-events: none; }",
    ".t-card.t-entra { transition: none; }",
    ".t-capa { position: relative; flex: 0 0 40%; min-height: 0; overflow: hidden; background: var(--accent-soft); }",
    ".t-capa .t-fundo { position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); object-fit: cover; filter: blur(18px) saturate(1.2); opacity: .7; }",
    ".t-capa .t-img { position: relative; display: block; width: 100%; height: 100%; object-fit: contain; }",
    ".t-carimbo { position: absolute; top: 16px; padding: 4px 12px; border: 3px solid; border-radius: 10px; font-weight: 800; font-size: 22px; letter-spacing: .02em; background: var(--surface); opacity: 0; pointer-events: none; z-index: 2; }",
    ".t-c-sim { left: 16px; color: var(--star); transform: rotate(-12deg); }",
    ".t-c-nao { right: 16px; color: var(--veto); transform: rotate(12deg); }",
    ".t-c-dep { left: 50%; top: auto; bottom: 14px; color: var(--accent); transform: translateX(-50%); }",
    ".t-corpo { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 12px; }",
    ".t-corpo h3 { font-size: 21px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: none; }",
    ".t-selos { display: flex; flex-wrap: wrap; gap: 6px; flex: none; }",
    ".t-selos span { font-size: 13px; line-height: 1.3; padding: 3px 9px; border-radius: 999px; background: var(--accent-soft); color: var(--ink); }",
    ".t-selos .t-rom { background: var(--rom); color: var(--surface); font-weight: 600; }",
    ".t-selos .t-pt { background: var(--pt-bg); color: var(--pt); font-weight: 600; }",
    ".t-selos .t-fa { background: var(--pronta-bg); color: var(--pronta); font-weight: 600; }",
    ".t-selos .t-sem { background: var(--sua-bg); color: var(--sua); }",
    ".t-selos .t-nt { background: var(--star-bg); color: var(--star); font-weight: 600; }",
    ".t-selos .t-nt.baixa { background: var(--veto-bg); color: var(--veto); }",
    ".t-selos .t-gosto { background: var(--surface); border: 2px solid var(--tc, var(--accent)); font-weight: 700; padding: 1px 8px; }",
    ".t-fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex: none; }",
    ".t-fotos img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; background: var(--line); }",
    ".t-desc { margin: 0; flex: 1 1 auto; min-height: 0; overflow: hidden; font-size: 14.5px; line-height: 1.45; color: var(--muted); -webkit-mask-image: linear-gradient(#000 65%, transparent); mask-image: linear-gradient(#000 65%, transparent); }",
    ".t-ver { flex: none; align-self: flex-start; min-height: 40px; }",
    ".t-bts { display: grid; grid-template-columns: 52px 1fr 1fr 1fr; gap: 8px; align-items: center; flex: none; }",
    ".t-bts button { min-height: 60px; border-radius: 999px; border: 2px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-size: 15px; font-weight: 700; line-height: 1.15; cursor: pointer; padding: 4px 6px; }",
    ".t-bts button:disabled { opacity: .45; cursor: default; }",
    ".t-bts .t-desf { width: 52px; height: 52px; min-height: 0; font-size: 20px; padding: 0; border-width: 1px; }",
    ".t-bts .t-b-nao { color: var(--veto); border-color: var(--veto); background: var(--veto-bg); }",
    ".t-bts .t-b-dep { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); font-size: 14px; }",
    ".t-bts .t-b-sim { color: var(--star); border-color: var(--star); background: var(--star-bg); }",
    ".t-bts .t-ico { display: block; font-size: 22px; line-height: 1; margin-bottom: 2px; }",
    ".t-dica { display: none; margin: 0; text-align: center; font-size: 12.5px; color: var(--muted); }",
    "@media (hover: hover) and (pointer: fine) { .t-dica { display: block; } .t-bts button:hover:not(:disabled) { filter: brightness(1.06); } }",
    ".t-vazio { position: absolute; inset: 0; display: grid; place-content: center; gap: 12px; text-align: center; padding: 24px; color: var(--muted); }",
    ".t-vazio strong { color: var(--ink); font-size: 18px; font-family: var(--font-display); }",
    ".t-vazio .btn { justify-self: center; min-height: 44px; }",
    "@media (min-width: 900px) {",
    "  .t-col { max-width: 880px; }",
    "  .t-card { flex-direction: row; }",
    "  .t-capa { flex: 0 0 46%; }",
    "  .t-corpo { padding: 18px 20px; gap: 10px; }",
    "  .t-corpo h3 { font-size: 24px; }",
    "  .t-bts { max-width: 560px; width: 100%; margin: 0 auto; }",
    "}",
    "@media (max-height: 600px) { .t-fotos { display: none; } .t-capa { flex-basis: 32%; } .t-corpo { padding: 10px 12px; gap: 6px; } .t-corpo h3 { font-size: 18px; } .t-bts button { min-height: 54px; } }",
    "@media (max-width: 360px) { .t-filtros select, .t-filtros .btn { font-size: 13px; min-height: 36px; } .t-topo h2 { font-size: 17px; } .t-bts { gap: 6px; grid-template-columns: 44px 1fr 1fr 1fr; } .t-bts .t-desf { width: 44px; height: 44px; } .t-bts button { font-size: 13.5px; } }",
    "@media (prefers-reduced-motion: reduce) { .t-card { transition: none; } }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- tela ----------
  var tela = document.createElement("div");
  tela.className = "t-tela"; tela.hidden = true;
  tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-labelledby", "t-tit");
  tela.innerHTML = '<div class="t-col">' +
    '<div class="t-topo"><h2 id="t-tit">🃏 Avaliar</h2><span class="t-conta" id="t-conta" aria-live="polite"></span>' +
    '<button type="button" class="t-x" data-t="fechar" aria-label="Sair do Avaliar jogos">✕</button></div>' +
    '<div class="t-filtros" role="group" aria-label="Filtrar a fila">' +
    '<select id="t-gen" aria-label="Gênero"></select>' +
    '<button type="button" class="btn" data-t="rom" aria-pressed="false">💕 Só romance</button>' +
    '<button type="button" class="btn" data-t="novos" aria-pressed="true">🆕 Só não avaliados</button></div>' +
    '<div class="t-palco" id="t-palco"></div>' +
    '<div class="t-bts">' +
    '<button type="button" class="t-desf" data-t="desfazer" aria-label="Desfazer o último" title="Desfazer o último">↶</button>' +
    '<button type="button" class="t-b-nao" data-t="nao"><span class="t-ico" aria-hidden="true">✖</span>Não quero</button>' +
    '<button type="button" class="t-b-dep" data-t="depois"><span class="t-ico" aria-hidden="true">⏭</span>Depois</button>' +
    '<button type="button" class="t-b-sim" data-t="sim"><span class="t-ico" aria-hidden="true">⭐</span>Quero</button></div>' +
    '<p class="t-dica">Teclado: ← não quero · → quero · ↓ depois · Backspace desfaz · Esc sai</p></div>';
  document.body.appendChild(tela);
  var palco = tela.querySelector("#t-palco"), selGen = tela.querySelector("#t-gen"), conta = tela.querySelector("#t-conta");
  var bDesf = tela.querySelector('[data-t="desfazer"]');

  // botão pra abrir, junto dos botões do topo
  function botao() {
    if (document.getElementById("t-abrir")) return;
    var caixa = document.getElementById("p-pac");
    if (!caixa) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn t-abrir"; b.id = "t-abrir"; b.dataset.t = "abrir"; b.textContent = "🃏 Avaliar jogos";
    var ha = document.getElementById("r-abrir") || document.getElementById("s-abrir") || document.getElementById("p-abrir");
    if (ha && ha.parentNode === caixa) ha.insertAdjacentElement("afterend", b); else caixa.appendChild(b);
  }
  botao();

  // ---------- filtro, contador ----------
  var filtro = ler(KF, {});
  if (!filtro || typeof filtro !== "object") filtro = {};
  filtro = {gen: typeof filtro.gen === "string" ? filtro.gen : "all", rom: !!filtro.rom, novos: filtro.novos !== false};
  function hojeStr() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  var hoje = ler(KH, {});
  function nHoje() { return hoje && hoje.d === hojeStr() ? hoje.n || 0 : 0; }
  function somaHoje(k) { hoje = {d: hojeStr(), n: Math.max(0, nHoje() + k)}; gravar(KH, hoje); }

  // ---------- pontuação ----------
  function perfilGen() {
    var gen = {}, tot = 0, porId = {};
    for (var i = 0; i < DATA.length; i++) porId[DATA[i].id] = DATA[i];
    var conta1 = function (id) { var g = porId[id]; if (g) { gen[g.gn] = (gen[g.gn] || 0) + 1; tot++; } };
    state.fav.forEach(conta1); state.sel.forEach(conta1);
    return {gen: gen, tot: tot || 1};
  }
  // sem window.notaGosto: nota dos jogadores + romance + gênero que você curte + RPG
  function pontoSimples(g, pg) {
    var e = EXTRA[g.id] || {}, s = e.nt ? e.nt * 0.55 : 30;
    s += g.rom === "sim" ? 25 : g.rom === "opc" ? 20 : g.rom === "leve" ? 6 : 0;
    s += ((pg.gen[g.gn] || 0) / pg.tot) * 25;
    if (g.gn === "rpg" || g.gn === "tatica") s += 6;
    if (g.l !== 5) s += 5;
    if (g.s === "pt" || g.s === "pronta") s += 3;
    if (e.nt && e.nt < 60) s -= 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  function nota(g, pg) {
    if (typeof window.notaGosto === "function") {
      try { var r = window.notaGosto(g); if (r && typeof r.n === "number" && isFinite(r.n)) return {n: r.n, cor: r.cor || "", de: 1}; } catch (e) {}
    }
    return {n: pontoSimples(g, pg), cor: "", de: 0};
  }
  function avaliadoNoApp(g) {
    if (state.fav.has(g.id) || state.sel.has(g.id)) return true;
    try { if (plano(g, "w") || plano(g, "q") || plano(g, "j")) return true; } catch (e) {}
    try { if (minhaTr(g)) return true; } catch (e) {}
    return false;
  }

  // ---------- fila ----------
  var base = [], fila = [], pos = 0, hist = [], aberto = false, mudou = false, versaoBase = "";
  function montarBase() {
    var pg = perfilGen(), rn = new Set(ler(KRN, []) || []), dp = new Set(ler(KDP, []) || []), agora = Date.now(), out = [];
    for (var i = 0; i < DATA.length; i++) {
      var g = DATA[i];
      if (g.s === "veto" || avaliadoNoApp(g)) continue;
      var r = nota(g, pg);
      out.push({g: g, n: r.n, cor: r.cor, de: r.de, av: nao.has(g.id) || rn.has(g.id), fav: false,
        dp: (depois[g.id] && agora - depois[g.id] < SEMANA) || dp.has(g.id) ? 1 : 0});
    }
    out.sort(function (a, b) { return (a.dp - b.dp) || (b.n - a.n) || (((EXTRA[b.g.id] || {}).nt || 0) - ((EXTRA[a.g.id] || {}).nt || 0)); });
    base = out;
    versaoBase = DATA.length + ":" + state.fav.size + ":" + state.sel.size;
  }
  function passa(it) {
    if (it.fav) return false;
    if (filtro.novos && it.av) return false;
    if (filtro.gen !== "all" && it.g.gn !== filtro.gen) return false;
    if (filtro.rom && it.g.rom !== "sim" && it.g.rom !== "opc") return false;
    return true;
  }
  function filtrar() {
    fila = base.filter(passa); pos = 0; hist = [];
  }
  function rot(k) { return (GENRES[k] && GENRES[k].label) || (k.charAt(0).toUpperCase() + k.slice(1)); }
  function opcoesGen() {
    var n = {}, tot = 0;
    base.forEach(function (it) {
      if (it.fav || (filtro.novos && it.av) || (filtro.rom && it.g.rom !== "sim" && it.g.rom !== "opc")) return;
      n[it.g.gn] = (n[it.g.gn] || 0) + 1; tot++;
    });
    var ks = (typeof GEN_ORDER !== "undefined" ? GEN_ORDER : []).filter(function (k) { return n[k]; });
    Object.keys(n).sort().forEach(function (k) { if (ks.indexOf(k) < 0) ks.push(k); });
    if (filtro.gen !== "all" && ks.indexOf(filtro.gen) < 0) ks.push(filtro.gen);
    selGen.innerHTML = '<option value="all">Todos os gêneros (' + tot.toLocaleString("pt-BR") + ")</option>" +
      ks.map(function (k) { return '<option value="' + esc(k) + '"' + (k === filtro.gen ? " selected" : "") + ">" + esc(rot(k)) + " (" + (n[k] || 0).toLocaleString("pt-BR") + ")</option>"; }).join("");
    selGen.value = filtro.gen;
  }
  function pintarFiltros() {
    tela.querySelector('[data-t="rom"]').setAttribute("aria-pressed", filtro.rom ? "true" : "false");
    tela.querySelector('[data-t="novos"]').setAttribute("aria-pressed", filtro.novos ? "true" : "false");
    opcoesGen();
  }
  function contar() {
    var n = nHoje(), resta = Math.max(0, fila.length - pos);
    conta.innerHTML = "Hoje você avaliou <b>" + n + "</b> · " + resta.toLocaleString("pt-BR") + (resta === 1 ? " na fila" : " na fila");
    bDesf.disabled = !hist.length;
  }

  // ---------- cartão ----------
  function selos(it) {
    var g = it.g, e = EXTRA[g.id] || {}, out = [];
    if (it.de) out.push('<span class="t-gosto" style="--tc:' + esc(String(it.cor || "").replace(/[;"<>]/g, "")) + '" title="Quanto combina com você">combina ' + Math.round(it.n) + "</span>");
    out.push("<span>" + esc(rot(g.gn)) + "</span>");
    if (g.rom === "sim" || g.rom === "opc") out.push('<span class="t-rom">💕 ' + esc(ROM[g.rom].label) + "</span>");
    else if (g.rom === "leve") out.push("<span>♡ Romance de fundo</span>");
    var ik = "";
    try { ik = idiomaKey(g); } catch (er) {}
    out.push(ik === "dub" ? '<span class="t-pt">🎙 Dublado em PT-BR</span>' : ik === "leg" ? '<span class="t-pt">💬 PT-BR</span>'
      : ik === "fa" ? '<span class="t-fa">💬 Tradução de fã</span>' : ik === "minha" ? '<span class="t-fa">✎ Sua tradução</span>' : '<span class="t-sem">Sem PT-BR</span>');
    if (e.nt) out.push('<span class="t-nt' + (e.nt < 60 ? " baixa" : "") + '" title="Nota dos jogadores">★ ' + e.nt + " dos jogadores</span>");
    if (e.hl) { try { out.push("<span>⏱ " + esc(horas(e.hl)) + "</span>"); } catch (er) {} }
    return out.join("");
  }
  function cortar(t, n) {
    t = String(t || "").replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    var c = t.slice(0, n), k = c.lastIndexOf(" ");
    return (k > n * 0.6 ? c.slice(0, k) : c) + "…";
  }
  function cartao(it, baixo) {
    var g = it.g, f = FICHA[g.id] || {}, sh = (f.sh || []).slice(0, 2);
    var el = document.createElement("article");
    el.className = "t-card" + (baixo ? " t-baixo" : "");
    el.dataset.id = g.id;
    el.setAttribute("aria-label", g.n);
    var capa = g.img ? esc(imgURL(g.img)) : "";
    el.innerHTML = '<div class="t-capa">' +
      (capa ? '<img class="t-fundo" src="' + capa + '" alt="" aria-hidden="true" referrerpolicy="no-referrer" decoding="async" draggable="false">' +
        '<img class="t-img" src="' + capa + '" alt="Capa de ' + esc(g.n) + '" referrerpolicy="no-referrer" decoding="async" draggable="false">' : "") +
      '<span class="t-carimbo t-c-sim" aria-hidden="true">⭐ QUERO</span><span class="t-carimbo t-c-nao" aria-hidden="true">✖ NÃO</span>' +
      '<span class="t-carimbo t-c-dep" aria-hidden="true">⏭ DEPOIS</span></div>' +
      '<div class="t-corpo"><h3>' + esc(g.n) + '</h3><div class="t-selos">' + selos(it) + "</div>" +
      (sh.length ? '<div class="t-fotos">' + sh.map(function (s) { return '<img src="' + esc(fotoURL(s)) + '" alt="" referrerpolicy="no-referrer" decoding="async" draggable="false">'; }).join("") + "</div>" : "") +
      '<p class="t-desc">' + esc(cortar(f.d || g.t || "Sem descrição.", 420)) + "</p>" +
      '<button type="button" class="btn t-ver" data-t="ficha">📄 Ver ficha</button></div>';
    return el;
  }
  function preCarregar() {
    for (var k = 1; k <= 2; k++) {
      var it = fila[pos + k];
      if (it && it.g.img) { var im = new Image(); im.referrerPolicy = "no-referrer"; im.src = imgURL(it.g.img); }
    }
  }
  function topo() { return palco.querySelector(".t-card:not(.t-baixo):not(.t-voa)"); }
  function vazio() {
    var temBase = base.some(function (it) { return !it.fav; });
    var d = document.createElement("div");
    d.className = "t-vazio";
    d.innerHTML = fila.length
      ? "<strong>Acabou a fila! 🎉</strong><span>Você passou por todos os jogos deste filtro. Troque o gênero ou desligue os filtros pra ver mais.</span>"
      : temBase ? "<strong>Nada com esses filtros</strong><span>Troque o gênero ou desligue \"Só com romance\".</span>"
      : "<strong>Nada pra avaliar</strong><span>Baixe mais gêneros do catálogo pra ter mais jogos.</span>";
    if (!(window.PACOTES_INST || []).length || !temBase) d.innerHTML += '<button type="button" class="btn" data-t="pacotes">📦 Gêneros do catálogo</button>';
    return d;
  }
  // desenha do zero: o jogo atual por cima e o próximo atrás
  function desenhar(entrada) {
    palco.textContent = "";
    var it = fila[pos];
    if (!it) { palco.appendChild(vazio()); contar(); travar(true); return; }
    travar(false);
    if (fila[pos + 1]) palco.appendChild(cartao(fila[pos + 1], true));
    var c = cartao(it, false);
    if (entrada && !reduzido()) {
      c.classList.add("t-entra");
      c.style.transform = entrada;
      palco.appendChild(c);
      void c.offsetWidth;
      c.classList.remove("t-entra");
      c.style.transform = "";
    } else palco.appendChild(c);
    ligar(c);
    preCarregar();
    contar();
  }
  function travar(sim) {
    ["nao", "depois", "sim"].forEach(function (a) { tela.querySelector('[data-t="' + a + '"]').disabled = sim; });
  }
  // depois de decidir: o de trás vem pra frente e entra um novo atrás (sem redesenhar as imagens)
  function avancarDOM() {
    var tras = palco.querySelector(".t-card.t-baixo");
    if (!fila[pos]) { palco.querySelectorAll(".t-vazio, .t-card:not(.t-voa)").forEach(function (x) { x.remove(); }); palco.appendChild(vazio()); travar(true); contar(); return; }
    if (tras && tras.dataset.id === fila[pos].g.id) {
      tras.classList.remove("t-baixo");
      ligar(tras);
    } else {
      palco.querySelectorAll(".t-card:not(.t-voa)").forEach(function (x) { x.remove(); });
      var c = cartao(fila[pos], false); palco.appendChild(c); ligar(c);
    }
    var prox = fila[pos + 1];
    if (prox) palco.insertBefore(cartao(prox, true), palco.firstChild);
    preCarregar();
    contar();
  }
  function reduzido() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function voar(card, acao, dx, dy) {
    if (!card) return;
    card.classList.remove("t-arr");
    card.classList.add("t-voa");
    var W = Math.max(window.innerWidth, 500);
    var sel = card.querySelector(acao === "sim" ? ".t-c-sim" : acao === "nao" ? ".t-c-nao" : ".t-c-dep");
    if (sel) sel.style.opacity = 1;
    if (reduzido()) { card.remove(); return; }
    var t = acao === "depois" ? "translate(" + (dx || 0) + "px," + (-window.innerHeight * 1.1) + "px)"
      : "translate(" + (acao === "sim" ? W * 1.2 : -W * 1.2) + "px," + ((dy || 0) + 40) + "px) rotate(" + (acao === "sim" ? 28 : -28) + "deg)";
    requestAnimationFrame(function () { card.style.transform = t; card.style.opacity = "0"; });
    setTimeout(function () { card.remove(); }, 380);
  }

  // ---------- decidir e desfazer ----------
  function vibra() {
    try { var aj = JSON.parse(localStorage.getItem(KEY + "-C-ajustes") || "{}"); if (aj.vibrar === false) return; } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  }
  function decidir(acao, dx, dy) {
    var it = fila[pos];
    if (!it || !aberto) return;
    var id = it.g.id, h = {it: it, acao: acao, eraNao: nao.has(id), eraAv: it.av, dep: depois[id], eraDp: it.dp, pos: pos, empurrou: false};
    if (acao === "sim") {
      state.fav.add(id); it.fav = true;
      if (nao.delete(id)) gravarNao();
      save(); mudou = true; somaHoje(1);
    } else if (acao === "nao") {
      nao.add(id); it.av = true; gravarNao(); mudou = true; somaHoje(1);
    } else {
      depois[id] = Date.now(); it.dp = 1; gravar(KD, depois);
      fila.push(it); h.empurrou = true;
    }
    hist.push(h);
    if (hist.length > 200) hist.shift();
    vibra();
    pos++;
    voar(topo(), acao, dx, dy);
    avancarDOM();
  }
  function desfazer() {
    var h = hist.pop();
    if (!h || !aberto) return;
    var it = h.it, id = it.g.id;
    if (h.acao === "sim") {
      state.fav.delete(id); it.fav = false;
      if (h.eraNao) { nao.add(id); gravarNao(); }
      save(); somaHoje(-1);
    } else if (h.acao === "nao") {
      if (!h.eraNao) { nao.delete(id); gravarNao(); }
      it.av = h.eraAv; somaHoje(-1);
    } else {
      if (h.dep) depois[id] = h.dep; else delete depois[id];
      it.dp = h.eraDp; gravar(KD, depois);
      if (h.empurrou && fila[fila.length - 1] === it) fila.pop();
    }
    mudou = true;
    pos = h.pos;
    var W = Math.max(window.innerWidth, 500);
    desenhar(h.acao === "sim" ? "translate(" + W + "px,40px) rotate(24deg)" : h.acao === "nao" ? "translate(" + (-W) + "px,40px) rotate(-24deg)" : "translateY(" + (-window.innerHeight) + "px)");
  }

  // ---------- arrastar (dedo, caneta ou mouse) ----------
  function ligar(card) {
    if (!card || card._tLigado) return;
    card._tLigado = true;
    var pid = null, x0 = 0, y0 = 0, dx = 0, dy = 0, ativo = false, t0 = 0, raf = 0;
    var cS = card.querySelector(".t-c-sim"), cN = card.querySelector(".t-c-nao"), cD = card.querySelector(".t-c-dep");
    function aplicar() {
      raf = 0;
      card.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (dx / 18) + "deg)";
      var sobe = -dy > Math.abs(dx) ? Math.min(1, -dy / 110) : 0;
      cS.style.opacity = sobe ? 0 : Math.max(0, Math.min(1, dx / 100));
      cN.style.opacity = sobe ? 0 : Math.max(0, Math.min(1, -dx / 100));
      cD.style.opacity = sobe;
    }
    card.addEventListener("pointerdown", function (e) {
      if (pid !== null || (e.button && e.button !== 0) || (e.target.closest && e.target.closest("button"))) return;
      pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; ativo = false; t0 = performance.now();
    });
    card.addEventListener("pointermove", function (e) {
      if (e.pointerId !== pid) return;
      dx = e.clientX - x0; dy = e.clientY - y0;
      if (!ativo && dx * dx + dy * dy > 64) {
        ativo = true; card.classList.add("t-arr");
        try { card.setPointerCapture(pid); } catch (er) {}
      }
      if (ativo && !raf) raf = requestAnimationFrame(aplicar);
    });
    function soltar(e) {
      if (e.pointerId !== pid) return;
      pid = null;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!ativo) return;
      ativo = false;
      var dt = Math.max(1, performance.now() - t0), vx = dx / dt, vy = dy / dt, lim = Math.min(110, card.offsetWidth * 0.28);
      if (e.type !== "pointercancel") {
        if (-dy > Math.abs(dx) && (-dy > 110 || (-dy > 40 && vy < -0.6))) { decidir("depois", dx, dy); return; }
        if (dx > lim || (dx > 40 && vx > 0.6)) { decidir("sim", dx, dy); return; }
        if (dx < -lim || (dx < -40 && vx < -0.6)) { decidir("nao", dx, dy); return; }
      }
      card.classList.remove("t-arr");
      card.style.transform = "";
      cS.style.opacity = cN.style.opacity = cD.style.opacity = 0;
    }
    card.addEventListener("pointerup", soltar);
    card.addEventListener("pointercancel", soltar);
    card.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  // ---------- abrir e fechar ----------
  function abrir() {
    if (aberto) return;
    aberto = true; mudou = false;
    tela.hidden = false; document.documentElement.classList.add("t-aberto");
    try { history.pushState({tinder: true}, ""); } catch (e) {}
    palco.innerHTML = '<div class="t-vazio"><span>Montando a fila…</span></div>';
    conta.textContent = "";
    setTimeout(function () {
      if (!aberto) return;
      montarBase(); filtrar(); pintarFiltros(); desenhar();
      var b = tela.querySelector('[data-t="sim"]');
      if (b && matchMedia("(hover: hover)").matches) try { tela.querySelector(".t-x").focus({preventScroll: true}); } catch (e) {}
    }, 30);
  }
  function fechar(peloVoltar) {
    if (!aberto) return;
    aberto = false; tela.hidden = true; document.documentElement.classList.remove("t-aberto");
    palco.textContent = ""; hist = [];
    if (mudou) {
      try { renderList(); } catch (e) {}
      try { renderMeter(); } catch (e) {}
      try { if (window.S_interesse) S_interesse(); } catch (e) {}
    }
    if (!peloVoltar && history.state && history.state.tinder) { try { history.back(); } catch (e) {} }
    var b = document.getElementById("t-abrir");
    if (b) try { b.focus({preventScroll: true}); } catch (e) {}
  }
  function trocarFiltro() {
    gravar(KF, filtro);
    filtrar(); pintarFiltros(); desenhar();
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-t]") : null;
    if (!b || (b.tagName !== "BUTTON")) return;
    var a = b.dataset.t;
    if (a === "abrir") { abrir(); return; }
    if (!aberto || !tela.contains(b)) return;
    if (a === "fechar") fechar(false);
    else if (a === "sim" || a === "nao" || a === "depois") decidir(a, 0, 0);
    else if (a === "desfazer") desfazer();
    else if (a === "ficha") { var it = fila[pos]; if (it) abrirFicha(it.g.id); }
    else if (a === "rom") { filtro.rom = !filtro.rom; trocarFiltro(); }
    else if (a === "novos") { filtro.novos = !filtro.novos; trocarFiltro(); }
    else if (a === "pacotes") { fechar(false); setTimeout(function () { var p = document.getElementById("p-abrir"); if (p) p.click(); }, 80); }
  });
  selGen.addEventListener("change", function () { filtro.gen = selGen.value; trocarFiltro(); selGen.blur(); });
  window.addEventListener("popstate", function () {
    // a ficha aberta por cima fecha primeiro (o módulo dela cuida disso)
    if (aberto && !(history.state && history.state.tinder) && !(document.getElementById("ficha") || {}).open) fechar(true);
  });
  function algumDialogo() { return !!document.querySelector("dialog[open]"); }
  document.addEventListener("keydown", function (e) {
    if (!aberto || algumDialogo() || e.altKey || e.ctrlKey || e.metaKey) return;
    var tg = e.target, campo = tg && (tg.tagName === "SELECT" || tg.tagName === "INPUT" || tg.tagName === "TEXTAREA");
    if (e.key === "Escape") { e.preventDefault(); fechar(false); return; }
    if (campo) return;
    var k = e.key;
    if (k === "ArrowRight") { e.preventDefault(); decidir("sim", 0, 0); }
    else if (k === "ArrowLeft") { e.preventDefault(); decidir("nao", 0, 0); }
    else if (k === "ArrowDown" || k === "ArrowUp") { e.preventDefault(); decidir("depois", 0, 0); }
    else if (k === "Backspace" || k === "z" || k === "Z") { e.preventDefault(); desfazer(); }
    else if (k === "Enter" && tg === document.body) { var it = fila[pos]; if (it) { e.preventDefault(); abrirFicha(it.g.id); } }
  });
  // se a base ficou velha (catálogo cresceu ou estrelas mudaram fora daqui), remonta na próxima abertura
  window.T_abrir = abrir;
  window.T_info = function () { return {base: base.length, fila: fila.length, pos: pos, hoje: nHoje(), dispensados: nao.size, versao: versaoBase}; };
})();

