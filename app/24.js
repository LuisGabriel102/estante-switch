/* mod_J_descobrir.js */
// Três jeitos de achar o que jogar (pedido de 26/11):
//  🎡 Roleta da indecisão: de 5 a 10 jogos numa roleta de verdade (desacelera; som opcional, desligado;
//     sem animação se o aparelho pede menos movimento). A última roleta fica guardada no aparelho.
//  💎 Joia escondida: nota alta (EXTRA.nt >= 85) e pouco conhecido (fora de série famosa, de editora grande,
//     da sua lista de destaques/recomendados; pequeno, sem cara de app). Selo na capa e na ficha,
//     fileira "Joias escondidas pra você" e o filtro "Só as joias". Calculado uma vez (e nos jogos que chegam).
//  ✨ Mesma vibe: ao dar estrela num jogo (lista, ficha, Avaliar, Descobrir), um aviso discreto embaixo
//     mostra 3 parecidos (do "Parecidos com este" do mod_W). Não aparece ao tirar estrela nem em massa.
// Vem depois do mod_W_porque.js (usa notaGosto e W_parecidos) e antes do mod_F_busca.js.
(function () {
  "use strict";
  var NOTA_MIN = 85;          // nota mínima da joia
  var MAX_GB = 8;             // jogo maior que isso costuma ser dos grandes
  var N_ROLETA = [5, 10];     // mínimo e máximo de jogos na roleta
  var VIBE_SEG = 10;          // segundos que o aviso "Mesma vibe" fica na tela
  var KR = KEY + "-J-roleta";
  var TAU = Math.PI * 2;

  function ler(k, p) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? p : v; } catch (e) { return p; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function reduz() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function nota(g) { return (EXTRA[g.id] && EXTRA[g.id].nt) || 0; }
  function gosto(g) { try { return window.notaGosto ? notaGosto(g) : {n: 50, cor: "amarelo"}; } catch (e) { return {n: 50, cor: "amarelo"}; } }
  function genNome(g) { return (GENRES[g.gn] && GENRES[g.gn].label) || g.gn; }
  function capaGrande(g) { return g.img ? imgURL(g.img) : ""; }

  // ---------- estilo ----------
  var css = document.createElement("style");
  css.textContent = [
    // selo e ficha
    ".selo.j-joia { background: #6b3fc9; color: #fff; }",
    "html[data-cols=\"4\"] .selo.j-joia .j-txt, html[data-cols=\"3\"] .selo.j-joia .j-txt { display: none; }",
    "#ficha .ficha-dados .j-fd { font-weight: 600; }",
    // fileira
    ".j-row .vit-head { flex-wrap: wrap; }",
    ".j-row .j-ver { margin-left: auto; }",
    ".j-row-txt { margin: -4px 0 8px; color: var(--muted); font-size: 14px; }",
    // botão do topo
    ".j-abrir { margin-left: 8px; }",
    // roleta
    "#j-dlg { border: 0; border-radius: 18px; padding: 0; width: min(920px, calc(100% - 16px)); max-width: none; max-height: calc(100dvh - 16px); background: var(--surface); color: var(--ink); box-shadow: 0 20px 60px rgba(0,0,0,.35); overflow: auto; overscroll-behavior: contain; }",
    "#j-dlg::backdrop { background: rgba(10,15,30,.6); }",
    "#j-dlg .j-in { padding: 14px 16px 18px; }",
    ".j-topo { display: flex; align-items: center; gap: 8px; }",
    ".j-topo h2 { margin: 0; flex: 1; font-family: var(--font-display); font-size: 21px; line-height: 1.2; }",
    ".j-topo button { min-height: 40px; min-width: 40px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-size: 14px; cursor: pointer; padding: 0 12px; }",
    ".j-topo .j-som[aria-pressed=\"true\"] { border-color: var(--accent); background: var(--accent-soft); }",
    ".j-sub { margin: 4px 0 10px; color: var(--muted); font-size: 14px; }",
    ".j-corpo { display: grid; gap: 14px; }",
    "@media (min-width: 760px) { .j-corpo { grid-template-columns: minmax(300px, 380px) 1fr; align-items: start; gap: 22px; } }",
    ".j-roda-col { display: grid; justify-items: center; gap: 10px; }",
    ".j-roda { position: relative; width: 100%; max-width: 360px; aspect-ratio: 1; }",
    ".j-roda canvas { display: block; width: 100%; height: 100%; }",
    ".j-seta { position: absolute; top: -4px; left: 50%; width: 0; height: 0; transform: translateX(-50%); border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 28px solid var(--ink); filter: drop-shadow(0 2px 2px rgba(0,0,0,.35)); }",
    ".j-girar { min-height: 52px; min-width: 200px; border: 0; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font: inherit; font-size: 18px; font-weight: 800; cursor: pointer; padding: 0 22px; box-shadow: 0 3px 10px rgba(0,0,0,.2); }",
    ".j-girar:disabled { opacity: .5; cursor: default; }",
    ".j-aviso { margin: 0; min-height: 1.3em; text-align: center; font-size: 14px; color: var(--muted); }",
    ".j-res { display: grid; grid-template-columns: 128px 1fr; gap: 12px; align-items: start; padding: 12px; border-radius: 14px; border: 2px solid var(--accent); background: var(--accent-soft); margin-bottom: 14px; }",
    ".j-res[hidden] { display: none; }",
    ".j-res.j-velho { border-style: dashed; border-color: var(--line); background: transparent; }",
    ".j-res-capa { width: 128px; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--line); display: grid; place-items: center; }",
    ".j-res-capa img { width: 100%; height: 100%; object-fit: cover; display: block; }",
    ".j-res-capa svg { width: 56px; height: 56px; color: var(--muted); }",
    "@media (min-width: 760px) { .j-res { grid-template-columns: 180px 1fr; } .j-res-capa { width: 180px; } }",
    ".j-res-rot { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); }",
    ".j-res.j-velho .j-res-rot { color: var(--muted); }",
    ".j-res h3 { margin: 2px 0 4px; font-family: var(--font-display); font-size: 21px; line-height: 1.2; }",
    ".j-res p { margin: 0 0 8px; font-size: 14px; color: var(--muted); }",
    ".j-res-bts { display: flex; flex-wrap: wrap; gap: 6px; }",
    ".j-res-bts button { min-height: 40px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; padding: 0 12px; }",
    ".j-res-bts .j-b1 { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }",
    ".j-res.j-pulo { animation: j-pulo .5s ease-out; }",
    "@keyframes j-pulo { 0% { transform: scale(.94); opacity: .3; } 100% { transform: none; opacity: 1; } }",
    ".j-lista-cab { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }",
    ".j-lista-cab h3 { margin: 0; flex: 1; font-size: 16px; }",
    ".j-lista-cab h3 span { color: var(--muted); font-weight: 400; }",
    ".j-lista, .j-achados { list-style: none; margin: 8px 0; padding: 0; display: grid; gap: 6px; }",
    ".j-lista li, .j-achados li { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 4px 6px 4px 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }",
    ".j-lista img, .j-achados img, .j-mini { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex: none; background: var(--line); }",
    ".j-cor { width: 10px; align-self: stretch; border-radius: 6px; flex: none; }",
    ".j-nm { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }",
    ".j-nm small { display: block; color: var(--muted); font-size: 12px; }",
    ".j-lista button, .j-achados button { flex: none; min-width: 40px; min-height: 40px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; cursor: pointer; }",
    ".j-achados button { padding: 0 12px; font-weight: 600; color: var(--accent); border-color: var(--accent); }",
    ".j-lista li.j-ganhou { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent) inset; }",
    ".j-busca-rot { display: block; margin-top: 10px; font-size: 14px; font-weight: 600; }",
    "#j-busca { width: 100%; box-sizing: border-box; min-height: 44px; margin-top: 4px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font: inherit; font-size: 16px; }",
    ".j-achados .j-nada, .j-lista .j-nada { border-style: dashed; color: var(--muted); font-size: 14px; padding: 8px 10px; }",
    // mesma vibe
    ".j-vibe { position: fixed; left: 8px; right: 8px; bottom: calc(var(--a-barra-h, 70px) + 10px); z-index: 70; max-width: 460px; margin: 0 auto; padding: 10px 10px 12px; border-radius: 16px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); box-shadow: 0 10px 30px rgba(0,0,0,.28); overflow: hidden; animation: j-sobe .28s ease-out; }",
    ".j-vibe.j-v-cima { bottom: auto; top: calc(64px + env(safe-area-inset-top)); }",
    ".j-vibe.j-v-dlg { bottom: calc(12px + env(safe-area-inset-bottom)); }",
    "@keyframes j-sobe { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }",
    ".j-v-top { display: flex; align-items: flex-start; gap: 8px; }",
    ".j-v-tit { margin: 2px 0 8px; flex: 1; font-size: 14px; line-height: 1.3; }",
    ".j-v-x { flex: none; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; cursor: pointer; }",
    ".j-v-lista { display: grid; grid-template-columns: repeat(3, minmax(0, 96px)); gap: 10px; }",
    ".j-v-it { position: relative; min-width: 0; }",
    ".j-v-capa { display: block; width: 100%; padding: 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }",
    ".j-v-capa .j-v-img { display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: var(--line); }",
    ".j-v-capa img { width: 100%; height: 100%; object-fit: cover; display: block; }",
    ".j-v-capa svg { width: 40%; height: 40%; color: var(--muted); }",
    ".j-v-nm { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px; font-size: 12.5px; line-height: 1.25; }",
    "@media (min-width: 700px) { .j-v-lista { grid-template-columns: repeat(3, minmax(0, 120px)); } }",
    ".j-vibe .j-v-fav { position: absolute; top: 3px; right: 3px; width: 32px; height: 32px; font-size: 17px; display: grid; place-items: center; box-shadow: 0 1px 3px rgba(0,0,0,.3); }",
    ".j-v-barra { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: var(--accent); transform-origin: left; }",
    "@media (prefers-reduced-motion: reduce) { .j-vibe, .j-res.j-pulo { animation: none; } .j-v-barra { display: none; } }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- jogos por id (e os que chegam do catálogo) ----------
  var porIdJ = {};
  DATA.forEach(function (g) { porIdJ[g.id] = g; });

  // =====================================================================
  // 💎 JOIA ESCONDIDA
  // =====================================================================
  // série/franquia famosa ou sucesso indie que todo mundo conhece (pelo nome)
  var FAMA = new RegExp([
    "final fantasy|dragon quest|xenoblade|pok[eé]mon|persona\\b|shin megami|tales of |\\btrails |legend of heroes|\\bys\\b|atelier|octopath|bravely|kingdom hearts|zelda|mario\\b|rune factory|star ocean|ni no kuni|monster hunter|romancing saga|secret of mana|trials of mana|digimon",
    "witcher|skyrim|elder scrolls|fallout|divinity|baldur|pillars of eternity|knights of the old republic|chrono (trigger|cross)|suikoden|grandia|dragon'?s dogma|diablo|torchlight|south park|hogwarts|sea of stars|undertale|deltarune|live a live|triangle strategy|valkyria|star wars|dragon ball|naruto|one piece|sword art online|yo-kai|fire emblem|disgaea|mega ?man|phantasy star|crisis core|darkest dungeon",
    "metroid|kirby|pikmin|animal crossing|splatoon|smash bros|donkey kong|yoshi|luigi|bayonetta|okami|castlevania|metal gear|sonic\\b|doom\\b|quake|wolfenstein|bioshock|xcom|batman|tomb raider|red dead|grand theft|it takes two|five nights at freddy|steins;gate|fate/|clannad|ace attorney|ghost trick|teenage mutant|tmnt|streets of rage|ninja gaiden|tony hawk|crysis|\\bmetro\\b|system shock|tetris|katamari|minecraft|terraria|overcooked|rocket league|fall guys|among us",
    "hollow knight|celeste|\\bhades\\b|stardew|cuphead|shovel knight|spelunky|binding of isaac|balatro|dead cells|slay the spire|outer wilds|obra dinn|inscryption|\\bbraid\\b|\\bfez\\b|\\blimbo\\b|ori and the|hotline miami|katana zero|untitled goose|dave the diver|danganronpa|nier|monster boy|cult of the lamb|vampire survivors|blasphemous|bloodstained|dark souls|resident evil|silent hill|street fighter|mortal kombat|tekken|lego |marvel|portal\\b|half-life|cadence of hyrule|necrodancer|night in the woods|omori|disco elysium"
  ].join("|"), "i");
  // editoras grandes (nome no SI_ED)
  var BIG = /^(nintendo|square enix|sega|atlus|bandai namco|koei tecmo|capcom|konami|level-?5|the pok[eé]mon company|bethesda|cd projekt|larian|ubisoft|thq nordic|warner|wb games|electronic arts|ea\b|2k|microsoft|private division|aspyr|activision|blizzard|plaion|deep silver|505 games|sony|riot|rockstar|mojang|epic games|annapurna|supergiant|team17|crytek|focus|nacon)/i;
  // app, passatempo de cartas e afins (nota alta de pouca gente)
  var LIXO = /hentai|calculator|solitaire|mahjong|crossword|trivia|smilebasic|sudoku|picross|jigsaw|coloring|pinball/i;
  var REC_ = new Set(typeof REC !== "undefined" ? REC : []);
  function pistas(g) {
    var k = {}, ed = -1, s = typeof g.si === "string" ? g.si : "", f = s.indexOf(".");
    if (f < 0) f = s.length; else ed = parseInt(s.slice(f + 1), 36);
    for (var i = 0; i + 1 < f; i += 2) k[s.substr(i, 2)] = 1;
    return {k: k, ed: ed};
  }
  function ehJoia(g) {
    var nt = nota(g);
    if (nt < NOTA_MIN || nt >= 99) return false;           // nota cheia costuma ser de pouquíssimos votos
    if (g.s === "veto" || g.s === "espera" || g.x) return false;
    if (g.h > 0 || REC_.has(g.id)) return false;           // seus destaques e os recomendados de sempre
    if (FAMA.test(g.n)) return false;
    if (g.g != null && g.g > MAX_GB) return false;
    var p = pistas(g), ed = p.ed >= 0 && window.SI_ED ? SI_ED[p.ed] || "" : "";
    if (ed && BIG.test(ed)) return false;
    if (LIXO.test(g.n) || p.k.ed || p.k.ca) return false;
    return true;
  }
  var JOIA = new Set(), JOIA_L = [];
  function olharJoias(lista) {
    var n = 0;
    for (var i = 0; i < lista.length; i++) {
      var g = lista[i];
      if (!JOIA.has(g.id) && ehJoia(g)) { JOIA.add(g.id); JOIA_L.push(g); n++; }
    }
    return n;
  }
  olharJoias(DATA);

  var SELO = '<span class="selo j-joia" title="Joia escondida: nota alta e pouco conhecido">💎<span class="j-txt"> Joia</span></span>';
  if (typeof selosHTML === "function") {
    var selosAntJ = selosHTML;
    selosHTML = function (g) {
      var r = selosAntJ.apply(this, arguments);
      if (!g || !JOIA.has(g.id)) return r;
      return r ? r.replace('<span class="selos">', '<span class="selos">' + SELO) : '<span class="selos">' + SELO + "</span>";
    };
  }
  // capas que já estavam na tela antes deste módulo
  function seloNaTela() {
    document.querySelectorAll("[data-card], .vit-item[data-previa]").forEach(function (el) {
      var id = el.getAttribute("data-card") || el.getAttribute("data-previa");
      if (!JOIA.has(id)) return;
      var cv = el.querySelector(".cover");
      if (!cv || cv.querySelector(".j-joia")) return;
      var s = cv.querySelector(".selos");
      if (s) s.insertAdjacentHTML("afterbegin", SELO); else cv.insertAdjacentHTML("beforeend", '<span class="selos">' + SELO + "</span>");
    });
  }
  try { seloNaTela(); } catch (e) {}

  // na ficha: uma linha nos dados
  function joiaNaFicha(id) {
    var g = porIdJ[id], d = ficha && ficha.querySelector(".ficha-dados");
    if (!g || !d || d.querySelector(".j-fd")) return;
    d.insertAdjacentHTML("afterbegin", '<span class="j-fd">💎 Joia escondida: nota ' + nota(g) + " e pouco conhecido</span>");
  }

  // filtro "Só as joias"
  state.soJoia = false;
  var chk = null, chkTxt = null;
  (function () {
    var caixa = document.querySelector(".filtros-checks");
    if (!caixa) return;
    var lab = document.createElement("label");
    lab.className = "check"; lab.setAttribute("for", "j-so");
    lab.innerHTML = '<input type="checkbox" id="j-so"> <span id="j-so-txt"></span>';
    caixa.appendChild(lab);
    chk = lab.querySelector("input"); chkTxt = lab.querySelector("#j-so-txt");
    chk.addEventListener("change", function () { state.soJoia = chk.checked; renderList(); });
  })();
  function contaFiltro() { if (chkTxt) chkTxt.textContent = "💎 Só as joias escondidas (" + JOIA.size.toLocaleString("pt-BR") + ")"; }
  contaFiltro();
  if (typeof tamOk === "function") {
    var tamAntJ = tamOk;
    tamOk = function (g) { return (!state.soJoia || JOIA.has(g.id)) && tamAntJ.apply(this, arguments); };
  }
  if (typeof filtrosAtivos === "function") {
    var ativosAntJ = filtrosAtivos;
    filtrosAtivos = function () { return ativosAntJ.apply(this, arguments) + (state.soJoia ? 1 : 0); };
  }
  if (typeof limparFiltros === "function") {
    var limparAntJ = limparFiltros;
    limparFiltros = function () { state.soJoia = false; if (chk) chk.checked = false; return limparAntJ.apply(this, arguments); };
  }

  // fileira "💎 Joias escondidas pra você" (acima da lista)
  var sec = document.createElement("section");
  sec.className = "vit-row group j-row"; sec.id = "j-joias"; sec.hidden = true;
  sec.setAttribute("aria-labelledby", "j-joias-tit");
  (function () {
    var pular = document.getElementById("pular"), lista = document.getElementById("lista-jogos"), ref = pular || lista;
    if (ref && ref.parentNode) ref.parentNode.insertBefore(sec, ref);
  })();
  var NV = typeof NVIT === "number" ? NVIT : 24, chaveRow = "";
  var PRIO = {rpgnicho: 14, rpg: 12, tatica: 12};
  function itensRow() {
    var fora = window.T_dispensados ? T_dispensados() : null, out = [];
    for (var i = 0; i < JOIA_L.length; i++) {
      var g = JOIA_L[i];
      if (state.fav.has(g.id) || state.sel.has(g.id) || (fora && fora.has(g.id)) || plano(g, "j")) continue;
      var r = gosto(g), b = PRIO[g.gn] || 0;
      b += g.rom === "sim" || g.rom === "opc" ? 10 : g.rom === "leve" ? 3 : 0;
      out.push([r.cor === "vermelho" ? -100 + r.n : r.n + b + nota(g) / 20, g]);
    }
    out.sort(function (a, b) { return b[0] - a[0]; });
    return out.map(function (x) { return x[1]; });
  }
  function fileira() {
    if (state.view === "quadro" || state.plAtiva || state.soJoia || (state.q || "").trim()) { sec.hidden = true; return; }
    var it = itensRow();
    if (it.length < 3) { sec.hidden = true; return; }
    var mostra = it.slice(0, NV);
    var chave = mostra.map(function (g) { return g.id; }).join(",") + "|" + it.length + "|" + JOIA.size;
    sec.hidden = false;
    if (chave === chaveRow) return;
    chaveRow = chave;
    sec.innerHTML = '<div class="vit-head"><h2 id="j-joias-tit">💎 Joias escondidas pra você</h2><span class="count">' + it.length + (it.length === 1 ? " jogo" : " jogos") + "</span>" +
      '<button type="button" class="limpar j-ver" data-j-sojoias>Ver só as joias</button></div>' +
      '<p class="j-row-txt">Nota alta dos jogadores e pouco conhecidos. RPG, tática e romance vêm primeiro.</p>' +
      '<div class="vit-wrap"><button type="button" class="vit-seta esq" data-rolar="-1" aria-label="Voltar">‹</button>' +
      '<div class="vit-trilho">' + mostra.map(vitCard).join("") + "</div>" +
      '<button type="button" class="vit-seta dir" data-rolar="1" aria-label="Avançar">›</button></div>';
  }
  if (typeof renderList === "function") {
    var renderAntJ = renderList;
    renderList = function () {
      var r = renderAntJ.apply(this, arguments);
      try { fileira(); } catch (e) { sec.hidden = true; }
      return r;
    };
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("[data-j-sojoias]")) return;
    state.soJoia = true; if (chk) chk.checked = true;
    renderList();
    var m = document.getElementById("mostrando") || document.getElementById("lista-jogos");
    if (m) m.scrollIntoView({block: "start", behavior: reduz() ? "auto" : "smooth"});
  });
  try { fileira(); } catch (e) {}

  // =====================================================================
  // ✨ MESMA VIBE
  // =====================================================================
  // parecidos: o índice do mod_W (W_parecidosG devolve os jogos; W_parecidos só os nomes); sem ele, um simples daqui
  var SUF = / \((Mesma série|Mesmo estilo|Parecido|Mesmo gênero|Mesma editora|Também tem romance)\)$/;
  var porNome = null;
  function mapaNomes() {
    if (!porNome) { porNome = new Map(); DATA.forEach(function (g) { if (!porNome.has(g.n)) porNome.set(g.n, g); }); }
    return porNome;
  }
  var porGen = null;
  function meusParecidos(g0) {
    if (!porGen) {
      porGen = {};
      DATA.forEach(function (g) { if (nota(g) >= 75 && g.s !== "veto") (porGen[g.gn] = porGen[g.gn] || []).push(g); });
      Object.keys(porGen).forEach(function (k) { porGen[k].sort(function (a, b) { return nota(b) - nota(a); }); porGen[k] = porGen[k].slice(0, 80); });
    }
    var rom = g0.rom === "sim" || g0.rom === "opc";
    return (porGen[g0.gn] || []).slice().sort(function (a, b) {
      var ra = rom && (a.rom === "sim" || a.rom === "opc") ? 1 : 0, rb = rom && (b.rom === "sim" || b.rom === "opc") ? 1 : 0;
      return rb - ra;
    }).slice(0, 12);
  }
  function parecidosDe(g) {
    var l = [];
    try {
      if (window.W_parecidosG) l = W_parecidosG(g.id) || [];
      else if (window.W_parecidos) { var M = mapaNomes(); l = W_parecidos(g.id).map(function (s) { return M.get(String(s).replace(SUF, "")); }); }
    } catch (e) { l = []; }
    if (!l.length) l = meusParecidos(g);
    var fora = window.T_dispensados ? T_dispensados() : null, bons = [], fracos = [], vis = {}, n0 = norm(g.n);
    function mesmo(x) { var a = norm(x.n); return a.indexOf(n0) === 0 || n0.indexOf(a) === 0; }   // outra edição do mesmo jogo
    l.forEach(function (x) {
      if (!x || vis[x.id] || x.id === g.id || mesmo(x) || state.fav.has(x.id) || x.s === "veto" || x.x || (fora && fora.has(x.id))) return;
      vis[x.id] = 1;
      (gosto(x).cor === "vermelho" ? fracos : bons).push(x);
    });
    return bons.concat(fracos).slice(0, 3);
  }

  var tEl = null, tTimer = 0, tResta = 0, tDesde = 0, tId = null, daVibeAte = 0;
  function fecharVibe() {
    clearTimeout(tTimer); tTimer = 0;
    if (tEl && tEl.parentNode) tEl.parentNode.removeChild(tEl);
    tEl = null; tId = null;
  }
  function relogio(ms) {
    clearTimeout(tTimer);
    tResta = ms; tDesde = Date.now();
    tTimer = setTimeout(fecharVibe, ms);
    var b = tEl && tEl.querySelector(".j-v-barra");
    if (b && !reduz() && b.animate) {
      if (b._a) b._a.cancel();
      b._a = b.animate([{transform: "scaleX(" + (ms / (VIBE_SEG * 1000)) + ")"}, {transform: "scaleX(0)"}], {duration: ms, fill: "forwards"});
    }
  }
  function pausa() {
    if (!tTimer) return;
    clearTimeout(tTimer); tTimer = 0;
    tResta = Math.max(1500, tResta - (Date.now() - tDesde));
    var b = tEl && tEl.querySelector(".j-v-barra");
    if (b && b._a) b._a.pause();
  }
  function retoma() { if (tEl && !tTimer) relogio(tResta); }
  function dialogoTopo() {
    if (ficha && ficha.open) return ficha;
    var ds = document.querySelectorAll("dialog[open]");
    return ds.length ? ds[ds.length - 1] : null;
  }
  function lugarVibe() {
    if (!tEl) return;
    var d = dialogoTopo(), pai = d || document.body;
    if (tEl.parentNode !== pai) pai.appendChild(tEl);
    tEl.classList.toggle("j-v-dlg", !!d);
    tEl.classList.toggle("j-v-cima", !d && !!document.querySelector(".t-tela:not([hidden]), .desc-tela:not([hidden])"));
  }
  function capaMini(g, cls) {
    return g.img ? '<img class="' + (cls || "") + '" src="' + esc(imgURL(g.img)) + '" alt="" decoding="async" referrerpolicy="no-referrer">' : (GENRES[g.gn] ? GENRES[g.gn].svg : "");
  }
  function mostrarVibe(id) {
    var g = porIdJ[id];
    if (!g || !state.fav.has(id)) return;
    var l = parecidosDe(g);
    if (!l.length) return;
    fecharVibe();
    tId = id;
    // mesma série: "The Legend of Heroes: Trails from Zero" vira "Trails from Zero" (o começo já está no título)
    var pre = g.n.indexOf(": ") > 0 ? g.n.slice(0, g.n.indexOf(": ") + 2) : "";
    function curto(n) { return pre && n.indexOf(pre) === 0 && n.length > pre.length ? n.slice(pre.length) : n; }
    tEl = document.createElement("div");
    tEl.className = "j-vibe";
    tEl.setAttribute("role", "status");
    tEl.setAttribute("aria-live", "polite");
    tEl.innerHTML = '<div class="j-v-top"><p class="j-v-tit">✨ Quem gostou de <b>' + esc(g.n) + "</b> também gosta de…</p>" +
      '<button type="button" class="j-v-x" data-j-vx aria-label="Fechar">✕</button></div>' +
      '<div class="j-v-lista">' + l.map(function (x) {
        var on = state.fav.has(x.id);
        return '<div class="j-v-it"><button type="button" class="j-v-capa" data-j-ver="' + esc(x.id) + '" aria-label="Ver a ficha de ' + esc(x.n) + '">' +
          '<span class="j-v-img">' + capaMini(x) + '</span><span class="j-v-nm">' + esc(curto(x.n)) + "</span></button>" +
          '<button type="button" class="fav j-v-fav" data-fav="' + esc(x.id) + '" aria-pressed="' + on + '" aria-label="Dar estrela: ' + esc(x.n) + '" title="Dar estrela">' + (on ? "★" : "☆") + "</button></div>";
      }).join("") + '</div><span class="j-v-barra" aria-hidden="true"></span>';
    // estrela dada aqui dentro não abre outro aviso
    tEl.addEventListener("click", function (e) {
      if (e.target.closest("[data-fav]")) { daVibeAte = Date.now() + 1500; return; }
      if (e.target.closest("[data-j-vx]")) { fecharVibe(); return; }
      var v = e.target.closest("[data-j-ver]");
      if (v) { fecharVibe(); verFicha(v.getAttribute("data-j-ver")); }
    }, true);
    tEl.addEventListener("pointerenter", pausa);
    tEl.addEventListener("pointerleave", retoma);
    tEl.addEventListener("focusin", pausa);
    tEl.addEventListener("focusout", function (e) { if (!tEl || !tEl.contains(e.relatedTarget)) retoma(); });
    lugarVibe();
    relogio(VIBE_SEG * 1000);
  }
  function verFicha(id) {
    if (ficha && ficha.open) {
      ficha.showModal = function () {};
      try { abrirFicha(id); } finally { delete ficha.showModal; }
      ficha.scrollTop = 0;
    } else abrirFicha(id);
  }

  // quem ganhou estrela: compara com antes a cada save() (as estrelas são poucas: barato)
  var favAntes = new Set(state.fav);
  function sincFav() { favAntes = new Set(state.fav); }
  var saveAntJ = save;
  save = function () {
    var r = saveAntJ.apply(this, arguments);
    try {
      var novos = [];
      state.fav.forEach(function (id) { if (!favAntes.has(id)) novos.push(id); });
      sincFav();
      var ua = navigator.userActivation;
      if (novos.length === 1 && Date.now() > daVibeAte && !(ua && !ua.isActive)) {
        var id = novos[0];
        setTimeout(function () { try { mostrarVibe(id); } catch (e) {} }, 60);
      }
    } catch (e) {}
    return r;
  };
  document.addEventListener("estante-catalogo", function () { sincFav(); });   // estrelas de jogos que chegaram com o catálogo
  // o índice dos parecidos (mod_W) leva ~0,25 s no celular na 1ª vez: monta com o aparelho parado, não na hora da estrela
  var ocioso = window.requestIdleCallback || function (f) { return setTimeout(f, 300); }, aqueceu = 0;
  function aquecer() {
    if (aqueceu === DATA.length) return;
    aqueceu = DATA.length;
    setTimeout(function () { ocioso(function () { try { if (window.W_parecidos && DATA.length) W_parecidos(DATA[0].id); } catch (e) {} }, {timeout: 8000}); }, 4000);
  }
  document.addEventListener("estante-catalogo", aquecer);
  document.addEventListener("close", function () { setTimeout(lugarVibe, 0); }, true);
  if (typeof abrirFicha === "function") {
    var abrirAntJ = abrirFicha;
    abrirFicha = function (id) {
      var r = abrirAntJ.apply(this, arguments);
      try { if (ficha && ficha.open && JOIA.has(id)) joiaNaFicha(id); } catch (e) {}
      try { lugarVibe(); } catch (e) {}
      return r;
    };
  }

  // =====================================================================
  // 🎡 ROLETA DA INDECISÃO
  // =====================================================================
  var COR = ["#c8324a", "#00798c", "#e0a030", "#30638e", "#6a4c93", "#2a9d8f", "#d9603b", "#3d405b", "#8a5a44", "#4f772d"];
  var TXT = ["#fff", "#fff", "#1b1b1b", "#fff", "#fff", "#fff", "#fff", "#fff", "#fff", "#fff"];
  var salvo = ler(KR, {});
  var rol = {ids: [], ult: null, som: false};
  if (salvo && typeof salvo === "object") {
    if (Array.isArray(salvo.ids)) rol.ids = salvo.ids.filter(function (x, i, a) { return typeof x === "string" && a.indexOf(x) === i; }).slice(0, N_ROLETA[1]);
    if (typeof salvo.ult === "string") rol.ult = salvo.ult;
    rol.som = salvo.som === true;
  }
  function guardaR() { gravar(KR, rol); }
  function jogosR() { return rol.ids.map(function (id) { return porIdJ[id]; }).filter(Boolean); }
  function sugestao() {
    var vis = {}, l = [];
    function pode(g) { return g && !vis[g.id] && g.s !== "veto" && !g.x && !plano(g, "j"); }
    function add(id) { var g = porIdJ[id]; if (pode(g)) { vis[g.id] = 1; l.push(g); } }
    state.fav.forEach(add); state.sel.forEach(add);
    var ord = function (a) { return a.map(function (g) { return [gosto(g).n, nota(g), g]; }).sort(function (x, y) { return (y[0] - x[0]) || (y[1] - x[1]); }).map(function (x) { return x[2]; }); };
    l = ord(l).slice(0, 8);
    if (l.length < 8) itensRow().forEach(function (g) { if (l.length < 8 && pode(g)) { vis[g.id] = 1; l.push(g); } });
    return l.map(function (g) { return g.id; });
  }

  var dlg = document.createElement("dialog");
  dlg.id = "j-dlg";
  dlg.setAttribute("aria-labelledby", "j-tit");
  dlg.innerHTML = '<div class="j-in">' +
    '<div class="j-topo"><h2 id="j-tit">🎡 Roleta da indecisão</h2>' +
    '<button type="button" class="j-som" data-j="som" aria-pressed="false"></button>' +
    '<button type="button" data-j="fechar" aria-label="Fechar">✕</button></div>' +
    '<p class="j-sub">Não sabe o que jogar? Ponha de ' + N_ROLETA[0] + " a " + N_ROLETA[1] + " jogos e deixe a sorte escolher.</p>" +
    '<div class="j-corpo"><div class="j-roda-col">' +
    '<div class="j-roda"><canvas id="j-cv" role="img" aria-label="Roleta"></canvas><span class="j-seta" aria-hidden="true"></span></div>' +
    '<button type="button" class="j-girar" data-j="girar" autofocus>🎡 Girar!</button>' +
    '<p class="j-aviso" id="j-aviso" aria-live="polite"></p></div>' +
    '<div class="j-lado"><div class="j-res" id="j-res" hidden aria-live="polite"></div>' +
    '<div class="j-lista-cab"><h3>Na roleta <span id="j-n"></span></h3><button type="button" class="limpar" data-j="sugerir">↺ Sugerir de novo</button></div>' +
    '<ul class="j-lista" id="j-lista"></ul>' +
    '<label class="j-busca-rot" for="j-busca">Pôr outro jogo</label>' +
    '<input id="j-busca" type="search" placeholder="Buscar pelo nome…" autocomplete="off" enterkeyhint="search">' +
    '<ul class="j-achados" id="j-achados"></ul></div></div></div>';
  document.body.appendChild(dlg);
  var cv = dlg.querySelector("#j-cv"), ctx = cv.getContext("2d"), elRes = dlg.querySelector("#j-res"), elLista = dlg.querySelector("#j-lista"),
    elN = dlg.querySelector("#j-n"), elAviso = dlg.querySelector("#j-aviso"), elBusca = dlg.querySelector("#j-busca"), elAchados = dlg.querySelector("#j-achados"),
    bGirar = dlg.querySelector(".j-girar"), bSom = dlg.querySelector(".j-som");

  var rot = 0, girando = false, ganhou = null, tam = 0;
  function medir() {
    var w = Math.round(cv.parentNode.getBoundingClientRect().width) || 300, dpr = Math.min(3, window.devicePixelRatio || 1);
    if (w === tam && cv.width === Math.round(w * dpr)) return;
    tam = w; cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function corte(t, max) {
    if (ctx.measureText(t).width <= max) return t;
    while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
    return t.replace(/\s+$/, "") + "…";
  }
  function desenha() {
    medir();
    var l = jogosR(), n = l.length, S = tam, c = S / 2, R = c - 6;
    ctx.clearRect(0, 0, S, S);
    var cs = getComputedStyle(dlg), ink = cs.getPropertyValue("--ink").trim() || "#111", sup = cs.getPropertyValue("--surface").trim() || "#fff";
    if (n < 2) {
      ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fillStyle = cs.getPropertyValue("--line").trim() || "#ddd"; ctx.fill();
      ctx.fillStyle = ink; ctx.font = "600 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Ponha jogos na roleta", c, c);
      return;
    }
    var seg = TAU / n, fs = Math.max(11, Math.min(15, Math.round(S / 26)));
    for (var i = 0; i < n; i++) {
      var a0 = rot + i * seg - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, R, a0, a0 + seg); ctx.closePath();
      ctx.fillStyle = COR[i % COR.length]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = sup; ctx.stroke();
      ctx.save();
      var meio = a0 + seg / 2, vira = Math.cos(meio) < -0.01;
      ctx.translate(c, c); ctx.rotate(vira ? meio + Math.PI : meio);
      ctx.fillStyle = TXT[i % TXT.length]; ctx.font = "700 " + fs + "px system-ui, sans-serif"; ctx.textAlign = vira ? "left" : "right"; ctx.textBaseline = "middle";
      ctx.fillText(corte(l[i].n, R - 46), vira ? -(R - 12) : R - 12, 0);
      ctx.restore();
    }
    if (ganhou != null && !girando && ganhou < n) {
      var b0 = rot + ganhou * seg - Math.PI / 2;
      ctx.beginPath(); ctx.arc(c, c, R - 2, b0, b0 + seg); ctx.lineWidth = 6; ctx.strokeStyle = ink; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, 26, 0, TAU); ctx.fillStyle = sup; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = ink; ctx.font = "20px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎮", c, c + 1);
  }
  function segAt(r, n) { return Math.floor((((-r) % TAU + TAU) % TAU) / (TAU / n)) % n; }
  function sorteio(n) {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
  }

  // som (desligado até você ligar): um tique a cada fatia e um "plim" no fim
  var audio = null, ultTique = 0;
  function somOk() {
    if (!rol.som) return null;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch (e) { audio = null; }
    return audio;
  }
  function bip(freq, dur, vol) {
    var a = somOk(); if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function tique() { var t = performance.now(); if (t - ultTique < 35) return; ultTique = t; bip(1500, 0.03, 0.06); }
  function pintaSom() { bSom.setAttribute("aria-pressed", String(rol.som)); bSom.textContent = rol.som ? "🔊 Som" : "🔇 Som"; bSom.setAttribute("aria-label", rol.som ? "Som ligado" : "Som desligado"); }

  function pintaLista() {
    var l = jogosR(), n = l.length, falta = rol.ids.length - n;
    elN.textContent = "(" + n + " de " + N_ROLETA[1] + ")";
    elLista.innerHTML = l.map(function (g, i) {
      return '<li' + (g.id === (ganhou != null && l[ganhou] ? l[ganhou].id : "") ? ' class="j-ganhou"' : "") + '><span class="j-cor" style="background:' + COR[i % COR.length] + '"></span>' +
        capaMini(g, "j-mini") + '<span class="j-nm">' + esc(g.n) + "<small>" + esc(genNome(g)) + (nota(g) ? " · ★ " + nota(g) : "") + "</small></span>" +
        '<button type="button" data-j-tira="' + esc(g.id) + '" aria-label="Tirar da roleta: ' + esc(g.n) + '">✕</button></li>';
    }).join("") + (falta > 0 ? '<li class="j-nada">+' + falta + " do catálogo, chegando…</li>" : "");
    cv.setAttribute("aria-label", n ? "Roleta com " + n + " jogos: " + l.map(function (g) { return g.n; }).join(", ") : "Roleta vazia");
    var pouco = n < N_ROLETA[0];
    bGirar.disabled = girando || pouco;
    if (!girando) elAviso.textContent = pouco ? "Ponha pelo menos " + N_ROLETA[0] + " jogos (falta" + (N_ROLETA[0] - n > 1 ? "m " : " ") + (N_ROLETA[0] - n) + ")." : "";
  }
  function pintaRes(g, velho) {
    if (!g) { elRes.hidden = true; return; }
    var e = EXTRA[g.id] || {}, d = [genNome(g)];
    if (e.nt) d.push("★ " + e.nt); if (e.hl) d.push("⏱ " + horas(e.hl));
    if (JOIA.has(g.id)) d.push("💎 Joia");
    var img = capaGrande(g);
    elRes.className = "j-res" + (velho ? " j-velho" : " j-pulo");
    elRes.innerHTML = '<div class="j-res-capa">' + (img ? '<img src="' + esc(img) + '" alt="Capa de ' + esc(g.n) + '" referrerpolicy="no-referrer">' : (GENRES[g.gn] ? GENRES[g.gn].svg : "")) + "</div>" +
      '<div><span class="j-res-rot">' + (velho ? "Da última vez saiu" : "🎉 Saiu!") + "</span><h3>" + esc(g.n) + "</h3><p>" + esc(d.join(" · ")) + "</p>" +
      '<div class="j-res-bts"><button type="button" class="j-b1" data-j="ficha" data-id="' + esc(g.id) + '">Abrir ficha</button>' +
      '<button type="button" data-j="girar">Girar de novo</button>' +
      (rol.ids.indexOf(g.id) >= 0 ? '<button type="button" data-j="tirar" data-id="' + esc(g.id) + '">Tirar este e girar</button>' : "") + "</div></div>";
    elRes.hidden = false;
  }
  function tudo() { desenha(); pintaLista(); }

  function girar() {
    if (girando) return;
    var l = jogosR(), n = l.length;
    if (n < N_ROLETA[0]) { pintaLista(); return; }
    var k = sorteio(n), seg = TAU / n, jit = ((sorteio(1000) / 1000) * 0.7 - 0.35) * seg;
    var alvo = (k + 0.5) * seg + jit, atual = (((-rot) % TAU) + TAU) % TAU;
    var delta = (((atual - alvo) % TAU) + TAU) % TAU, rapido = reduz();
    if (!rapido) delta += TAU * (5 + sorteio(3));
    var r0 = rot, dur = rapido ? 0 : 4300 + sorteio(1200), t0 = performance.now(), ult = segAt(r0, n);
    girando = true; ganhou = null;
    elRes.hidden = true; elAviso.textContent = "Girando…";
    dlg.querySelectorAll("[data-j=girar], [data-j=tirar], [data-j-tira], [data-j-add], [data-j=sugerir]").forEach(function (b) { b.disabled = true; });
    somOk();
    function passo(t) {
      var p = dur && dlg.open ? Math.min(1, (t - t0) / dur) : 1;
      rot = r0 + delta * (1 - Math.pow(1 - p, 4));
      var s = segAt(rot, n);
      if (s !== ult) { ult = s; if (p < 1) tique(); }
      desenha();
      if (p < 1) requestAnimationFrame(passo); else fim(k, l);
    }
    if (dur) requestAnimationFrame(passo); else passo(t0);
  }
  function fim(k, l) {
    rot = ((rot % TAU) + TAU) % TAU;
    girando = false; ganhou = k;
    var g = l[k];
    rol.ult = g.id; guardaR();
    dlg.querySelectorAll("button:disabled").forEach(function (b) { b.disabled = false; });
    tudo();
    elAviso.textContent = "Saiu: " + g.n;
    pintaRes(g, false);
    bip(880, 0.18, 0.12); setTimeout(function () { bip(1320, 0.3, 0.1); }, 120);
    if (elBusca.value.trim()) buscar();
    if (matchMedia("(max-width: 759px)").matches) elRes.scrollIntoView({block: "nearest", behavior: reduz() ? "auto" : "smooth"});
  }

  // busca pra pôr jogos
  var nomeN = {}, tBusca = 0;
  function nn(g) { return nomeN[g.id] || (nomeN[g.id] = norm(g.n)); }
  function buscar() {
    var q = norm(elBusca.value.trim());
    if (q.length < 2) { elAchados.innerHTML = ""; return; }
    var ini = [], meio = [];
    for (var i = 0; i < DATA.length; i++) {
      var g = DATA[i];
      if (g.s === "veto" || g.x) continue;
      var p = nn(g).indexOf(q);
      if (p === 0) ini.push(g); else if (p > 0) meio.push(g);
    }
    var ord = function (a) { return a.map(function (g) { return [gosto(g).n + nota(g) / 100, g]; }).sort(function (x, y) { return y[0] - x[0]; }).map(function (x) { return x[1]; }); };
    var l = ord(ini).concat(ord(meio)).slice(0, 8), cheio = rol.ids.length >= N_ROLETA[1];
    elAchados.innerHTML = l.length ? l.map(function (g) {
      var ja = rol.ids.indexOf(g.id) >= 0;
      return "<li>" + capaMini(g, "j-mini") + '<span class="j-nm">' + esc(g.n) + "<small>" + esc(genNome(g)) + (nota(g) ? " · ★ " + nota(g) : "") + "</small></span>" +
        (ja ? '<button type="button" disabled>Já está</button>' : '<button type="button" data-j-add="' + esc(g.id) + '"' + (cheio ? " disabled" : "") + ' aria-label="Pôr na roleta: ' + esc(g.n) + '">+ Pôr</button>') + "</li>";
    }).join("") + (cheio ? '<li class="j-nada">A roleta já tem ' + N_ROLETA[1] + " jogos: tire um pra pôr outro.</li>" : "") : '<li class="j-nada">Nenhum jogo com esse nome.</li>';
  }
  elBusca.addEventListener("input", function () { clearTimeout(tBusca); tBusca = setTimeout(buscar, 160); });
  elBusca.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); clearTimeout(tBusca); buscar(); } });

  function abrirRoleta() {
    if (!rol.ids.length) { rol.ids = sugestao(); guardaR(); }
    ganhou = null; pintaSom();
    if (!dlg.open) dlg.showModal();
    tudo();
    pintaRes(rol.ult && porIdJ[rol.ult] ? porIdJ[rol.ult] : null, true);
  }
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) { if (!girando) dlg.close(); return; }
    var t = e.target.closest("button");
    if (!t || t.disabled) return;
    var a = t.getAttribute("data-j"), id;
    if (a === "fechar") dlg.close();
    else if (a === "girar") girar();
    else if (a === "som") { rol.som = !rol.som; guardaR(); pintaSom(); if (rol.som) bip(1200, 0.05, 0.08); }
    else if (a === "sugerir") { rol.ids = sugestao(); ganhou = null; guardaR(); elRes.hidden = true; tudo(); }
    else if (a === "ficha") abrirFicha(t.getAttribute("data-id"));
    else if (a === "tirar") {
      id = t.getAttribute("data-id");
      rol.ids = rol.ids.filter(function (x) { return x !== id; }); ganhou = null; guardaR(); tudo();
      if (jogosR().length >= N_ROLETA[0]) girar();
      else { elRes.hidden = true; elAviso.textContent = "Tirei. Ficaram " + jogosR().length + ": ponha mais um pra girar."; }
    } else if ((id = t.getAttribute("data-j-tira"))) {
      rol.ids = rol.ids.filter(function (x) { return x !== id; }); ganhou = null; guardaR(); tudo();
      if (elBusca.value.trim()) buscar();
    } else if ((id = t.getAttribute("data-j-add"))) {
      if (rol.ids.length >= N_ROLETA[1] || rol.ids.indexOf(id) >= 0) return;
      rol.ids.push(id); ganhou = null; guardaR(); tudo(); buscar();
    }
  });
  dlg.addEventListener("cancel", function (e) { if (girando) e.preventDefault(); });
  window.addEventListener("resize", function () { if (dlg.open) desenha(); });

  // botão no topo, junto do "Novidades"
  (function () {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn j-abrir"; b.id = "j-abrir"; b.textContent = "🎡 Roleta";
    b.setAttribute("aria-haspopup", "dialog"); b.title = "Roleta da indecisão: a sorte escolhe o que jogar";
    b.addEventListener("click", abrirRoleta);
    var lugar = document.querySelector(".n-lugar");
    if (lugar) { lugar.appendChild(b); return; }
    lugar = document.createElement("div"); lugar.className = "n-lugar"; lugar.style.margin = "6px 0"; b.style.marginLeft = "0";
    lugar.appendChild(b);
    var caixa = document.getElementById("p-pac");
    if (caixa && caixa.parentNode) caixa.parentNode.insertBefore(lugar, caixa.nextSibling);
  })();

  // ---------- o catálogo chega em segundo plano ----------
  (window.CAT_AO_CRESCER || []).push(function (novos) {
    novos.forEach(function (g) { porIdJ[g.id] = g; if (porNome && !porNome.has(g.n)) porNome.set(g.n, g); });
    porGen = null;
    if (olharJoias(novos)) { contaFiltro(); chaveRow = ""; }
    if (dlg.open && !girando) tudo();
  });

  // pra testes e pra outros módulos
  window.J_joias = function () { return JOIA_L.map(function (g) { return g.id; }); };
  window.J_ehJoia = function (id) { return JOIA.has(id); };
  window.J_parecidos = function (id) { var g = porIdJ[id]; return g ? parecidosDe(g).map(function (x) { return x.id; }) : []; };
  window.J_vibe = mostrarVibe;
  window.J_roleta = abrirRoleta;
})();

