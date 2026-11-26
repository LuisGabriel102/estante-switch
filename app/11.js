/* mod_I_imagens.js */
// 26/11 (tarde): substitui o mod_H (imagens guardadas por gênero num banco do navegador, com os filtros da lista).
// Agora:
//  - Toda capa e foto vista fica guardada sozinha pelo service worker (cache, as últimas ~4.000) e abre daqui
//    na próxima vez, até sem internet. Nada pra clicar.
//  - "📥 Usar sem internet" (painel): o catálogo (textos) e, gênero por gênero, "Guardar" as capas (e as fotos dos
//    jogos das suas listas; as do catálogo, se quiser). Sem depender dos filtros da lista: o gênero inteiro.
//  - Baixa 8 imagens ao mesmo tempo, com barra de andamento, e continua de onde parou (fechou o app, caiu a
//    internet, a tela apagou: volta sozinho). Mostra o espaço usado e pede pro navegador guardar de vez
//    (navigator.storage.persist).
//  - As imagens guardadas ficam no mesmo endereço que a página usa (wsrv.nl): a lista não muda nada; quem
//    entrega do aparelho é o service worker. Sem "blob:" e sem ler tudo pra memória ao abrir.
//  - O que estava guardado no jeito antigo (mod_H) é apagado e os gêneros entram na fila pra guardar de novo.
(function () {
  "use strict";
  var GUARD = "estante-imgs-guardadas", VISTAS = "estante-imgs-vistas";
  var KQ = KEY + "-I-fila", KM = KEY + "-I-meta", KF = KEY + "-I-fotoscat";
  var AO_MESMO_TEMPO = 8, KB_CAPA = 20, KB_FOTO = 30;
  var temCache = "caches" in window;
  function ler(k, p) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? p : v; } catch (e) { return p; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function mil(n) { return Number(n).toLocaleString("pt-BR"); }
  function mb(bytes) { var m = bytes / 1048576; return m >= 1024 ? (m / 1024).toFixed(1).replace(".", ",") + " GB" : m >= 10 ? Math.round(m) + " MB" : Math.max(0.1, Math.round(m * 10) / 10).toString().replace(".", ",") + " MB"; }
  function rot(g) { return (GENRES[g] && GENRES[g].label) || g; }
  function daLista(g) { return g.l !== 5 || !!g.b; }

  // ---------- o que já está guardado ----------
  var meta = ler(KM, {}) || {};          // {g: {gen: {n, b}}}: quantas e quantos bytes por gênero
  meta.g = meta.g || {};
  var guardadas = new Set(), lido = false, lendo = null;
  function lerGuardadas() {
    if (lido) return Promise.resolve();
    if (lendo) return lendo;
    if (!temCache) { lido = true; return Promise.resolve(); }
    lendo = caches.open(GUARD).then(function (c) { return c.keys(); }).then(function (ks) {
      ks.forEach(function (k) { guardadas.add(k.url); });
      lido = true;
    }, function () { lido = true; });
    return lendo;
  }
  function totais() {
    var n = 0, b = 0;
    Object.keys(meta.g).forEach(function (g) { n += meta.g[g].n || 0; b += meta.g[g].b || 0; });
    return {n: n, b: b};
  }
  function fotosCat() { return ler(KF, false) === true; }

  // ---------- o que cada gênero tem (o gênero inteiro, sem os filtros da lista) ----------
  // mesmos endereços que a página usa: capa = imgURL (360 px), foto = fotoURL (720 px)
  // feito numa passada só e guardado (refeito quando chega jogo ou muda a opção das fotos do catálogo)
  var memo = {chave: "", gen: {}};
  function itensDe(gen) {
    var fc = fotosCat(), chave = DATA.length + "|" + fc;
    if (memo.chave !== chave) {
      var por = {}, visto = new Set();
      var lista = DATA.filter(daLista).concat(DATA.filter(function (g) { return !daLista(g); }));   // as suas listas primeiro
      lista.forEach(function (g) {
        var r = por[g.gn] || (por[g.gn] = {jogos: 0, capas: [], fotos: []});
        r.jogos++;
        if (g.img) { var u = imgURL(g.img); if (!visto.has(u)) { visto.add(u); r.capas.push(u); } }
        if (!fc && !daLista(g)) return;
        ((FICHA[g.id] || {}).sh || []).forEach(function (h) { var u = fotoURL(h); if (!visto.has(u)) { visto.add(u); r.fotos.push(u); } });
      });
      memo = {chave: chave, gen: por};
    }
    return memo.gen[gen] || {jogos: 0, capas: [], fotos: []};
  }
  function contaGen(gen) {
    var it = itensDe(gen), falta = 0, kb = 0, tem = 0;
    it.capas.forEach(function (u) { if (guardadas.has(u)) tem++; else { falta++; kb += KB_CAPA; } });
    it.fotos.forEach(function (u) { if (guardadas.has(u)) tem++; else { falta++; kb += KB_FOTO; } });
    return {jogos: it.jogos, total: it.capas.length + it.fotos.length, tem: tem, falta: falta, kb: kb};
  }

  // ---------- baixar: fila de gêneros, 8 imagens ao mesmo tempo ----------
  var fila = ler(KQ, []) || [];
  if (!Array.isArray(fila)) fila = [];
  fila = fila.filter(function (g) { return !!GENRES[g]; });
  var ativo = null;   // {gen, itens, i, total, feitos, falhas, seguidas, parar, espera, semRede}
  function salvaFila() { var a = (ativo && !ativo.parar ? [ativo.gen] : []).concat(fila.filter(function (g) { return !ativo || g !== ativo.gen; })); gravar(KQ, a.length ? a : null); }
  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function catalogoPronto() { return !window.CAT_CARREGANDO; }
  var cacheG = null;
  function abreG() { if (!cacheG) cacheG = caches.open(GUARD); return cacheG; }
  var tMeta = 0;
  function gravaMeta() { if (!tMeta) tMeta = setTimeout(function () { tMeta = 0; gravar(KM, meta); }, 1200); }

  function baixarUma(u, job, tent) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    return fetch(u, {mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", signal: ctl ? ctl.signal : undefined})
      .then(function (r) {
        if (!r.ok) throw {devagar: r.status === 429 || r.status === 503, status: r.status};
        var tipo = r.headers.get("content-type") || "";
        return r.blob().then(function (b) { return {b: b, tipo: tipo}; });
      })
      .then(function (x) {
        clearTimeout(tm);
        if (!x.b || !x.b.size || !/^image\//.test(x.tipo || x.b.type)) throw {};
        if (job.apagado) return;
        return abreG().then(function (c) {
          return c.put(u, new Response(x.b, {headers: {"Content-Type": x.tipo || x.b.type}}));
        }).then(function () {
          guardadas.add(u);
          var m = meta.g[job.gen] = meta.g[job.gen] || {n: 0, b: 0};
          m.n++; m.b += x.b.size;
          gravaMeta();
          caches.open(VISTAS).then(function (v) { return v.delete(u, {ignoreVary: true}); }).catch(function () {});   // não fica duas vezes
        }, function (e) { throw {cheio: true, e: e}; });
      })
      .catch(function (e) {
        clearTimeout(tm);
        if (e && e.cheio) throw e;
        if (job.parar) throw e;
        if (document.hidden) throw {escondida: true};
        if (tent >= 2 || (e && (e.status === 404 || e.status === 403))) throw e;   // 403: o servidor de imagens recusou (bloqueio por excesso): não insiste
        return espera((e && e.devagar ? 5000 : 1000) * (tent + 1)).then(function () { return baixarUma(u, job, tent + 1); });
      });
  }

  var trava = null;
  function acordado(sim) {
    try {
      if (sim) {
        if (trava || !navigator.wakeLock || document.visibilityState !== "visible") return;
        navigator.wakeLock.request("screen").then(function (t) {
          if (!ativo) { t.release(); return; }
          trava = t; t.addEventListener("release", function () { if (trava === t) trava = null; });
        }, function () {});
      } else if (trava) { var t = trava; trava = null; t.release(); }
    } catch (e) {}
  }
  function pedirPersistir() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(function () { pintar(); }, function () {}); } catch (e) {}
  }

  var aviso = {};   // gênero -> o que deu errado
  function proximo() {
    if (ativo) return;
    if (!fila.length) { acordado(false); salvaFila(); pintar(); return; }
    if (!catalogoPronto()) { pintar(); return; }   // espera o catálogo chegar (o "estante-catalogo" chama de novo)
    if (navigator.onLine === false) { pintar(); return; }   // sem internet: espera o "online"
    var gen = fila[0];
    lerGuardadas().then(function () {
      if (ativo || fila[0] !== gen) { if (!ativo) proximo(); return; }
      var it = itensDe(gen), itens = it.capas.concat(it.fotos).filter(function (u) { return !guardadas.has(u); });
      var job = ativo = {gen: gen, itens: itens, i: 0, total: itens.length, feitos: 0, falhas: 0, seguidas: 0, rodando: 0};
      delete aviso[gen];
      salvaFila(); pedirPersistir(); acordado(true); pintar();
      var uiT = 0;
      function avisa() { if (!uiT) uiT = setTimeout(function () { uiT = 0; pintar(); }, 350); }
      function um(u) {
        job.rodando++;
        baixarUma(u, job, 0).then(function () { job.feitos++; job.seguidas = 0; }, function (e) {
          if (e && e.cheio) { job.parar = true; job.cheio = true; return; }
          if (e && e.escondida && !job.parar) { job.itens.push(u); job.espera = true; return; }   // volta pro fim da fila, sem contar como erro
          job.feitos++; job.falhas++; job.seguidas++;
          if (e && e.status === 403) job.recusou = (job.recusou || 0) + 1;
          if (job.recusou >= 5 && !job.parar) { job.parar = true; job.bloqueado = true; }
          else if (job.seguidas >= 12 && !job.parar) { job.parar = true; job.semRede = true; }
        }).then(function () { job.rodando--; avisa(); trabalha(); });
      }
      function trabalha() {
        while (job.rodando < AO_MESMO_TEMPO && job.i < job.itens.length && !job.parar && !job.espera) um(job.itens[job.i++]);
        if (job.rodando === 0 && !job.fim && (job.parar || (job.i >= job.itens.length && !job.espera))) {
          job.fim = true;
          clearTimeout(uiT);
          gravar(KM, meta);
          if (ativo === job) ativo = null;
          if (job.cheio) { aviso[gen] = {cheio: true}; fila = []; }
          else if (job.bloqueado) aviso[gen] = {bloqueado: true};
          else if (job.semRede) aviso[gen] = {semRede: true};
          else if (job.parar) { /* parou: tirado da fila por quem mandou parar */ }
          else {
            if (job.falhas) aviso[gen] = {falhas: job.falhas};
            fila = fila.filter(function (g) { return g !== gen; });
          }
          salvaFila();
          if (job.semRede || job.bloqueado) { acordado(false); pintar(); return; }   // continua quando a internet voltar / na próxima vez
          proximo();
        }
      }
      job.continua = function () { if (job.espera && !job.fim) { job.espera = false; trabalha(); } };
      trabalha();
    });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { gravar(KM, meta); salvaFila(); return; }
    if (ativo) { acordado(true); ativo.continua(); }
    else if (fila.length) proximo();
  });
  window.addEventListener("online", function () { if (!ativo && fila.length) setTimeout(proximo, 1000); });
  window.addEventListener("pagehide", function () { gravar(KM, meta); salvaFila(); });
  document.addEventListener("estante-catalogo", function () { if (!ativo && fila.length) proximo(); pintar(); });
  document.addEventListener("estante-cat-estado", function () { if (aberto()) pintarCat(); });

  function guardar(gen) {
    if (!temCache) return;
    delete aviso[gen];
    if (fila.indexOf(gen) < 0) fila.push(gen);
    salvaFila();
    if (ativo && ativo.semRede) ativo = null;
    proximo(); pintar();
  }
  function guardarTodos() {
    lerGuardadas().then(function () {
      GEN_ORDER.forEach(function (gen) {
        if (fila.indexOf(gen) >= 0) return;
        if (contaGen(gen).falta) fila.push(gen);
      });
      salvaFila(); proximo(); pintar();
    });
  }
  function parar(gen) {   // sem gênero: para tudo
    if (gen) fila = fila.filter(function (g) { return g !== gen; }); else fila = [];
    if (ativo && (!gen || ativo.gen === gen)) ativo.parar = true;
    salvaFila(); pintar();
  }
  function apagar(gen) {
    parar(gen || null);
    if (ativo && (!gen || ativo.gen === gen)) ativo.apagado = true;
    if (!temCache) return Promise.resolve();
    var feito;
    if (!gen) {
      feito = caches.delete(GUARD).then(function () { cacheG = null; guardadas.clear(); meta = {g: {}}; gravar(KM, null); aviso = {}; });
    } else {
      var it = itensDe(gen), us = it.capas.concat(it.fotos);
      // as fotos dos jogos do catálogo podem ter sido guardadas com a opção ligada: tira também
      DATA.forEach(function (g) { if (g.gn === gen) ((FICHA[g.id] || {}).sh || []).forEach(function (h) { us.push(fotoURL(h)); }); });
      feito = lerGuardadas().then(abreG).then(function (c) {
        var del = us.filter(function (u) { return guardadas.has(u); });
        return Promise.all(del.map(function (u) { return c.delete(u).then(function () { guardadas.delete(u); }); }));
      }).then(function () { delete meta.g[gen]; delete aviso[gen]; gravar(KM, meta); });
    }
    return feito.catch(function () {}).then(pintar);
  }

  // ---------- painel "Usar sem internet" ----------
  var css = document.createElement("style");
  css.textContent = [
    ".i-folha { gap: 12px; }",
    ".i-folha h3 { font-size: 16px; margin: 4px 0 0; }",
    ".i-folha p { margin: 0; }",
    ".i-cat { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); }",
    ".i-cat.ok { border-color: var(--pt); background: var(--pt-bg); }",
    ".i-cat.erro { border-color: var(--veto); color: var(--veto); font-weight: 600; }",
    ".i-prog { display: grid; gap: 6px; padding: 10px 12px; border-radius: 12px; background: var(--accent-soft, #e6ebff); }",
    ".i-prog[hidden] { display: none; }",
    ".i-barra { height: 10px; border-radius: 6px; background: var(--line); overflow: hidden; }",
    ".i-barra span { display: block; height: 100%; width: 0; background: var(--accent); transition: width .3s; }",
    ".i-acoes { display: flex; flex-wrap: wrap; gap: 8px; }",
    ".i-gens { display: grid; gap: 6px; }",
    ".i-lin { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 12px; }",
    ".i-lin.ok { border-color: var(--pt); background: var(--pt-bg); }",
    ".i-lin strong { font-size: 15px; }",
    ".i-lin small { grid-column: 1; color: var(--muted); font-size: 13px; }",
    ".i-lin .i-bts { grid-row: 1 / span 2; grid-column: 2; display: flex; gap: 6px; }",
    ".i-lin button { font: inherit; font-size: 14px; font-weight: 600; min-height: 40px; padding: 4px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; }",
    ".i-lin button.i-sim { border-color: var(--accent); color: var(--accent); }",
    ".i-lin button.i-del { color: var(--veto); }",
    ".i-lin .i-erro { color: var(--veto); }",
    ".i-uso { font-size: 13px; color: var(--muted); }",
    "#i-pilula { position: fixed; left: 12px; bottom: calc(var(--a-barra-h, 64px) + 12px); z-index: 25; font: inherit; font-size: 14px; font-weight: 700;",
    "  min-height: 40px; padding: 6px 14px; border-radius: 999px; border: 2px solid var(--accent); background: var(--surface); color: var(--accent);",
    "  box-shadow: 0 4px 14px rgba(0,0,0,.2); cursor: pointer; }",
    "#i-pilula[hidden] { display: none; }"
  ].join("\n");
  document.head.appendChild(css);

  var fundo = document.createElement("div");
  fundo.className = "c-fundo h-fundo";
  fundo.id = "i-fundo";
  document.body.appendChild(fundo);
  var pilula = document.createElement("button");
  pilula.type = "button"; pilula.id = "i-pilula"; pilula.hidden = true;
  document.body.appendChild(pilula);
  function aberto() { return fundo.classList.contains("aberto"); }
  var confirma = null, tConf = 0;

  function abrir() {
    fundo.innerHTML = '<div class="c-folha i-folha" role="dialog" aria-labelledby="i-tit">' +
      '<div class="p-topo"><h2 id="i-tit">Usar sem internet</h2><button type="button" class="p-x" data-hfecha aria-label="Fechar">✕</button></div>' +
      "<h3>📚 Catálogo</h3><p class=\"i-cat\" id=\"i-cat\"></p>" +
      "<h3>🖼 Capas e fotos</h3>" +
      '<p>Toda capa e foto que você vê já fica guardada sozinha neste aparelho (as últimas ~4.000). Pra ter um gênero inteiro sem internet, toque em <strong>Guardar</strong>: vêm as capas de todos os jogos dele e as fotos dos jogos das suas listas.</p>' +
      '<div class="i-prog" id="i-prog" hidden><strong id="i-prog-tit"></strong><div class="i-barra"><span id="i-prog-barra"></span></div><small id="i-prog-txt"></small></div>' +
      '<div class="i-acoes"><button type="button" class="c-btn" data-i-todos id="i-todos"></button><button type="button" class="c-btn" data-i-parar id="i-parar">Parar</button></div>' +
      '<label class="c-chk"><input type="checkbox" id="i-fotoscat"' + (fotosCat() ? " checked" : "") + "> Guardar também as fotos dos jogos do catálogo (bem maior)</label>" +
      '<div class="i-gens" id="i-gens"></div>' +
      '<p class="i-uso" id="i-uso"></p>' +
      '<button type="button" class="c-btn" data-i-apagar="" id="i-apagar-tudo"></button>' +
      '<button type="button" class="c-btn" data-hfecha>Fechar</button></div>';
    fundo.classList.add("aberto");
    pintarCat();
    lerGuardadas().then(pintar);
    pintar();
  }
  function fechar() { fundo.classList.remove("aberto"); }
  window.I_abrir = abrir;

  function pintarCat() {
    var el = fundo.querySelector("#i-cat");
    if (!el) return;
    var e = window.CAT_ESTADO ? CAT_ESTADO() : null, h, cls = "i-cat";
    if (!e) h = "…";
    else if (e.carregando) h = "Chegando o catálogo… (" + e.feitos.length + " de " + e.ordem.length + " gêneros)";
    else if (e.falhou.length) { cls += " erro"; h = "⚠ Não chegaram: " + e.falhou.map(rot).join(", ") + '. <button type="button" class="c-btn" data-p-denovo>Tentar de novo</button>'; }
    else { cls += " ok"; h = "✓ Completo: " + mil(e.jogos) + " jogos em " + e.ordem.length + " gêneros. Fica guardado sozinho neste aparelho e abre até sem internet. Com internet, a versão nova chega sozinha."; }
    el.className = cls;
    if (el.innerHTML !== h) el.innerHTML = h;
  }
  function pct(job) { return job.total ? Math.min(100, Math.floor(100 * job.feitos / job.total)) : 100; }
  function pintar() {
    // pílula (fica à vista em qualquer tela enquanto guarda)
    var pt = "";
    if (ativo && !ativo.fim) pt = (ativo.espera ? "⏸ " : "⬇ ") + "Guardando " + rot(ativo.gen) + " " + pct(ativo) + "%" + (fila.length > 1 ? " · +" + (fila.length - 1) : "");
    else if (fila.length) pt = navigator.onLine === false ? "⏸ Guardar imagens: sem internet" : !catalogoPronto() ? "⏳ Guardar imagens: esperando o catálogo" : "⏸ Guardar imagens: " + fila.length + (fila.length === 1 ? " gênero" : " gêneros");
    pilula.hidden = !pt || aberto();
    if (pt && pilula.textContent !== pt) pilula.textContent = pt;
    if (!aberto()) return;
    pintarCat();
    var dados = {}, falta = 0;
    GEN_ORDER.forEach(function (g) { dados[g] = contaGen(g); if (fila.indexOf(g) < 0) falta += dados[g].kb; });
    // andamento
    var pr = fundo.querySelector("#i-prog");
    if (pr) {
      var mostra = !!(ativo && !ativo.fim);
      pr.hidden = !mostra && !fila.length;
      if (mostra) {
        fundo.querySelector("#i-prog-tit").textContent = (ativo.espera ? "⏸ Pausado: " : "Guardando ") + rot(ativo.gen) + " · " + pct(ativo) + "%";
        fundo.querySelector("#i-prog-barra").style.width = pct(ativo) + "%";
        fundo.querySelector("#i-prog-txt").textContent = mil(Math.min(ativo.feitos, ativo.total)) + " de " + mil(ativo.total) + " imagens" +
          (ativo.falhas ? " · " + mil(ativo.falhas) + " não vieram" : "") + (ativo.espera ? " · continua quando você voltar pro app" : "") +
          (fila.length > 1 ? " · depois: " + fila.filter(function (g) { return g !== ativo.gen; }).map(rot).join(", ") : "") + ". Pode fechar este painel.";
      } else if (fila.length) {
        fundo.querySelector("#i-prog-tit").textContent = "Na fila: " + fila.map(rot).join(", ");
        fundo.querySelector("#i-prog-barra").style.width = "0";
        fundo.querySelector("#i-prog-txt").textContent = navigator.onLine === false ? "Sem internet: continua sozinho quando ela voltar." : !catalogoPronto() ? "Começa assim que o catálogo terminar de chegar." : "";
      }
    }
    var bt = fundo.querySelector("#i-todos");
    if (bt) {
      bt.textContent = (ativo || fila.length ? "⬇ Guardar também os outros · ~" : "⬇ Guardar todos os gêneros · ~") + mb(falta * 1024);
      bt.hidden = !falta || !lido;
    }
    var bp = fundo.querySelector("#i-parar");
    if (bp) bp.hidden = !(ativo || fila.length);
    // gêneros
    var box = fundo.querySelector("#i-gens");
    if (box) {
      var h = GEN_ORDER.map(function (g) {
        var d = dados[g], m = meta.g[g], ok = lido && d.total && !d.falta, av = aviso[g];
        if (!d.jogos) return "";
        var info = mil(d.jogos) + (d.jogos === 1 ? " jogo" : " jogos") + " · " + (lido ? mil(d.tem) + " de " + mil(d.total) + " imagens guardadas" : mil(d.total) + " imagens") +
          (m && m.b ? " (" + mb(m.b) + ")" : "");
        if (av) info += ' · <span class="i-erro">' + (av.cheio ? "⚠ sem espaço no aparelho" : av.bloqueado ? "⚠ o servidor de imagens (wsrv.nl) recusou agora: tente mais tarde" : av.semRede ? "⚠ caiu a internet" : "⚠ " + mil(av.falhas) + " não vieram") + "</span>";
        var bts;
        if (ativo && ativo.gen === g && !ativo.fim) bts = '<button type="button" data-i-parar="' + g + '">⏳ ' + pct(ativo) + "% · parar</button>";
        else if (fila.indexOf(g) >= 0) bts = '<button type="button" data-i-parar="' + g + '">Na fila · tirar</button>';
        else if (ok) bts = '<button type="button" disabled>✓ Guardado</button>';
        else bts = '<button type="button" class="i-sim" data-i-guardar="' + g + '">' + (d.tem ? "Guardar o resto" : "Guardar") + " · ~" + mb(d.kb * 1024) + "</button>";
        if (d.tem && !(ativo && ativo.gen === g && !ativo.fim)) bts += '<button type="button" class="i-del" data-i-apagar="' + g + '">' + (confirma === g ? "Toque de novo" : "Apagar") + "</button>";
        return '<div class="i-lin' + (ok ? " ok" : "") + '"><strong>' + esc(rot(g)) + "</strong><small>" + info + '</small><span class="i-bts">' + bts + "</span></div>";
      }).join("");
      if (box.innerHTML !== h) box.innerHTML = h;
    }
    var tt = totais(), uso = fundo.querySelector("#i-uso");
    if (uso) {
      var base = tt.n ? "Guardadas: " + mil(tt.n) + " imagens, " + mb(tt.b) + "." : "Nenhum gênero guardado ainda.";
      uso.textContent = base;
      if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) {
        var p = navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(null);
        return p.then(function (fixo) {
          var t = base + " Tudo o que o app usa neste aparelho (catálogo, capas vistas e guardadas): " + mb(e.usage || 0) +
            (e.quota ? " de " + mb(e.quota) + " disponíveis" : "") + "." +
            (fixo === true ? " ✓ Guardado de vez: o navegador não apaga sozinho." : fixo === false ? " O navegador pode apagar se o aparelho ficar sem espaço." : "");
          var u2 = fundo.querySelector("#i-uso");
          if (u2 && u2.textContent !== t) u2.textContent = t;
        });
      }).catch(function () {});
    }
    var ap = fundo.querySelector("#i-apagar-tudo");
    if (ap) { ap.hidden = !tt.n && !guardadas.size; ap.textContent = confirma === "" ? "Toque de novo pra apagar todas" : "Apagar todas as imagens guardadas"; }
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-i-guardar], [data-i-parar], [data-i-apagar], [data-i-todos], #i-pilula, #i-fundo [data-hfecha]") : null;
    if (!t) { if (e.target === fundo) { fechar(); pintar(); } return; }
    e.preventDefault();
    if (t.id === "i-pilula") { abrir(); return; }
    if (t.hasAttribute("data-hfecha")) { fechar(); pintar(); return; }
    if (t.hasAttribute("data-i-todos")) { guardarTodos(); return; }
    if (t.hasAttribute("data-i-guardar")) { guardar(t.getAttribute("data-i-guardar")); return; }
    if (t.hasAttribute("data-i-parar")) { parar(t.getAttribute("data-i-parar") || null); return; }
    var gen = t.getAttribute("data-i-apagar") || "";
    clearTimeout(tConf);
    if (confirma !== gen) { confirma = gen; tConf = setTimeout(function () { confirma = null; pintar(); }, 6000); pintar(); return; }
    confirma = null;
    apagar(gen || null);
  });
  fundo.addEventListener("change", function (e) {
    if (e.target.id !== "i-fotoscat") return;
    gravar(KF, !!e.target.checked);
    pintar();
  });

  // ---------- o jeito antigo (mod_H): apaga o banco e põe os gêneros que estavam guardados na fila ----------
  (function () {
    var KG = KEY + "-H-gens", velhos = ler(KG, null);
    var fc = null;
    try { fc = localStorage.getItem(KEY + "-H-fotoscat"); } catch (e) {}
    var tinha = velhos !== null || fc !== null || ler(KEY + "-H-fila", null) !== null;
    if (!tinha) return;
    if (Array.isArray(velhos)) velhos.concat(ler(KEY + "-H-fila", []) || []).forEach(function (g) { if (GENRES[g] && fila.indexOf(g) < 0) fila.push(g); });
    if (fc === "1") gravar(KF, true);
    ["-H-gens", "-H-fila", "-H-fundo", "-H-fotoscat"].forEach(function (s) { try { localStorage.removeItem(KEY + s); } catch (e) {} });
    try { indexedDB.deleteDatabase(KEY + "-H-img"); } catch (e) {}
    salvaFila();
  })();

  // pede pro navegador não apagar o que o app guardou (catálogo e imagens)
  pedirPersistir();
  if (fila.length) setTimeout(proximo, 1500);   // continua de onde parou (espera o catálogo, se ainda estiver chegando)
  pintar();
})();

