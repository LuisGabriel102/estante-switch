/* mod_F_busca.js */
// 26/11: busca que entende erro de digitação, falta de acento, sigla, algarismo romano e palavra em português.
// Fica por ÚLTIMO. Troca três coisas do app (sem mexer no 01.js):
//  1. window.B_ok (era do mod_B_decidir): agora consulta um índice montado uma vez (e refeito quando o DATA cresce).
//  2. sorted: com busca ativa, reordena por relevância — nome exato > começa com > frase no nome > todas as palavras
//     > descrição/selo/gênero > parecido; no mesmo nível, os das suas listas, com estrela e marcados primeiro;
//     depois vale a ordem escolhida no app.
//  3. renderList: enquanto você digita, espera 120 ms entre as teclas; põe no alto a fileira "Mais perto do que você
//     buscou" e, quando só acha parecidos (ou nada), o "Você quis dizer…?".
// Para outro módulo avisar que o DATA mudou: window.F_busca.reindexar() ou window.dispatchEvent(new Event("estante-dados")).
// (Além disso, a cada busca e a cada 3 s ele confere sozinho se o DATA cresceu.)
(function () {
  "use strict";
  var ESPERA = 120;

  // ---------- normalização ----------
  var ALIAS = {
    ff: "final fantasy", dq: "dragon quest", p5: "persona 5", p5r: "persona 5 royal", p5s: "persona 5 strikers", p5t: "persona 5 tactica",
    p4: "persona 4", p4g: "persona 4 golden", p3: "persona 3", p3r: "persona 3 reload", p3p: "persona 3 portable",
    botw: "zelda breath of the wild", totk: "zelda tears of the kingdom", loz: "zelda", xc: "xenoblade chronicles", xcde: "xenoblade chronicles definitive edition",
    smt: "shin megami tensei", mh: "monster hunter", mhr: "monster hunter rise", fe: "fire emblem", feth: "fire emblem three houses", rf: "rune factory",
    ac: "animal crossing", acnh: "animal crossing new horizons", mk8: "mario kart 8", mk8d: "mario kart 8 deluxe", ssbu: "super smash bros ultimate",
    smash: "super smash bros", dkc: "donkey kong country", kh: "kingdom hearts", tw: "the witcher", nier: "nier", sf: "street fighter", mk: "mortal kombat",
    re: "resident evil", dmc: "devil may cry", dbz: "dragon ball z", ys: "ys", sao: "sword art online", bg: "baldurs gate", bg3: "baldurs gate 3",
    sdv: "stardew valley", hk: "hollow knight", ori: "ori", ot: "octopath traveler", ot2: "octopath traveler 2", tom: "tale of immortal"
  };
  // português -> inglês (só como alternativa: a palavra digitada continua valendo)
  var PT = {
    dragao: "dragon", dragoes: "dragons dragon", cavaleiro: "knight", cavaleiros: "knights knight", lenda: "legend", lendas: "legends legend",
    guerra: "war", guerras: "wars", estrela: "star", estrelas: "stars star", espada: "sword", espadas: "swords", escudo: "shield", fantasia: "fantasy",
    sombra: "shadow", sombras: "shadows", mundo: "world", ilha: "island", cidade: "city town", princesa: "princess", reino: "kingdom", reinos: "kingdoms",
    monstro: "monster", monstros: "monsters", cacador: "hunter", cacadores: "hunters", corrida: "racing race", corridas: "racing", futebol: "soccer football",
    zumbi: "zombie", zumbis: "zombies", pesca: "fishing fish", pescaria: "fishing", cozinha: "cooking", cozinhar: "cooking cook", vida: "life",
    historia: "story", misterio: "mystery", terror: "horror", luta: "fight fighting", lutas: "fighting", lutador: "fighter", lutadores: "fighters",
    deus: "god", deuses: "gods", demonio: "demon", demonios: "demons", fogo: "fire", gelo: "ice", noite: "night", sangue: "blood", alma: "soul",
    almas: "souls", fazenda: "farm farming", fazendas: "farm farms", masmorra: "dungeon", masmorras: "dungeons dungeon", tesouro: "treasure",
    pirata: "pirate", piratas: "pirates", guerreiro: "warrior", guerreiros: "warriors", bruxa: "witch", bruxas: "witches", magia: "magic", mago: "wizard mage",
    heroi: "hero", herois: "heroes", aventura: "adventure", aventuras: "adventures", jornada: "journey", cavalo: "horse", gato: "cat", gatos: "cats",
    cachorro: "dog", robo: "robot", robos: "robots", espaco: "space", tempo: "time", morte: "death", inferno: "hell", oceano: "ocean", floresta: "forest",
    montanha: "mountain", castelo: "castle", torre: "tower", escola: "school", amor: "love", coracao: "heart", sonho: "dream", sonhos: "dreams",
    pesadelo: "nightmare", fantasma: "ghost", fantasmas: "ghosts", ultimo: "last", ultima: "last", mestre: "master", batalha: "battle", batalhas: "battles",
    tiro: "shooter", carro: "car", carros: "cars", tanque: "tank", aviao: "plane", trem: "train", caverna: "cave", cavernas: "caves", ruinas: "ruins",
    planta: "plant", plantas: "plants", jardim: "garden", oficina: "workshop", loja: "shop", vampiro: "vampire", vampiros: "vampires", lobo: "wolf",
    e: "and"
  };
  var STOP = {the: 1, of: 1, a: 1, an: 1, and: 1, e: 1, de: 1, do: 1, da: 1, dos: 1, das: 1, o: 1, os: 1, as: 1, um: 1, uma: 1, no: 1, na: 1, to: 1, in: 1,
    jogo: 1, jogos: 1, game: 1, games: 1};
  var ROMANO = /^(x{0,3})(ix|iv|v?i{0,3})$/;
  var RV = {"": 0, i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9};
  function romano(t) {
    var m = ROMANO.exec(t);
    if (!m || !t) return t;
    return String(m[1].length * 10 + RV[m[2]]);
  }
  function base(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[™®©]/g, " ").replace(/&/g, " and ").replace(/['’‘`´]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  // letra|número separados ("ff7" -> "ff 7"), romano -> algarismo ("vii" -> "7")
  function toks(s) {
    var b = base(s);
    if (!b) return [];
    var out = [], p = b.replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2").split(" ");
    for (var i = 0; i < p.length; i++) if (p[i]) out.push(romano(p[i]));
    return out;
  }
  // sigla no começo de uma palavra digitada: "ff7", "ffvii", "dq11", "xc2", "p5r"
  function siglas(b) {
    return b.split(" ").map(function (t) {
      if (ALIAS[t]) return ALIAS[t];
      var m = /^([a-z]+)(\d+)$/.exec(t);
      if (m && ALIAS[m[1]]) return ALIAS[m[1]] + " " + m[2];
      for (var k = 2; k < t.length; k++) {
        var a = t.slice(0, k), r = t.slice(k);
        if (ALIAS[a] && ROMANO.test(r)) return ALIAS[a] + " " + r;
      }
      return t;
    }).join(" ");
  }
  function nomeForma(n) { return toks(n).join(" "); }
  function altForma(f) {
    var a = f.replace(/^the legend of zelda\b/, "zelda").replace(/\bthe legend of zelda\b/, "zelda");
    if (a.indexOf("the ") === 0) a = a.slice(4);
    return a;
  }

  // ---------- índice ----------
  var REF = [], NF = [], NA = [], ID2I = new Map();
  var MN = new Map();                          // palavra do nome -> lista de jogos
  var VN = [], VNm = null, vocabOk = false;
  var N = 0, montando = false;
  // texto (selo, descrição, gênero, romance): um textão só, achado com indexOf; OFF = onde começa cada jogo
  var TXP = [], TXN = 0, TX = "", OFF = null, txOk = false, TH = new Map();
  // depois, também em segundo plano: palavra do texto -> jogos (aí a busca no texto fica instantânea)
  var MT = new Map(), VT = [], TWN = 0, twOk = false;
  var EST = {nomesMs: 0, textoMs: 0, ordenarMs: 0, jogos: 0, comTexto: 0, palavrasNome: 0, letrasTexto: 0, pronto: false,
    buscas: 0, ultMs: 0, maxMs: 0, somaMs: 0, refeito: 0, montagens: 0};
  function poe(w, i) {
    var l = MN.get(w);
    if (!l) MN.set(w, [i]); else if (l[l.length - 1] !== i) l.push(i);
  }
  function indexarNome(i) {
    var g = DATA[i];
    REF[i] = g; ID2I.set(g.id, i);
    var f = nomeForma(g.n || ""), a = altForma(f);
    NF[i] = f; NA[i] = a !== f ? a : null;
    var ws = f.split(" "), k;
    for (k = 0; k < ws.length; k++) if (ws[k]) poe(ws[k], i);
    if (NA[i]) { ws = NA[i].split(" "); for (k = 0; k < ws.length; k++) if (ws[k]) poe(ws[k], i); }
  }
  function textoDe(g) {
    var fi = (typeof FICHA !== "undefined" && FICHA[g.id]) || null, gl = (typeof GENRES !== "undefined" && GENRES[g.gn]) || null;
    return (g.t || "") + " " + (fi && fi.d ? fi.d : "") + " " + (gl ? gl.label : "") + (g.rom === "sim" || g.rom === "opc" ? " romance namoro" : "");
  }
  function textoPasso(lim) {
    var ate = Math.min(N, TXN + lim), arr = [], i;
    for (i = TXN; i < ate; i++) arr.push(textoDe(REF[i]));
    var r = arr.join("\u0001").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/['’‘`´]/g, "").replace(/[^a-z0-9\u0001]+/g, " ").split("\u0001");
    for (i = 0; i < r.length; i++) TXP[TXN + i] = r[i];
    TXN = ate;
    if (TXN === N) juntarTexto();
  }
  function juntarTexto() {
    var off = new Int32Array(N + 1), partes = new Array(N), pos = 0;
    for (var i = 0; i < N; i++) { off[i] = pos; var s = " " + TXP[i] + " \u0001"; partes[i] = s; pos += s.length; }
    off[N] = pos; TX = partes.join(""); OFF = off; txOk = true; TH.clear(); VER++;
    EST.comTexto = N; EST.letrasTexto = pos;
  }
  // jogos cujo texto tem uma palavra que começa com w
  function textoAcha(w) {
    if (w.length < 3) return null;
    var c = TH.get(w);
    if (c) return c;
    if (twOk) {
      c = [];
      for (var j = inicio(VT, w); j < VT.length && VT[j].indexOf(w) === 0; j++) c.push(MT.get(VT[j]));
      c = c.length === 1 ? c[0] : [].concat.apply([], c);
      if (TH.size > 300) TH.clear();
      TH.set(w, c);
      return c;
    }
    if (!txOk) return null;
    var out = [], ag = " " + w, nt = OFF.length - 1, lo = 0, p = TX.indexOf(ag);
    while (p >= 0) {
      var a = lo, b = nt;
      while (b - a > 1) { var m = (a + b) >> 1; if (OFF[m] <= p) a = m; else b = m; }
      out.push(a); lo = a;
      if (a + 1 >= nt) break;
      p = TX.indexOf(ag, OFF[a + 1]);
    }
    if (TH.size > 300) TH.clear();
    TH.set(w, out);
    return out;
  }
  function palavrasPasso(lim) {
    var ate = Math.min(TXN, TWN + lim);
    for (var i = TWN; i < ate; i++) {
      var ws = TXP[i].split(" ");
      for (var k = 0; k < ws.length; k++) {
        var w = ws[k];
        if (w.length < 3 || w.length > 24 || STOP[w]) continue;
        var l = MT.get(w);
        if (!l) MT.set(w, [i]); else if (l[l.length - 1] !== i) l.push(i);
      }
    }
    TWN = ate; twOk = false;
    if (TWN === N) { VT = Array.from(MT.keys()).sort(); twOk = true; TH.clear(); EST.palavrasTexto = VT.length; VER++; }
  }
  function mascara(s) {
    var m = 0;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); m |= c >= 97 ? 1 << (c - 97) : 1 << 26 + (c % 5); }
    return m;
  }
  function ordenar() {
    var t0 = performance.now();
    VN = Array.from(MN.keys()).sort();
    VNm = new Int32Array(VN.length);
    for (var i = 0; i < VN.length; i++) VNm[i] = mascara(VN[i]);
    vocabOk = true; FZ.clear(); VER++;
    EST.ordenarMs = Math.round(performance.now() - t0);
    EST.palavrasNome = VN.length;
  }
  function trocou() { return DATA.length < N || (N > 0 && (DATA[N - 1] !== REF[N - 1] || DATA[0] !== REF[0])); }
  function mudou() { return DATA.length !== N || trocou(); }
  function zerar() {
    REF = []; NF = []; NA = []; ID2I = new Map(); MN = new Map(); N = 0; vocabOk = false; VN = []; VNm = null; VER++;
    TXP = []; TXN = 0; TX = ""; OFF = null; txOk = false; TH.clear(); MT = new Map(); VT = []; TWN = 0; twOk = false;
    EST.nomesMs = 0; EST.textoMs = 0; EST.refeito++;
  }
  // (só pros testes) termina os nomes agora; o texto segue em segundo plano
  function garantir() {
    if (mudou()) {
      if (trocou()) zerar();
      var t0 = performance.now();
      while (N < DATA.length) indexarNome(N++);
      EST.nomesMs += performance.now() - t0;
      vocabOk = false;
      montarAosPoucos();
    }
    if (!vocabOk) ordenar();
    EST.jogos = N;
  }
  function montarAosPoucos() {
    if (montando) return;
    if (!mudou() && vocabOk && TXN === N && twOk) return;
    montando = true; EST.pronto = false; EST.montagens++;
    if (trocou()) zerar();
    (function passo() {
      var t0 = performance.now();
      if (N < DATA.length) {
        while (N < DATA.length && performance.now() - t0 < 14) indexarNome(N++);
        EST.nomesMs += performance.now() - t0;
        vocabOk = false;
        setTimeout(passo, 0); return;
      }
      if (!vocabOk) { ordenar(); if (state.q.trim()) renderList(); setTimeout(passo, 0); return; }   // nomes prontos: refaz a busca que estava na tela
      if (TXN < N) {
        textoPasso(700);
        EST.textoMs += performance.now() - t0;
        if (TXN === N && state.q.trim()) renderList();   // agora a busca também olha a descrição
        setTimeout(passo, 0); return;
      }
      if (!twOk) {
        while (TWN < N && performance.now() - t0 < 14) palavrasPasso(150);
        if (TWN === N && !twOk) palavrasPasso(0);
        EST.palavrasMs = (EST.palavrasMs || 0) + performance.now() - t0;
        setTimeout(passo, 0); return;
      }
      EST.nomesMs = Math.round(EST.nomesMs); EST.textoMs = Math.round(EST.textoMs); EST.palavrasMs = Math.round(EST.palavrasMs || 0);
      EST.jogos = N; EST.pronto = true; montando = false;
      if (mudou()) montarAosPoucos();
    })();
  }

  // ---------- palavra parecida (Damerau/OSA com limite) ----------
  var R0 = new Int32Array(80), R1 = new Int32Array(80), R2 = new Int32Array(80);
  function osa(a, b, k, pref) {
    var la = a.length, lb = b.length;
    if (pref) { if (lb > la + k) lb = la + k; } else if (Math.abs(la - lb) > k) return k + 1;
    if (la > 70 || lb > 70) return k + 1;
    var pp = R0, p = R1, c = R2, i, j, t;
    for (j = 0; j <= lb; j++) p[j] = j;
    for (i = 1; i <= la; i++) {
      c[0] = i; var mn = i, ai = a.charCodeAt(i - 1);
      for (j = 1; j <= lb; j++) {
        var bj = b.charCodeAt(j - 1), v = p[j - 1] + (ai === bj ? 0 : 1), x = p[j] + 1;
        if (x < v) v = x;
        x = c[j - 1] + 1; if (x < v) v = x;
        if (i > 1 && j > 1 && ai === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bj) { x = pp[j - 2] + 1; if (x < v) v = x; }
        c[j] = v; if (v < mn) mn = v;
      }
      if (mn > k) return k + 1;
      t = pp; pp = p; p = c; c = t;
    }
    if (!pref) return p[lb];
    var best = k + 1;   // começo da palavra: o melhor entre os prefixos de tamanho la-k .. la+k
    for (j = Math.max(1, la - k); j <= lb; j++) if (p[j] < best) best = p[j];
    return best;
  }
  function popc(x) { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }
  function limite(t) { return /^\d+$/.test(t) ? 0 : t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0; }
  var FZ = new Map();
  // palavras do nome a até k letras de diferença; pref = também vale o começo de palavra (a palavra que está sendo digitada)
  function parecidas(t, k, pref) {
    var ch = t + "|" + k + "|" + (pref ? 1 : 0);
    if (FZ.has(ch)) return FZ.get(ch);
    var out = [], lt = t.length, mt = mascara(t), c0 = t.charCodeAt(0), c1 = t.charCodeAt(1);
    for (var i = 0; i < VN.length; i++) {
      var w = VN[i], lw = w.length, d;
      if (w === t) continue;
      if (Math.abs(lw - lt) <= k && popc(mt ^ VNm[i]) <= 2 * k) {
        d = osa(t, w, k, false);
        if (d <= k) { out.push([w, d]); continue; }
      }
      if (pref && lt >= 5 && lw > lt) {
        var w0 = w.charCodeAt(0);
        if (w0 !== c0 && w.charCodeAt(1) !== c1 && w0 !== c1 && w.charCodeAt(1) !== c0 && w.charCodeAt(2) !== c0 && w0 !== t.charCodeAt(2)) continue;
        d = osa(t, w, k, true);
        if (d <= k) out.push([w, d + 0.5]);
      }
    }
    if (FZ.size > 400) FZ.clear();
    FZ.set(ch, out);
    return out;
  }
  function inicio(V, t) {
    var lo = 0, hi = V.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (V[m] < t) lo = m + 1; else hi = m; }
    return lo;
  }

  // ---------- a busca ----------
  var VER = 0, chave = null, PRONTA = false, SC = new Float32Array(0), MELHOR = 0 /* melhor nível achado */, SUG = "", TOPF = 0;
  function variantes(q) {
    var b = base(q), s = siglas(b), out = [toks(s)];
    if (s !== b) out.push(toks(b));
    return out.filter(function (v) { return v.length; });
  }
  function frases(tk) {
    var fs = [[]];
    tk.forEach(function (t) {
      var alt = [t];
      if (PT[t] && (t.length >= 4 || t === "e")) alt = alt.concat(PT[t].split(" "));
      var nv = [];
      fs.forEach(function (f) { alt.forEach(function (a, k) { if (nv.length < 6) { var x = f.concat(a); x.tr = f.tr || k > 0; nv.push(x); } }); });
      fs = nv;
    });
    return fs.map(function (f) { return {p: f.join(" "), tr: !!f.tr}; });
  }
  function marcar(mk, lista, v) {
    for (var j = 0; j < lista.length; j++) { var i = lista[j]; if (mk[i] < v) mk[i] = v; }
  }
  var PERF = {};
  function avaliar(tk, sc, ehPrimeira) {
    PERF = {t0: performance.now(), texto: 0};
    var slots = tk.map(function (t, k) {
      var alt = [];
      if (PT[t] && t.length >= 4) alt = PT[t].split(" ");
      return {t: t, alt: alt, stop: !!STOP[t] && tk.length > 1, num: /^\d+$/.test(t), ult: k === tk.length - 1, temNome: false, mk: null};
    });
    var req = slots.filter(function (s) { return !s.stop; });
    if (!req.length) req = slots;
    var n = N, i, j, s, l;
    req.forEach(function (s) {
      var mk = s.mk = new Uint8Array(n), t = s.t;
      // 4 = palavra igual no nome; 3 = começo de palavra no nome, ou a tradução; 2 = parecida; 1 = só na descrição/selo/gênero
      l = MN.get(t); if (l) { marcar(mk, l, 4); s.temNome = true; }
      for (j = inicio(VN, t); j < VN.length && VN[j].indexOf(t) === 0; j++) if (VN[j] !== t) { marcar(mk, MN.get(VN[j]), 3); s.temNome = true; }
      s.alt.forEach(function (a) {
        l = MN.get(a); if (l) { marcar(mk, l, 3); s.temNome = true; }
        if (a.length >= 4) for (var jj = inicio(VN, a); jj < VN.length && VN[jj].indexOf(a) === 0; jj++) { marcar(mk, MN.get(VN[jj]), 3); s.temNome = true; }
      });
      [t].concat(s.alt).forEach(function (a) {
        if (a.length < 3 || s.num) return;
        var _t = performance.now(); var h = textoAcha(a); if (h) marcar(mk, h, 1); PERF.texto += performance.now() - _t;
      });
    });
    PERF.marcas = performance.now() - PERF.t0;
    // poucos achados pelo nome? então procura as palavras parecidas
    var noNome = 0;
    for (i = 0; i < n && noNome < 8; i++) {
      for (j = 0; j < req.length; j++) if (req[j].mk[i] < 3) break;
      if (j === req.length) noNome++;
    }
    var corr = null;
    if (noNome < 8) {
      corr = [];
      req.forEach(function (s) {
        var k = limite(s.t), melhor = null;
        if (!k) { corr.push(s.t); return; }
        var ps = parecidas(s.t, k, s.ult);
        ps.forEach(function (p) {
          marcar(s.mk, MN.get(p[0]), 2);
          var f = MN.get(p[0]).length;
          if (!melhor || p[1] < melhor[1] || (p[1] === melhor[1] && f > melhor[2])) melhor = [p[0], p[1], f];
        });
        // nada parecido nem com o limite normal: pra sugestão, tenta uma letra a mais
        if (!melhor && !s.temNome && s.t.length >= 4) {
          parecidas(s.t, k + 1, false).forEach(function (p) {
            var f = MN.get(p[0]).length;
            if (!melhor || p[1] < melhor[1] || (p[1] === melhor[1] && f > melhor[2])) melhor = [p[0], p[1], f];
          });
        }
        corr.push(s.temNome || !melhor ? s.t : melhor[0]);
      });
    }
    PERF.fuzzy = performance.now() - PERF.t0 - PERF.marcas;
    var fs = frases(tk), ultNum = /\d$/.test(fs[0].p), qlen = fs[0].p.length;
    var fav = state.fav, sel = state.sel;
    for (i = 0; i < n; i++) {
      var mn = 9, exatas = 0, temTxt = false, temPar = false;
      for (j = 0; j < req.length; j++) {
        var v = req[j].mk[i];
        if (!v) { mn = 0; break; }
        if (v < mn) mn = v;
        if (v === 4) exatas++; else if (v === 2) temPar = true; else if (v === 1) temTxt = true;
      }
      if (!mn) continue;
      var nivel = !temTxt && !temPar ? 500 : !temPar ? 350 : !temTxt ? 300 : 250;
      var f = NF[i], a = NA[i];
      if (nivel === 500) {
        for (j = 0; j < fs.length; j++) {
          var nv = nivelFrase(f, fs[j].p, ultNum);
          if (a) { var na = nivelFrase(a, fs[j].p, ultNum); if (na > nv) nv = na; }
          if (nv && fs[j].tr) nv -= 100;     // achou pela tradução (dragao -> dragon): um degrau abaixo do nome digitado
          if (nv > nivel) nivel = nv;
        }
      }
      var g = REF[i];
      var bonus = (g.l !== 5 ? 50 : 0) + (fav.has(g.id) ? 30 : 0) + (sel.has(g.id) ? 20 : 0);
      var fino = 5 * exatas / req.length + 4.9 * Math.min(1, qlen / Math.max(1, (a && a.length < f.length ? a : f).length));
      var nota = nivel + bonus + fino;
      if (nivel > MELHOR) MELHOR = nivel;
      if (nota > sc[i]) sc[i] = nota;
    }
    PERF.laco = performance.now() - PERF.t0 - PERF.marcas - PERF.fuzzy;
    if (ehPrimeira && corr) {
      var sug = corr.join(" ");
      if (sug !== req.map(function (s) { return s.t; }).join(" ")) SUG = sug;
    }
  }
  function nivelFrase(f, p, ultNum) {
    if (f === p) return 1000;
    if (f.indexOf(p) === 0 && (f.length === p.length || f.charCodeAt(p.length) === 32 || !ultNum)) return 800;
    var k = (" " + f).indexOf(" " + p);
    if (k >= 0 && (!ultNum || k + p.length >= f.length || f.charCodeAt(k + p.length) === 32)) return 650;
    return 0;
  }
  function prep(q) {
    q = String(q || "").trim();
    if (trocou()) zerar();
    if (mudou() || !vocabOk) montarAosPoucos();      // nunca trava: o que falta é montado em segundo plano
    var k = q + "" + N + "" + VER;
    if (k === chave) return;
    chave = k;
    var t0 = performance.now();
    if (SC.length !== N) SC = new Float32Array(N); else SC.fill(0);
    SUG = ""; MELHOR = 0; TOPF = 0;
    PRONTA = VN.length > 0;                           // ainda sem índice (app acabou de abrir): vale o "contém" antigo
    if (!PRONTA) return;
    var vs = variantes(q);
    vs.forEach(function (v, k) { avaliar(v, SC, k === 0); });
    for (var i = 0; i < N; i++) if (SC[i]) TOPF++;
    if (MELHOR >= 350) SUG = "";
    var ms = performance.now() - t0;
    EST.buscas++; EST.ultMs = Math.round(ms * 10) / 10; EST.somaMs += ms; if (ms > EST.maxMs) EST.maxMs = Math.round(ms * 10) / 10;
  }
  function nota(g) { var i = ID2I.get(g.id); return i === undefined || i >= SC.length ? 0 : SC[i]; }

  // ---------- troca 1: B_ok ----------
  var coleta = null;
  window.B_ok = function (g, q) {
    prep(q);
    var i = ID2I.get(g.id), ok = PRONTA && i !== undefined && i < SC.length ? SC[i] > 0 : norm(g.n).indexOf(q) >= 0;
    if (ok && coleta) coleta.push(g);
    return ok;
  };

  // ---------- troca 2: ordem por relevância ----------
  var sortedAntF = sorted;
  sorted = function (arr) {
    var r = sortedAntF.apply(this, arguments);
    if (!state.q.trim() || !r || r.length < 2) return r;
    prep(norm(state.q.trim()));
    var d = new Array(r.length), k;
    for (k = 0; k < r.length; k++) d[k] = [nota(r[k]), k, r[k]];
    d.sort(function (a, b) { return (b[0] - a[0]) || (a[1] - b[1]); });
    for (k = 0; k < r.length; k++) r[k] = d[k][2];
    return r;
  };

  // ---------- troca 3: espera entre as teclas + "Mais perto" + "Você quis dizer" ----------
  var digitando = false, tDeb = 0;
  window.addEventListener("input", function (e) {
    if (e.target && e.target.id === "busca") { digitando = true; setTimeout(function () { digitando = false; }, 0); }
  }, true);
  window.addEventListener("input", function () { digitando = false; });
  var filtrosAntF = renderFiltros, visto = null;
  renderFiltros = function (n) {
    if (coleta) { visto = {lista: coleta, n: n}; coleta = null; }
    return filtrosAntF.apply(this, arguments);
  };
  var renderAntF = renderList;
  function rodar(self, args) {
    var q = state.q.trim();
    coleta = q ? [] : null; visto = null;
    var r;
    EST.renders = (EST.renders || 0) + 1;
    try { r = renderAntF.apply(self, args); } finally { coleta = null; }
    if (q) { try { enfeitar(q); } catch (e) { /* a lista já está na tela */ } }
    return r;
  }
  renderList = function () {
    if (digitando) {
      var self = this, args = arguments;
      clearTimeout(tDeb);
      tDeb = setTimeout(function () { tDeb = 0; rodar(self, args); }, ESPERA);
      return;
    }
    if (tDeb) { clearTimeout(tDeb); tDeb = 0; }
    return rodar(this, arguments);
  };
  function enfeitar(q) {
    var root = document.getElementById("lista-jogos");
    if (!root || state.view === "quadro" || playlistAtiva()) return;
    var html = "";
    if (PRONTA && (SUG || !TOPF)) {
      html += '<div class="fb-sug" role="status">' + (TOPF ? "Não achei “" + esc(q) + "” escrito assim — mostrando os parecidos." : "Não achei nada com “" + esc(q) + "”.") +
        (SUG ? ' Você quis dizer <button type="button" class="fb-sug-b" data-fb-sug="' + esc(SUG) + '">' + esc(SUG) + "</button>?" : "") + "</div>";
    }
    if (visto) {
      var lista = visto.lista.filter(function (g) { return !window.B_chips || B_chips(g); });
      if (lista.length === visto.n && lista.length) {
        var grupos = {};
        lista.forEach(function (g) { grupos[state.agrupar === "genero" ? g.gn : g.s] = 1; });
        if (state.view === "vitrine" || Object.keys(grupos).length > 1) {
          var ord = sorted(lista.slice());
          html += vitRow("vit-busca", "🔎 Mais perto de “" + esc(q) + "”", ord);
        }
      }
    }
    if (html) root.insertAdjacentHTML("afterbegin", html);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-fb-sug]") : null;
    if (!b) return;
    var inp = document.getElementById("busca");
    inp.value = b.dataset.fbSug;
    inp.dispatchEvent(new Event("input", {bubbles: true}));
  });
  var css = document.createElement("style");
  css.textContent = ".fb-sug{margin:4px 0 16px;padding:12px 14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;color:var(--ink);line-height:1.5}" +
    ".fb-sug-b{font:inherit;font-weight:700;color:var(--accent-ink);background:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:2px 12px;margin:0 2px;cursor:pointer;min-height:32px}";
  document.head.appendChild(css);

  // ---------- quando o DATA cresce (catálogo chegando depois) ----------
  window.addEventListener("estante-dados", montarAosPoucos);
  setInterval(function () { if (mudou()) montarAosPoucos(); }, 3000);
  setTimeout(montarAosPoucos, 400);

  // pra testar e medir
  window.F_busca = {
    est: EST,
    perf: function () { return PERF; },
    reindexar: function () { zerar(); montarAosPoucos(); },
    garantir: function () { garantir(); return EST; },
    pronta: function () { return PRONTA; },
    sugestao: function () { return SUG; },
    nivel: function () { return MELHOR; },
    // os n primeiros de toda a base (sem filtros), com a nota
    top: function (q, n) {
      prep(norm(String(q)));
      var r = [];
      for (var i = 0; i < N; i++) if (SC[i]) r.push(i);
      r.sort(function (a, b) { return SC[b] - SC[a]; });
      return r.slice(0, n || 3).map(function (i) { return {n: REF[i].n, nota: Math.round(SC[i]), l: REF[i].l}; });
    },
    medir: function (q) { chave = null; FZ.clear(); TH.clear(); var t = performance.now(); prep(norm(String(q))); return performance.now() - t; }
  };
  if (state.q.trim()) renderList();
})();

