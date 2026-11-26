/* mod_W_porque.js */
// 1) "Pra você" na ficha: 🟢 Acho que você vai gostar / 🟡 Talvez / 🔴 Acho que não, com os motivos dos dois lados.
//    Pensado pro seu gosto: romance em primeiro lugar, RPG (ainda mais retrô, masmorra, livro-jogo), e o que você
//    marcou neste aparelho (estrelas, marcados, planos, suas traduções) pra achar parecidos: série, editora, gênero, pistas.
// 2) Ordem "🎯 Mais a sua cara" e window.notaGosto(g) -> {n: 0-100, cor: "verde"|"amarelo"|"vermelho"} pra outros módulos.
// 3) "Parecidos com este" no fim da ficha (troca o antigo do mod_B): mesma série > mesmas pistas/gênero/romance > mesma editora.
// Usa o campo si de cada jogo (pistas tiradas da descrição: px=pixel, mz=masmorra, tb=turnos...; ver sinais.py) e a
// lista window.SI_ED (editoras). Sem o si, vale só o que já existe: gênero, romance, nota da lista, nota, tamanho.
// Leve: a nota de cada jogo fica guardada e só é refeita quando você muda alguma marcação (save); o índice dos
// parecidos é montado uma vez, na primeira ficha aberta.
(function () {
  "use strict";
  var SELO_CAPA = true;       // selinho 🟢/🔴 na capa dos jogos (false = desliga)
  var SELO_AMARELO = true;    // 🟡 na capa também (26/11: o dono pediu bolinha em todos)
  var MAX = 4;                // itens em cada lista do "Pra você"
  var N_PAR = 8;              // capas em "Parecidos com este"

  // ---------- estilo ----------
  var css = document.createElement("style");
  css.textContent = [
    ".w-pv { --w-cor: var(--sua); --w-bg: var(--sua-bg); border: 1px solid var(--line); border-left: 5px solid var(--w-cor); border-radius: 14px; background: var(--surface); overflow: hidden; }",
    ".w-pv.w-sim { --w-cor: var(--pt); --w-bg: var(--pt-bg); }",
    ".w-pv.w-nao { --w-cor: var(--veto); --w-bg: var(--veto-bg); }",
    ".w-cab { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--w-bg); }",
    ".w-cab .w-ico { font-size: 26px; line-height: 1; flex: none; }",
    ".w-cab .w-rot { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }",
    ".w-cab .w-ver { display: block; font-family: var(--font-display); font-size: 19px; font-weight: 700; line-height: 1.2; color: var(--w-cor); }",
    ".w-ja { margin: 0; padding: 8px 14px 0; font-size: 13px; color: var(--muted); }",
    ".w-cols { display: grid; gap: 12px; padding: 12px 14px 14px; }",
    "@media (min-width: 700px) { .w-cols { grid-template-columns: 1fr 1fr; gap: 18px; } }",
    ".w-col h3 { margin: 0 0 6px; font-family: var(--font-body); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }",
    ".w-col ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }",
    ".w-col li { position: relative; padding-left: 26px; font-size: 15px; line-height: 1.4; color: var(--ink); }",
    ".w-col li::before { content: '+'; position: absolute; left: 0; top: 1px; width: 19px; height: 19px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; font-weight: 700; line-height: 1; background: var(--pt-bg); color: var(--pt); }",
    ".w-b li::before { content: '−'; background: var(--veto-bg); color: var(--veto); }",
    ".w-col li.w-nada { color: var(--muted); }",
    ".w-col li.w-nada::before { content: '·'; background: transparent; color: var(--muted); }",
    ".selo.w-selo { padding: 0 3px; font-size: 10px; line-height: 1.6; }",
    "html[data-cols=\"4\"] .selo.w-selo { font-size: 8px; padding: 0 2px; }",
    ".w-par .par-b .w-pq { font-size: 12px; line-height: 1.25; color: var(--muted); }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- versão do perfil: muda a cada save() (estrela, marcação, plano, tradução) ----------
  var ver = 1;
  var saveAntW = save;
  save = function () { ver++; return saveAntW.apply(this, arguments); };

  var porIdC = null, porIdN = -1;
  function porId() {
    if (porIdN !== DATA.length) { porIdC = {}; DATA.forEach(function (g) { porIdC[g.id] = g; }); porIdN = DATA.length; }
    return porIdC;
  }

  // ---------- pistas do jogo (guardadas por id: não mudam) ----------
  var SEM_SI = {px: /pixel|retr[oô]|8[- ]?bits?\b|16[- ]?bits?\b|old[- ]?school/i, mz: /dungeon|masmorra|labirint|labyrinth/i, tb: /turn[- ]based|por turnos/i,
    lj: /livro[- ]jogo|gamebook|fic[cç][aã]o interativa/i, rl: /roguel/i, nm: /romance|namor/i, cs: /casar|casamento|marry/i, hr: /terror|horror/i,
    es: /futebol|soccer|football|basquete|t[eê]nis\b|golfe?\b/i, co: /corrida|racing|\bkart\b/i, mp: /s[oó] multijogador|multiplayer online/i};
  var codC = {};
  function cods(g) {
    var c = codC[g.id];
    if (c) return c;
    var k = {}, ed = -1;
    if (typeof g.si === "string") {
      var s = g.si, f = s.indexOf(".");
      if (f < 0) f = s.length; else ed = parseInt(s.slice(f + 1), 36);
      for (var i = 0; i + 1 < f; i += 2) k[s.substr(i, 2)] = 1;
    } else {
      var txt = g.n + " " + (g.t || "") + " " + ((FICHA[g.id] && FICHA[g.id].d) || "");
      for (var x in SEM_SI) if (SEM_SI[x].test(txt)) k[x] = 1;
      if (g.gn === "vn") k.vn = 1;
    }
    c = codC[g.id] = {k: k, ed: ed};
    return c;
  }
  function editora(ed) { var l = window.SI_ED; return l && ed >= 0 && l[ed] ? l[ed] : ""; }

  // quanto cada pista aparece no aparelho todo (pra saber o que é "seu" e o que é comum); 1 vez por DATA
  var baseC = null;
  function base() {
    if (baseC && baseC.n === DATA.length) return baseC;
    var cnt = {}, n = 0;
    DATA.forEach(function (g) { n++; var k = cods(g).k; for (var y in k) cnt[y] = (cnt[y] || 0) + 1; });
    baseC = {n: n, cnt: cnt};
    return baseC;
  }
  function taxa(c) { var b = base(); return ((b.cnt[c] || 0) + 1) / (b.n + 1); }

  // nome da série (o mesmo jeito do 💡 Para você, sem montar regex por jogo); guardado por nome
  var VAZIAS = new Set("the of a an and to in on".split(" ")), ROMANOS = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|0|\d+)$/;
  var COMUNS = new Set("the of a an and to in on edition deluxe definitive remastered remaster remake hd collection complete ultimate special legacy classic director cut game games switch nintendo world legend story tales quest adventure adventures saga chronicles new super".split(" "));
  var chC = {};
  function chaves(n) {
    var c = chC[n];
    if (c) return c;
    var low = n.toLowerCase();
    if (/[^\x00-\x7f]/.test(low)) low = low.normalize("NFD").replace(/[̀-ͯ]/g, "");
    var all = low.match(/[a-z0-9]+/g) || [], ws = [], i;
    for (i = 0; i < all.length; i++) if (!VAZIAS.has(all[i])) ws.push(all[i]);
    var k2 = [], num = false;
    for (i = 0; i < ws.length && k2.length < 2; i++) { if (ROMANOS.test(ws[i])) { num = true; break; } k2.push(ws[i]); }
    var so1 = false;
    if (ws.length && ws[0].length >= 5) {
      if (num && k2.length === 1) so1 = true;
      else { var p = low.indexOf(ws[0]); var resto = p >= 0 ? low.slice(p + ws[0].length).replace(/^\s+/, "") : ""; so1 = /^[:\-–]/.test(resto); }
    }
    c = chC[n] = {k2: k2.length === 2 ? k2.join(" ") : null, k1: so1 ? ws[0] : null,
      ws: ws.filter(function (w) { return w.length >= 4 && !COMUNS.has(w) && !ROMANOS.test(w); })};
    return c;
  }
  function serieKeys(ch) { var r = []; if (ch.k2) { r.push("2:" + ch.k2); r.push("1:" + ch.k2.split(" ")[0]); } if (ch.k1) r.push("1:" + ch.k1); return r; }
  function nota(g) { return (EXTRA[g.id] && EXTRA[g.id].nt) || 0; }
  function hl(g) { return (EXTRA[g.id] && EXTRA[g.id].hl) || 0; }

  // ---------- seu perfil: o que você marcou neste aparelho ----------
  var perfilC = null, cache = {}, cacheN = {};
  // jogos que podem ter plano ou tradução sua: os com q/j/mt de fábrica (1 vez por DATA) + os que você mexeu
  var candC = null, candN = -1;
  function candidatos() {
    if (candN !== DATA.length) { candC = DATA.filter(function (g) { return g.mt || g.q || g.j; }); candN = DATA.length; }
    var P = porId(), vis = {}, l = [];
    function pp(g) { if (g && !vis[g.id]) { vis[g.id] = 1; l.push(g); } }
    candC.forEach(pp);
    Object.keys(state.pl || {}).forEach(function (id) { pp(P[id]); });
    Object.keys(state.mt || {}).forEach(function (id) { pp(P[id]); });
    return l;
  }
  function perfil() {
    var key = ver + "|" + DATA.length;
    if (perfilC && perfilC.key === key) return perfilC;
    var P = porId(), por = {}, ordem = [];
    function add(id, txt) { if (!por[id] && P[id]) { por[id] = txt; ordem.push(id); } }
    state.fav.forEach(function (id) { add(id, "deu estrela"); });
    var planos = [];
    candidatos().forEach(function (g) {
      var m = minhaTr(g);
      if (m) add(g.id, m === "pc" ? "está traduzindo" : "traduziu");
      if (plano(g, "w")) planos.push([g.id, "quer jogar"]);
      else if (plano(g, "q")) planos.push([g.id, "quer traduzir"]);
      else if (plano(g, "j")) planos.push([g.id, "já jogou"]);
    });
    state.sel.forEach(function (id) { add(id, "marcou"); });
    planos.forEach(function (x) { add(x[0], x[1]); });
    var gl = [], gen = {}, cod = {}, curto = 0, longo = 0, comH = 0, serie = {}, eds = {};
    ordem.forEach(function (id) {
      var g = P[id], c = cods(g), ch = chaves(g.n), it = {g: g, por: por[id], c: c, ch: ch};
      gl.push(it);
      gen[g.gn] = (gen[g.gn] || 0) + 1;
      for (var x in c.k) cod[x] = (cod[x] || 0) + 1;
      // "1:dragon" sozinho (primeira palavra de um nome de 2) só vale como série se o jogo também tiver número/dois-pontos
      ch.k2 && (serie["2:" + ch.k2] = serie["2:" + ch.k2] || []).push(it);
      ch.k1 && (serie["1:" + ch.k1] = serie["1:" + ch.k1] || []).push(it);
      if (c.ed >= 0) (eds[c.ed + "|" + g.gn] = eds[c.ed + "|" + g.gn] || []).push(it);
      var h = hl(g);
      if (h) { comH++; if (h <= 4) curto++; if (h >= 80) longo++; }
    });
    var n = gl.length || 1, gmax = 0, gtop = "";
    for (var k in gen) if (gen[k] > gmax) { gmax = gen[k]; gtop = k; }
    var lf = {}, gostaSet = {}, negW = {};
    for (var y in cod) lf[y] = (cod[y] / n) / taxa(y);
    NOMES.forEach(function (x) { if ((cod[x] || 0) >= 3 && lf[x] >= 1.4) gostaSet[x] = 1; });
    NEGK.forEach(function (x) { var l = lf[x] || 0; if (l < 0.5) negW[x] = NEG[x][1] * (l < 0.2 ? 1 : 0.6); });
    perfilC = {key: key, gl: gl, n: n, gen: gen, gtop: gtop, cod: cod, lf: lf, serie: serie, eds: eds, gostaSet: gostaSet, negW: negW,
      curto: comH >= 10 ? curto / comH : 0.5, longo: comH >= 10 ? longo / comH : 0.5};
    cache = {}; cacheN = {};
    return perfilC;
  }
  function lift(p, c) { return p.lf[c] || 0; }
  function outro(l, g) { if (l) for (var i = 0; i < l.length; i++) if (l[i].g.id !== g.id) return l[i]; return null; }
  function mesmaSerie(g, p) {
    var ch = chaves(g.n);
    return outro(ch.k2 && p.serie["2:" + ch.k2], g) || outro(ch.k1 && p.serie["1:" + ch.k1], g) || null;
  }

  // o jogo marcado mais parecido com este (só pro texto da ficha; não muda a nota)
  var DIST = ["px", "mz", "rl", "tb", "lj", "ta", "cb", "jr", "gr", "mo", "hr", "cy", "de", "fz", "vn", "cs", "nm", "hi", "sv", "ow"];
  function parecido(g, c, p) {
    var ch = chaves(g.n), melhor = null, ms = 0;
    for (var i = 0; i < p.gl.length; i++) {
      var it = p.gl[i];
      if (it.g.id === g.id) continue;
      var s = c.ed >= 0 && c.ed === it.c.ed ? 2 : 0;
      if (g.gn === it.g.gn) s += 1.5;
      for (var j = 0; j < DIST.length; j++) if (c.k[DIST[j]] && it.c.k[DIST[j]]) s += 1;
      for (var w = 0, pw = 0; w < ch.ws.length && pw < 2; w++) if (it.ch.ws.indexOf(ch.ws[w]) >= 0) { s += 1; pw++; }
      if (it.por === "deu estrela" || it.por === "traduziu") s += 0.3;
      if (s > ms) { ms = s; melhor = it; }
    }
    return ms >= 4.5 ? melhor : null;
  }

  // ---------- textos ----------
  function lista(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1]; }
  function quem(it) { return it.g.n + ", que você " + it.por; }
  function gb(x) { return typeof fmt === "function" ? fmt(x) : String(x).replace(".", ","); }
  function hTxt(h) { return typeof horas === "function" ? horas(h) : Math.round(h) + " h"; }
  var NOME = {hi: "história forte", gr: "grupo de heróis", ta: "combate tático", cb: "cartas", jr: "cara de JRPG clássico", mo: "monstros pra pegar",
    de: "mistério pra resolver", cy: "ficção científica", fz: "fazenda", vn: "muito texto e história", hr: "terror", tb: "combate por turnos",
    px: "visual em pixel", mz: "masmorra", lj: "livro-jogo", rl: "roguelike", sv: "sobrevivência", ow: "mundo aberto"};
  var NOMES = Object.keys(NOME);
  // tipos que pesam contra se você quase não marca: [texto, peso, diz "tipo que você não marca"]
  var NEG = {es: ["É jogo de esporte", 2.5, 1], co: ["É jogo de corrida", 2, 1], fe: ["É jogo de festa e minigames", 1.8, 1],
    mp: ["É basicamente multijogador: a graça é jogar com outras pessoas", 2, 0], lu: ["É jogo de luta", 1.2, 1], ti: ["É jogo de tiro", 0.8, 1],
    ca: ["É jogo casual (cartas, mahjong, achar objetos…)", 1.5, 1], ed: ["Nem é bem um jogo: é app ou educativo", 3, 0],
    ki: ["É feito pra criança", 1.2, 0], ac: ["Pede muito reflexo e ação rápida", 0.8, 0], hr: ["É de terror", 0.6, 0],
    pz: ["É mais quebra-cabeça do que história", 0.6, 0]};
  var NEGK = Object.keys(NEG);
  var TEXTO = {rpg: 1, vn: 1, historia: 1, investigacao: 1, tatica: 1};
  var VETO_TXT = /^(Romance só|A protagonista|Só funciona|Está entre)/;

  // avalia um jogo. Sem "texto", só faz a conta (rápido: é o que a ordem e o notaGosto usam);
  // com "texto", monta também as frases da ficha. A conta é a mesma nos dois.
  function avaliar(g, texto) {
    var p = perfil();
    if (!texto) return pontos(g);
    if (cache[g.id]) return cache[g.id];
    var c = cods(g), k = c.k, pros = texto ? [] : null, contras = texto ? [] : null, s = 0, forca = null;
    function pro(t, w) { if (pros) pros.push([t, w]); s += w; }
    function contra(t, w) { if (contras) contras.push([t, w]); s -= w; }
    var nt = nota(g), h = hl(g), ik = idiomaKey(g), falou = {}, x, i;

    // vetos
    if (g.x === "ms") { contra("Romance só do mesmo sexo — fora do que você quer", 10); forca = "nao"; }
    else if (g.x === "ot") { contra("A protagonista é mulher e namora homens (estilo otome)", 10); forca = "nao"; }
    else if (g.s === "veto") { contra(g.o === "so" ? "Só funciona com internet" : "Está entre os seus vetados", 10); forca = "nao"; }
    if (g.o === "so" && g.s !== "veto") contra("Só funciona com internet", 2);
    if (g.s === "espera") contra("Ainda não saiu no Switch", 0.5);

    // romance: o que você mais quer
    if (!forca) {
      if (g.rom === "sim") pro(k.cs ? "Tem romance de verdade: é o centro da história, e dá pra casar" : "Tem romance de verdade: é o centro da história", 3);
      else if (g.rom === "opc") pro(k.cs ? "Dá pra namorar e até casar (o romance é opcional)" : "Dá pra namorar: tem romance opcional", 2.6);
      else if (g.rom === "leve") pro("Tem um romance de fundo, leve", 0.6);
      else if (g.rom !== "nao" && (k.nm || k.cs)) pro("A descrição fala em " + (k.cs ? "casamento" : "romance") + " (ainda não conferido)", 0.8);
      else if (g.rom === "nao") contra("Não tem romance — o que você mais procura", 1);
    }
    falou.nm = falou.cs = 1;

    // série, editora e gênero
    var ser = mesmaSerie(g, p);
    if (ser) pro("Da mesma série de " + quem(ser), 2.2);
    var edIt = !ser && c.ed >= 0 ? outro(p.eds[c.ed + "|" + g.gn], g) : null;
    var par = texto && !ser ? parecido(g, c, p) : null;
    var comoPar = par ? ", como " + quem(par) : "";
    var gnTxt = GENRES[g.gn] ? GENRES[g.gn].label : g.gn, share = (p.gen[g.gn] || 0) / p.n;
    if (g.gn === "rpg") {
      var retro = [];
      if (k.px) retro.push("em pixel"); if (k.mz) retro.push("com masmorra"); if (k.lj) retro.push("estilo livro-jogo");
      if (k.rl) retro.push("roguelike"); if (k.tb) retro.push("por turnos");
      if (k.px || k.mz || k.lj) pro(texto ? "RPG " + lista(retro) + comoPar : "", 2.6);
      else pro(texto ? (p.gtop === "rpg" ? "É RPG, o gênero que você mais marca" : "É RPG, que você adora") + (k.tb ? " — e por turnos" : "") + comoPar : "", 2);
      comoPar = "";
      falou.px = falou.mz = falou.lj = falou.rl = falou.tb = 1;
    } else if (g.gn === "tatica" && share >= 0.03) {
      pro(texto ? "Tática" + (k.tb ? " por turnos" : "") + comoPar : "", 1 + Math.min(1, share * 6)); comoPar = ""; falou.tb = falou.ta = 1;
    } else if (share >= 0.08) {
      pro(texto ? "É de " + gnTxt + ": " + Math.round(share * 100) + "% do que você marcou é desse tipo" + comoPar : "", Math.min(1.5, share * 4)); comoPar = "";
    }
    if (edIt) {
      var ed = editora(c.ed);
      pro(texto ? (ed ? "Da " + ed + ", a mesma editora de " + quem(edIt) : "Da mesma editora de " + quem(edIt)) : "", 0.8);
    }
    if (comoPar && pros) pros.push(["Parecido com " + quem(par), 0.7]);   // só texto: não mexe na conta

    // pistas que aparecem muito no que você marca
    var gosta = [];
    for (i = 0; i < NOMES.length; i++) { x = NOMES[i]; if (k[x] && !falou[x] && p.gostaSet[x]) gosta.push(x); }
    if (gosta.length) {
      gosta.sort(function (a, b) { return lift(p, b) - lift(p, a); }); gosta = gosta.slice(0, 2);
      pro(texto ? "Tem " + lista(gosta.map(function (y) { return NOME[y]; })) + ", que aparece" + (gosta.length > 1 ? "m" : "") + " muito no que você marca" : "", 0.5 * gosta.length);
    }

    // nota dos jogadores
    if (nt >= 85) pro("Os jogadores adoram: nota " + nt + "/100", 1.2);
    else if (nt >= 75) pro("Bem avaliado: nota " + nt + "/100", 0.6);
    else if (nt && nt < 60) contra("Nota baixa dos jogadores: " + nt + "/100", nt < 50 ? 3 : 2.2);
    else if (nt && nt < 68) contra("Nota só mediana: " + nt + "/100", 0.4);
    else if (!nt && g.l === 5) contra("Ainda sem nota dos jogadores", 0.25);

    // idioma (você traduz: só inglês não é defeito grave)
    if (plano(g, "q")) pro("Está no seu Quero traduzir", 1);
    if (ik === "dub") pro("Dublado em PT-BR: é só jogar", 0.6);
    else if (ik === "leg") pro("Tem PT-BR oficial: é só jogar", 0.5);
    else if (ik === "fa") pro("Já tem tradução de fã pronta", 0.4);
    else if (ik === "minha") pro("A sua tradução já está pronta", 0.6);
    else if (g.s !== "espera" && !forca) {
      var peq = (g.g != null && g.g <= 2) || (h && h <= 15) || k.cu, lon = (h >= 40) || k.lg;
      if (k.st) pro("Quase não tem texto: nem precisa traduzir", 0.4);
      else if (peq && !lon) pro("Só em inglês — mas é pequeno, dá pra você traduzir", 0.3);
      else if (lon && TEXTO[g.gn]) contra("Só em inglês e longo: muito texto pra traduzir", 0.6);
      else contra("Só em inglês: fica pra você traduzir", 0.2);
    }

    // tipos que você não marca
    var negou = false;
    for (i = 0; i < NEGK.length; i++) {
      x = NEGK[i];
      if (!k[x] || !p.negW[x]) continue;
      var nd = NEG[x];
      contra(texto ? nd[0] + (nd[2] ? ((p.cod[x] || 0) ? " — tipo que você quase não marca" : " — tipo que você nunca marca") : "") : "", p.negW[x]);
      negou = true;
    }
    if (!negou && !forca && p.n >= 15 && g.gn !== "rpg") {
      if (!p.gen[g.gn]) contra("Você nunca marcou nada de " + gnTxt, 1.2);
      else if (share < 0.03) contra("Você quase não marca jogos de " + gnTxt, 0.6);
    }

    // tamanho e duração
    if (g.g != null && g.g > 30) contra("Enorme: " + gb(g.g) + " GB no cartão", 0.8);
    else if (g.g != null && g.g > 15) contra("Grande: " + gb(g.g) + " GB no cartão", 0.3);
    if (h >= 80 && p.longo < 0.08) contra("Muito longo: ~" + hTxt(h) + " só a história", 0.4);
    else if (h && h <= 4 && p.curto < 0.08) contra("Bem curtinho: ~" + hTxt(h) + " de jogo", 0.3);

    // você já mostrou interesse
    if (state.fav.has(g.id)) s += 1.5; else if (state.sel.has(g.id) || plano(g, "w")) s += 1;

    var pt = pontos(g);   // a conta oficial (rápida); s2 = a mesma conta refeita aqui, pros testes conferirem
    var r = {nivel: pt.nivel, s: pt.s, s2: Math.round(s * 10) / 10};
    if (texto) {
      var ord = function (a, b) { return b[1] - a[1]; };
      r.ja = state.fav.has(g.id) ? "★ Você já deu estrela neste jogo." : state.sel.has(g.id) ? "✓ Você marcou este jogo pra instalar." :
        plano(g, "j") ? "Você já jogou este." : plano(g, "w") ? "Está no seu Quero jogar." : "";
      r.pros = forca ? [] : pros.sort(ord).slice(0, MAX).map(function (y) { return y[0]; });
      r.contras = contras.sort(ord).slice(0, MAX).map(function (y) { return y[0]; });
      cache[g.id] = r;
    }
    return r;
  }

  // ---------- a conta rápida (é a que vale): parte fixa do jogo guardada + tabelas do seu perfil ----------
  var stC = {}, FALA_RPG = {px: 1, mz: 1, lj: 1, rl: 1, tb: 1}, FALA_TAT = {tb: 1, ta: 1};
  function fixo(g) {
    var st = stC[g.id];
    if (st) return st;
    var c = cods(g), k = c.k, b = 0, veto = g.x === "ms" || g.x === "ot" || g.s === "veto", nt = nota(g), h = hl(g), semPT = 0;
    if (veto) b -= 10;
    if (g.o === "so" && g.s !== "veto") b -= 2;
    if (g.s === "espera") b -= 0.5;
    if (!veto) b += g.rom === "sim" ? 3 : g.rom === "opc" ? 2.6 : g.rom === "leve" ? 0.6 : g.rom !== "nao" && (k.nm || k.cs) ? 0.8 : g.rom === "nao" ? -1 : 0;
    b += nt >= 85 ? 1.2 : nt >= 75 ? 0.6 : nt && nt < 60 ? (nt < 50 ? -3 : -2.2) : nt && nt < 68 ? -0.4 : !nt && g.l === 5 ? -0.25 : 0;
    if (g.g != null) b -= g.g > 30 ? 0.8 : g.g > 15 ? 0.3 : 0;
    if (!veto && g.s !== "espera") {
      var peq = (g.g != null && g.g <= 2) || (h && h <= 15) || k.cu, lon = (h >= 40) || k.lg;
      semPT = k.st ? 0.4 : peq && !lon ? 0.3 : lon && TEXTO[g.gn] ? -0.6 : -0.2;
    }
    st = stC[g.id] = {veto: veto, b: b, h: h, semPT: semPT, retro: g.gn === "rpg" && !!(k.px || k.mz || k.lj), ks: Object.keys(k), ed: c.ed};
    return st;
  }
  var IDI = {dub: 0.6, leg: 0.5, fa: 0.4, minha: 0.6};
  function pontos(g) {
    var p = perfil(), st = fixo(g), s = st.b, i, x;
    if (mesmaSerie(g, p)) s += 2.2;
    else if (st.ed >= 0 && outro(p.eds[st.ed + "|" + g.gn], g)) s += 0.8;
    var share = (p.gen[g.gn] || 0) / p.n, falou = null;
    if (g.gn === "rpg") { s += st.retro ? 2.6 : 2; falou = FALA_RPG; }
    else if (g.gn === "tatica" && share >= 0.03) { s += 1 + Math.min(1, share * 6); falou = FALA_TAT; }
    else if (share >= 0.08) s += Math.min(1.5, share * 4);
    var ng = 0, negou = false;
    for (i = 0; i < st.ks.length; i++) {
      x = st.ks[i];
      if (p.gostaSet[x] && !(falou && falou[x])) ng++;
      if (p.negW[x]) { s -= p.negW[x]; negou = true; }
    }
    s += 0.5 * Math.min(2, ng);
    if (plano(g, "q")) s += 1;
    var ik = idiomaKey(g);
    s += ik ? IDI[ik] || 0 : st.semPT;
    if (!negou && !st.veto && p.n >= 15 && g.gn !== "rpg") s -= !p.gen[g.gn] ? 1.2 : share < 0.03 ? 0.6 : 0;
    if (st.h >= 80 && p.longo < 0.08) s -= 0.4; else if (st.h && st.h <= 4 && p.curto < 0.08) s -= 0.3;
    if (state.fav.has(g.id)) s += 1.5; else if (state.sel.has(g.id) || plano(g, "w")) s += 1;
    return {nivel: st.veto ? "nao" : s >= 3 ? "sim" : s <= 0 ? "nao" : "talvez", s: Math.round(s * 10) / 10};
  }

  // ---------- nota de 0 a 100 (pra ordem e pra outros módulos) ----------
  var COR = {sim: "verde", talvez: "amarelo", nao: "vermelho"};
  function notaGosto(g) {
    if (!g) return {n: 0, cor: "vermelho"};
    perfil();   // limpa as guardadas se você mudou alguma marcação
    var r = cacheN[g.id];
    if (r) return r;
    var a = pontos(g), n = Math.round(50 + a.s * 8);
    n = a.nivel === "nao" && (g.x || g.s === "veto") ? 0 : Math.max(a.nivel === "sim" ? 74 : a.nivel === "talvez" ? 51 : 0, Math.min(a.nivel === "nao" ? 50 : a.nivel === "talvez" ? 73 : 100, n));
    r = cacheN[g.id] = {n: n, cor: COR[a.nivel]};
    return r;
  }
  window.notaGosto = notaGosto;

  // ---------- bloco "Pra você" na ficha ----------
  var VER = {sim: ["🟢", "Acho que você vai gostar"], talvez: ["🟡", "Talvez"], nao: ["🔴", "Acho que não"]};
  function blocoHTML(g) {
    var r = avaliar(g, true), v = VER[r.nivel];
    var li = function (l, vazio) { return l.length ? l.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") : '<li class="w-nada">' + vazio + "</li>"; };
    return '<div class="w-cab"><span class="w-ico" aria-hidden="true">' + v[0] + '</span><div><span class="w-rot">Pra você</span><span class="w-ver">' + v[1] + "</span></div></div>" +
      (r.ja ? '<p class="w-ja">' + esc(r.ja) + "</p>" : "") +
      '<div class="w-cols"><div class="w-col w-a"><h3>Por que você gostaria</h3><ul>' + li(r.pros, r.contras.length && VETO_TXT.test(r.contras[0]) ? "Não importa: está vetado" : "Nada em especial que puxe pro seu gosto") + "</ul></div>" +
      '<div class="w-col w-b"><h3>Por que talvez não gostaria</h3><ul>' + li(r.contras, "Nada contra que eu tenha achado") + "</ul></div></div>";
  }
  var atualId = null, atualVer = 0;
  function pintar(id) {
    var g = porId()[id], topo = ficha && ficha.querySelector(".ficha-topo");
    if (!g || !topo) return;
    var sec = ficha.querySelector(".w-pv");
    if (!sec) {
      sec = document.createElement("section");
      sec.setAttribute("aria-label", "Pra você");
      topo.insertAdjacentElement("afterend", sec);
    }
    sec.className = "w-pv w-" + avaliar(g, true).nivel;
    sec.innerHTML = blocoHTML(g);
    atualId = id; atualVer = ver;
  }

  // ---------- "Parecidos com este": índice montado uma vez ----------
  var idx = null;
  function indice() {
    if (idx && idx.n === DATA.length) return idx;
    var serie = {}, cod = {}, eds = {}, gen = {};
    DATA.forEach(function (g) {
      if (g.s === "veto") return;
      var ks = serieKeys(chaves(g.n));
      for (var i = 0; i < ks.length; i++) (serie[ks[i]] = serie[ks[i]] || []).push(g);
      var c = cods(g);
      for (var x in c.k) (cod[x] = cod[x] || []).push(g);
      if (c.ed >= 0) (eds[c.ed] = eds[c.ed] || []).push(g);
      (gen[g.gn] = gen[g.gn] || []).push(g);
    });
    var N = DATA.length, idf = {};
    for (var y in cod) idf[y] = Math.log(N / cod[y].length);
    idx = {n: N, serie: serie, cod: cod, eds: eds, gen: gen, idf: idf};
    return idx;
  }
  // pistas que dizem pouco sobre "que tipo de jogo é" (não contam pra parecido)
  // peso de cada pista pra "parecido" (0 = não conta); as que definem o tipo de jogo valem mais
  var FRACAS = {cu: 0, lg: 0, st: 0, ki: 0.4, ac: 0.6, ti: 0.6, pz: 0.6, ca: 0.6, sv: 0.7, es: 1.6, co: 1.6, lu: 1.5, mo: 1.3, lj: 1.3, vn: 1.2};
  function parecidos(g0) {
    var I = indice(), c0 = cods(g0), ch0 = chaves(g0.n), pts = {}, por = {}, jogo = {};
    function soma(g, v, mot, forte) {
      if (g.id === g0.id) return;
      pts[g.id] = (pts[g.id] || 0) + v; jogo[g.id] = g;
      if (forte || !por[g.id]) por[g.id] = mot;
    }
    // mesma série
    var vistos = {};
    var k2 = ch0.k2 ? I.serie["2:" + ch0.k2] : null, k1 = ch0.k1 ? I.serie["1:" + ch0.k1] : null;
    (k2 || []).concat(k1 || []).forEach(function (g) { if (!vistos[g.id]) { vistos[g.id] = 1; soma(g, 20, "Mesma série", true); } });
    // mesmas pistas (as raras valem mais)
    var ks = Object.keys(c0.k).filter(function (x) { return FRACAS[x] !== 0; });
    ks.forEach(function (x) {
      var l = I.cod[x] || [], w = (I.idf[x] || 1) * (x in FRACAS ? FRACAS[x] : 1);
      if (l.length > 4000) return;
      for (var i = 0; i < l.length; i++) soma(l[i], w, "Parecido");
    });
    // gênero e romance só contam pra quem já está na lista acima (ou se o jogo não tem pistas)
    var cand = Object.keys(pts);
    if (cand.length < N_PAR) (I.gen[g0.gn] || []).slice(0, 3000).forEach(function (g) { soma(g, 0.01, "Mesmo gênero"); });
    var temRom = g0.rom === "sim" || g0.rom === "opc";
    var edL = c0.ed >= 0 ? I.eds[c0.ed] || [] : [];
    var mesmaEd = {};
    edL.forEach(function (g) { mesmaEd[g.id] = 1; if (!pts[g.id] && g.gn === g0.gn) soma(g, 0.5, "Mesma editora"); });
    var lst = [];
    Object.keys(pts).forEach(function (id) {
      var g = jogo[id], v = pts[id];
      if (g.gn === g0.gn) v += 2;
      if (temRom && (g.rom === "sim" || g.rom === "opc")) { v += 2.5; if (por[id] === "Parecido") por[id] = "Também tem romance"; }
      if (mesmaEd[id]) { v += 1.5; if (por[id] !== "Mesma série") por[id] = "Mesma editora"; }
      var nt = nota(g);
      v += nt ? (nt - 60) / 40 : -0.3;
      if (g.img) v += 0.3;
      lst.push([v, g]);
    });
    lst.sort(function (a, b) { return b[0] - a[0]; });
    return lst.slice(0, N_PAR).map(function (x) { return {g: x[1], por: por[x[1].id] === "Parecido" ? (x[1].gn === g0.gn ? "Mesmo estilo" : "Parecido") : por[x[1].id]}; });
  }
  function parecidosHTML(id) {
    var g0 = porId()[id];
    if (!g0) return "";
    var l = parecidos(g0);
    if (!l.length) return "";
    return "<h3>Parecidos com este</h3><div class=\"lista\">" + l.map(function (x) {
      var v = VER[avaliar(x.g, false).nivel][0];
      return '<button type="button" class="par-b" data-par-b="' + esc(x.g.id) + '" aria-label="Ver a ficha de ' + esc(x.g.n) + '">' + coverHTML(x.g, "") +
        '<span class="nm">' + esc(x.g.n) + '</span><span class="w-pq"><span aria-hidden="true">' + v + "</span> " + esc(x.por) + "</span></button>";
    }).join("") + "</div>";
  }
  var ioW = null;
  function montarParecidos(id) {
    // o "Parecidos" antigo (mod_B) varria os 19 mil jogos a cada ficha: sai o marcador dele, entra este
    var velho = ficha.querySelector(".parecidos-b-marca, .parecidos-b:not(.w-par)");
    if (velho) velho.remove();
    var inn = ficha.querySelector(".ficha-in");
    if (!inn) return;
    if (ioW) { ioW.disconnect(); ioW = null; }
    var sec = document.createElement("section");
    sec.className = "parecidos-b w-par";
    var nota_ = inn.querySelector(".notas-b2");
    if (nota_ && nota_.nextSibling) inn.insertBefore(sec, nota_.nextSibling); else inn.appendChild(sec);
    function encher() { try { sec.innerHTML = parecidosHTML(id); if (!sec.innerHTML) sec.remove(); } catch (e) { sec.remove(); } }
    if (!("IntersectionObserver" in window)) { encher(); return; }
    var io = ioW = new IntersectionObserver(function (es) {
      if (!es.some(function (x) { return x.isIntersecting; })) return;
      io.disconnect(); if (ioW === io) ioW = null;
      if (sec.isConnected) encher();
    }, {root: ficha, rootMargin: "0px 0px 600px 0px"});
    sec.style.minHeight = "1px";
    io.observe(sec);
  }

  var abrirAntW = abrirFicha;
  abrirFicha = function (id) {
    var r = abrirAntW.apply(this, arguments);
    if (ficha && ficha.open) {
      try { pintar(id); } catch (e) { /* a ficha segue sem o bloco */ }
      try { montarParecidos(id); } catch (e) {}
    }
    return r;
  };
  // deu estrela, marcou ou mudou um plano com a ficha aberta: o bloco acompanha
  if (ficha) {
    var refaz = function () { setTimeout(function () { if (ficha.open && atualId && atualVer !== ver) { try { pintar(atualId); } catch (e) {} } }, 0); };
    ficha.addEventListener("click", refaz);
    ficha.addEventListener("change", refaz);
    ficha.addEventListener("close", function () { atualId = null; if (ioW) { ioW.disconnect(); ioW = null; } });
  }

  // ---------- ordem "🎯 Mais a sua cara" ----------
  var selOrdem = document.getElementById("ordem");
  if (selOrdem && typeof sorted === "function") {
    var op = document.createElement("option");
    op.value = "cara"; op.textContent = "🎯 Mais a sua cara";
    selOrdem.insertBefore(op, selOrdem.options[1] || null);
    var sortedAntW = sorted;
    sorted = function (arr) {
      if (state.sort !== "cara") return sortedAntW.apply(this, arguments);
      var par = new Array(arr.length);
      for (var i = 0; i < arr.length; i++) { var g = arr[i]; par[i] = [notaGosto(g).n, nota(g), g]; }
      par.sort(function (a, b) { return (b[0] - a[0]) || (b[1] - a[1]) || (a[2].n < b[2].n ? -1 : a[2].n > b[2].n ? 1 : 0); });
      for (i = 0; i < par.length; i++) arr[i] = par[i][2];
      return arr;
    };
    // a sessão (mod_S) volta antes deste módulo existir: se a ordem guardada era esta, aplica agora
    try {
      var ses = JSON.parse(localStorage.getItem(KEY + "-sessao") || "null");
      if (ses && ses.sort === "cara" && state.sort !== "cara") { state.sort = "cara"; selOrdem.value = "cara"; renderList(); }
    } catch (e) {}
  }

  // ---------- selinho na capa ----------
  function selo(g) {
    var r = notaGosto(g);
    if (r.cor === "amarelo" && !SELO_AMARELO) return "";
    return '<span class="selo w-selo" title="Pra você: ' + (r.cor === "verde" ? VER.sim[1] : r.cor === "vermelho" ? VER.nao[1] : VER.talvez[1]) + '">' +
      (r.cor === "verde" ? "🟢" : r.cor === "vermelho" ? "🔴" : "🟡") + "</span>";
  }
  if (SELO_CAPA && typeof selosHTML === "function") {
    var selosAntW = selosHTML;
    selosHTML = function (g) {
      var r = selosAntW.apply(this, arguments), x = "";
      try { x = selo(g); } catch (e) {}
      if (!x) return r;
      return r ? r.replace('<span class="selos">', '<span class="selos">' + x) : '<span class="selos">' + x + "</span>";
    };
  }
  // depois de abrir: selos nas capas que já estavam na tela e as notas de todos guardadas (em pedaços, sem travar)
  var ocioso = window.requestIdleCallback || function (f) { return setTimeout(function () { f({timeRemaining: function () { return 8; }}); }, 200); };
  ocioso(function () {
    if (SELO_CAPA) try {
      var P = porId();
      document.querySelectorAll("[data-card] .cover").forEach(function (cv) {
        var card = cv.closest("[data-card]"), g = card && P[card.getAttribute("data-card")];
        if (!g || cv.querySelector(".w-selo") || cv.closest(".ficha-topo, .card-head, .q-card")) return;
        var x = selo(g);
        if (!x) return;
        var s = cv.querySelector(".selos");
        if (s) s.insertAdjacentHTML("afterbegin", x); else cv.insertAdjacentHTML("beforeend", '<span class="selos">' + x + "</span>");
      });
    } catch (e) {}
    var i = 0;
    (function pedaco(dl) {
      try { var key = perfil().key; while (i < DATA.length && (!dl || dl.timeRemaining() > 2)) { notaGosto(DATA[i++]); if (i % 200 === 0 && perfilC.key !== key) { i = 0; key = perfil().key; } } } catch (e) { return; }
      if (i < DATA.length) ocioso(pedaco);
    })();
  });

  // pra testes e pra outros módulos
  window.W_porque = function (id) { var g = porId()[id]; return g ? avaliar(g, true) : null; };
  window.W_dbg = {pontos: pontos, perfil: perfil, limpa: function () { stC = {}; codC = {}; chC = {}; baseC = null; cacheN = {}; cache = {}; perfilC = null; }};
  window.W_parecidos = function (id) { var g = porId()[id]; return g ? parecidos(g).map(function (x) { return x.g.n + " (" + x.por + ")"; }) : []; };
})();

