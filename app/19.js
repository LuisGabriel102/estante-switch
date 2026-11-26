/* mod_G_sync.js */
// Sincroniza as marcações entre o celular e o PC usando um gist SECRETO do GitHub do próprio dono.
// - o token fica só neste aparelho (localStorage), nunca no código
// - cada item (estrela, marcação, plano, playlist, dispensado...) guarda a data da última mudança,
//   e as remoções viram "lápides" com data; a junção é item a item, pelo mais recente
// - ao abrir e ao voltar pra aba: baixa e junta; depois de cada mudança: envia (4 s); sem internet: envia depois
(function () {
  "use strict";
  var ARQ = "estante-switch-sync.json";
  var K_META = KEY + "-sync-meta", K_TOK = KEY + "-sync-token", K_GIST = KEY + "-sync-gist", K_API = KEY + "-sync-api", K_LOGIN = KEY + "-sync-login";
  var LINK_TOKEN = "https://github.com/settings/tokens/new?scopes=gist&description=Estante%20do%20Switch";
  // só para teste: um servidor falso local no lugar do api.github.com (só aceita endereço deste computador)
  var API = "https://api.github.com";
  try { var apiT = localStorage.getItem(K_API); if (apiT && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiT)) API = apiT; } catch (e) {}

  // ---------- o que vai pra nuvem (lista configurável) ----------
  // tipo: "principal" (a chave do app), "lista" (array de ids), "objeto" (id -> valor), "valor" (o texto inteiro)
  // recarga: o módulo guarda isso na memória ao abrir; se a nuvem mudar, a página recarrega (o mod_S volta ao mesmo lugar)
  var CHAVES = [
    {k: KEY, tipo: "principal"},
    {k: KEY + "-R-nao", tipo: "lista", recarga: true},       // recomendações dispensadas (mod_R)
    {k: KEY + "-D-pulados", tipo: "lista", recarga: true},   // jogos pulados
    {k: KEY + "-B-notas", tipo: "objeto", recarga: true},    // notas da ficha
    {k: KEY + "-R-soRom", tipo: "valor", recarga: true},     // "só com romance" das recomendações
    {k: KEY + "-guardados", tipo: "objeto"}                  // jogos do catálogo marcados (aparecem sem o gênero baixado)
  ];
  // chaves futuras entram sozinhas se o nome bater (ex.: modo tinder): tipo descoberto pelo conteúdo
  var PADROES = [/^estante-switch-v1-(tinder|T)-/];
  // outro módulo pode pedir: (window.G_SYNC_CHAVES = window.G_SYNC_CHAVES || []).push({k: KEY + "-X", tipo: "lista", recarga: true})
  (window.G_SYNC_CHAVES || []).forEach(function (c) { if (c && typeof c.k === "string") CHAVES.push(c); });
  window.G_SYNC_CHAVES = {push: function (c) { if (c && typeof c.k === "string" && !acharChave(c.k)) CHAVES.push(c); }};

  function apelido(k) { return k === KEY ? "m" : k.slice(KEY.length + 1); }
  function acharChave(k) {
    if (typeof k !== "string" || k.indexOf(KEY) !== 0 || k.indexOf(KEY + "-sync-") === 0) return null;
    for (var i = 0; i < CHAVES.length; i++) if (CHAVES[i].k === k) return CHAVES[i];
    for (var j = 0; j < PADROES.length; j++) if (PADROES[j].test(k)) { var c = {k: k, tipo: "auto", recarga: true}; CHAVES.push(c); return c; }
    return null;
  }

  // ---------- ajudantes ----------
  var setOrig = Storage.prototype.setItem, remOrig = Storage.prototype.removeItem;
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { if (v == null) remOrig.call(localStorage, k); else setOrig.call(localStorage, k, v); return true; } catch (e) { return false; } }
  function parse(t) { try { return JSON.parse(t); } catch (e) { return undefined; } }
  function estavel(v) {
    if (v === undefined) return "";
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(estavel).join(",") + "]";
    return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + estavel(v[k]); }).join(",") + "}";
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function lerMeta() {
    var m = parse(ler(K_META) || "null");
    if (!m || typeof m !== "object" || !m.itens || typeof m.itens !== "object") m = {itens: {}, ini: false, seq: 0, pend: false, ult: 0};
    return m;
  }
  function gravarMeta(m) { gravar(K_META, JSON.stringify(m)); }

  // ---------- desmonta cada chave em itens ----------
  function tipoDe(c, txt) {
    if (c.tipo !== "auto") return c.tipo;
    var o = parse(txt);
    if (Array.isArray(o) && o.every(function (x) { return typeof x === "string"; })) return "lista";
    if (o && typeof o === "object" && !Array.isArray(o)) return "objeto";
    return "valor";
  }
  function achatar(c, txt) {
    var r = {};
    if (txt == null) return r;
    var t = tipoDe(c, txt), o = parse(txt);
    if (t === "valor") { r[""] = txt; return r; }
    if (o === undefined || o === null) return r;
    if (t === "lista") { if (Array.isArray(o)) o.forEach(function (x) { r[typeof x === "string" ? x : estavel(x)] = 1; }); return r; }
    if (t === "objeto") { if (typeof o === "object" && !Array.isArray(o)) Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
    // principal
    (Array.isArray(o.sel) ? o.sel : []).forEach(function (id) { if (typeof id === "string") r["sel|" + id] = 1; });
    (Array.isArray(o.fav) ? o.fav : []).forEach(function (id) { if (typeof id === "string") r["fav|" + id] = 1; });
    ["pl", "mt"].forEach(function (k) { if (o[k] && typeof o[k] === "object") Object.keys(o[k]).forEach(function (id) { r[k + "|" + id] = o[k][id]; }); });
    if (typeof o.cap === "number") r.cap = o.cap;
    (Array.isArray(o.pls) ? o.pls : []).forEach(function (p) {
      if (!p || typeof p.id !== "string" || !Array.isArray(p.j)) return;
      r["pls|" + p.id] = {n: String(p.n || ""), o: p.j.filter(function (id) { return typeof id === "string"; })};
      p.j.forEach(function (id) { if (typeof id === "string") r["plj|" + p.id + "|" + id] = 1; });
    });
    return r;
  }
  // monta o texto da chave a partir dos itens vivos, mantendo a ordem e os campos locais (view, agrupar...)
  function montar(c, vivos, txtLocal) {
    var t = tipoDe(c, txtLocal), o = parse(txtLocal);
    var subs = Object.keys(vivos);
    if (c.tipo === "auto" && txtLocal == null) {
      // chave nova vinda da nuvem: descobre o tipo pelo formato dos itens
      t = subs.length === 1 && subs[0] === "" ? "valor" : subs.every(function (s) { return vivos[s] === 1; }) ? "lista" : "objeto";
    }
    if (t === "valor") return "" in vivos ? String(vivos[""]) : null;
    if (t === "lista") {
      if (!subs.length && txtLocal == null) return null;
      var out = [], tem = {};
      (Array.isArray(o) ? o : []).forEach(function (x) { var s = typeof x === "string" ? x : estavel(x); if (s in vivos && !tem[s]) { tem[s] = 1; out.push(x); } });
      subs.forEach(function (s) { if (!tem[s]) { tem[s] = 1; out.push(s); } });
      return JSON.stringify(out);
    }
    if (t === "objeto") {
      if (!subs.length && txtLocal == null) return null;
      var ob = {};
      Object.keys(o && typeof o === "object" ? o : {}).forEach(function (k) { if (k in vivos) ob[k] = vivos[k]; });
      subs.forEach(function (k) { if (!(k in ob)) ob[k] = vivos[k]; });
      return JSON.stringify(ob);
    }
    // principal
    var base = o && typeof o === "object" ? o : {};
    var n = {};
    Object.keys(base).forEach(function (k) { n[k] = base[k]; });
    var porTipo = {sel: [], fav: [], pl: [], mt: [], pls: [], plj: []};
    subs.forEach(function (s) { var i = s.indexOf("|"); if (i > 0 && porTipo[s.slice(0, i)]) porTipo[s.slice(0, i)].push(s.slice(i + 1)); });
    ["sel", "fav"].forEach(function (k) {
      var out = [], tem = {};
      (Array.isArray(base[k]) ? base[k] : []).forEach(function (id) { if (vivos[k + "|" + id] !== undefined && !tem[id]) { tem[id] = 1; out.push(id); } });
      porTipo[k].forEach(function (id) { if (!tem[id]) { tem[id] = 1; out.push(id); } });
      n[k] = out;
    });
    ["pl", "mt"].forEach(function (k) {
      var ob = {};
      porTipo[k].forEach(function (id) { ob[id] = vivos[k + "|" + id]; });
      n[k] = ob;
    });
    if ("cap" in vivos) n.cap = vivos.cap;
    var membros = {};
    porTipo.plj.forEach(function (s) { var i = s.lastIndexOf("|"); var pid = s.slice(0, i); (membros[pid] = membros[pid] || []).push(s.slice(i + 1)); });
    var pls = [], temP = {};
    function umaPl(pid) {
      if (temP[pid] || !vivos["pls|" + pid]) return;
      temP[pid] = 1;
      var p = vivos["pls|" + pid], ms = membros[pid] || [], j = [], tj = {};
      (Array.isArray(p.o) ? p.o : []).forEach(function (id) { if (ms.indexOf(id) >= 0 && !tj[id]) { tj[id] = 1; j.push(id); } });
      ms.forEach(function (id) { if (!tj[id]) { tj[id] = 1; j.push(id); } });
      pls.push({id: pid, n: String(p.n || ""), j: j});
    }
    (Array.isArray(base.pls) ? base.pls : []).forEach(function (p) { if (p && typeof p.id === "string") umaPl(p.id); });
    porTipo.pls.forEach(umaPl);
    n.pls = pls;
    n.plsIni = true; n.c256 = true;
    return JSON.stringify(n);
  }

  // ---------- registra as mudanças deste aparelho (compara com o que já estava anotado) ----------
  function registrar(m, c, txt) {
    var al = apelido(c.k) + "|", F = achatar(c, txt), agora = Date.now(), base = m.ini ? agora : 0, mudou = false;
    Object.keys(F).forEach(function (s) {
      var id = al + s, cur = m.itens[id];
      if (!cur || cur.d || estavel(cur.v) !== estavel(F[s])) { m.itens[id] = {t: base, v: F[s]}; mudou = true; }
    });
    Object.keys(m.itens).forEach(function (id) {
      if (id.indexOf(al) !== 0 || m.itens[id].d) return;
      if (!(id.slice(al.length) in F)) { m.itens[id] = {t: base, d: 1}; mudou = true; }
    });
    if (mudou && m.ini) { m.seq = (m.seq || 0) + 1; m.pend = true; }
    return mudou;
  }
  function conferirTudo() {
    var m = lerMeta(), mudou = false;
    // chaves que batem com os padrões e já existem neste aparelho
    try { for (var i = 0; i < localStorage.length; i++) acharChave(localStorage.key(i)); } catch (e) {}
    CHAVES.forEach(function (c) { if (registrar(m, c, ler(c.k))) mudou = true; });
    if (!m.ini) { m.ini = true; mudou = true; }
    if (mudou) gravarMeta(m);
    return m;
  }
  var aplicando = false;
  function aoGravar(k, v) {
    if (aplicando) return;
    var c = acharChave(k);
    if (!c) return;
    var m = lerMeta();
    if (!m.ini) { conferirTudo(); m = lerMeta(); }
    if (registrar(m, c, v)) { gravarMeta(m); if (conectado()) { mostrar(); agendar(4000); } }
  }
  // todo localStorage.setItem/removeItem passa por aqui: pega o save() do app e os módulos (antes x depois)
  Storage.prototype.setItem = function (k, v) {
    var r = setOrig.apply(this, arguments);
    if (this === localStorage) { try { aoGravar(String(k), String(v)); } catch (e) { console.warn("sync:", e); } }
    return r;
  };
  Storage.prototype.removeItem = function (k) {
    var r = remOrig.apply(this, arguments);
    if (this === localStorage) { try { aoGravar(String(k), null); } catch (e) { console.warn("sync:", e); } }
    return r;
  };
  // e o save() do app, para o caso de alguém gravar sem setItem
  var saveAntG = save;
  save = function () {
    var r = saveAntG.apply(this, arguments);
    try { var m = lerMeta(); if (m.ini && registrar(m, CHAVES[0], ler(KEY))) { gravarMeta(m); if (conectado()) agendar(4000); } } catch (e) {}
    return r;
  };

  // ---------- junção item a item ----------
  function vence(a, b) {   // a = deste aparelho, b = da nuvem; devolve o que fica
    if (!a) return b;
    if (!b) return a;
    if (a.t !== b.t) return a.t > b.t ? a : b;
    if (!!a.d !== !!b.d) return a.d ? b : a;   // empate: quem tem o item ganha da lápide
    return b;
  }
  function igual(a, b) { return !!a && !!b && a.t === b.t && !!a.d === !!b.d && estavel(a.v) === estavel(b.v); }
  function juntar(L, R) {
    var out = {}, mudLocal = {}, difRemoto = false;
    Object.keys(L).concat(Object.keys(R)).forEach(function (id) {
      if (id in out) return;
      var w = vence(L[id], R[id]);
      out[id] = w;
      if (!igual(w, L[id])) mudLocal[id.slice(0, id.indexOf("|"))] = 1;
      if (!igual(w, R[id])) difRemoto = true;
    });
    return {itens: out, mudLocal: mudLocal, difRemoto: difRemoto};
  }
  function vivosDe(itens, al) {
    var v = {}, p = al + "|";
    Object.keys(itens).forEach(function (id) { if (id.indexOf(p) === 0 && !itens[id].d) v[id.slice(p.length)] = itens[id].v; });
    return v;
  }
  function chavePorApelido(al) {
    for (var i = 0; i < CHAVES.length; i++) if (apelido(CHAVES[i].k) === al) return CHAVES[i];
    if (al && al !== "m") return acharChave(KEY + "-" + al);
    return null;
  }
  function podeRecarregar() {
    if (document.querySelector("dialog[open]")) return false;
    var a = document.activeElement;
    return !(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA") && a.type !== "checkbox");
  }
  // escreve no aparelho o que veio da nuvem; devolve true se precisa recarregar a página
  function aplicarLocal(res, mAntes) {
    var recarga = false, principal = false, adiadas = {};
    Object.keys(res.mudLocal).forEach(function (al) {
      var c = chavePorApelido(al);
      if (!c) { adiadas[al] = 1; return; }
      if (c.recarga && !podeRecarregar()) { adiadas[al] = 1; return; }
    });
    // itens das chaves adiadas continuam como estavam aqui (na próxima vez entram)
    var m = lerMeta(), novos = {};
    Object.keys(res.itens).forEach(function (id) {
      var al = id.slice(0, id.indexOf("|"));
      if (adiadas[al]) { if (m.itens[id]) novos[id] = m.itens[id]; } else novos[id] = res.itens[id];
    });
    m.itens = novos;
    gravarMeta(m);
    aplicando = true;
    try {
      Object.keys(res.mudLocal).forEach(function (al) {
        if (adiadas[al]) return;
        var c = chavePorApelido(al), txt = ler(c.k), novo = montar(c, vivosDe(novos, al), txt);
        if (estavel(achatar(c, novo)) === estavel(achatar(c, txt)) && (novo == null) === (txt == null)) return;
        gravar(c.k, novo);
        if (c.k === KEY) principal = true; else if (c.recarga) recarga = true;
      });
    } finally { aplicando = false; }
    if (principal && !recarga) atualizarApp();
    return {recarga: recarga, adiou: Object.keys(adiadas).length > 0};
  }
  // a chave principal mudou: lê de novo e redesenha, sem recarregar a página
  function atualizarApp() {
    state.sel = new Set(); state.fav = new Set(); state.pl = {}; state.mt = {}; state.pls = [];
    FORA.sel = []; FORA.fav = []; FORA.pl = {}; FORA.mt = {}; FORA.pls = {};
    load();
    if (state.plAtiva && !state.pls.some(function (p) { return p.id === state.plAtiva; })) state.plAtiva = null;
    [renderResumo, renderTiles, renderMeter, renderPlaylists, renderList].forEach(function (f) { try { f(); } catch (e) { console.warn("sync:", e); } });
    document.querySelectorAll("[data-fav]").forEach(function (x) {
      var on = state.fav.has(x.dataset.fav);
      x.setAttribute("aria-pressed", String(on));
      x.textContent = x.classList.contains("fav-ficha") ? (on ? "★ Tenho interesse" : "☆ Tenho interesse") : (on ? "★" : "☆");
    });
    document.querySelectorAll("input[data-id]").forEach(function (c) { c.checked = state.sel.has(c.dataset.id); });
    try { document.dispatchEvent(new CustomEvent("estante-sync")); } catch (e) {}
  }

  // ---------- conversa com o GitHub ----------
  function Erro(tipo, msg) { var e = new Error(msg); e.tipo = tipo; return e; }
  function token() { var t = ler(K_TOK); return t && t.length > 10 ? t : null; }
  function conectado() { return !!token(); }
  function pedir(metodo, caminho, corpo, leve) {
    var op = {method: metodo, cache: "no-store", headers: {"Authorization": "token " + token(), "Accept": "application/vnd.github+json"}};
    if (corpo !== undefined) { op.body = JSON.stringify(corpo); op.headers["Content-Type"] = "application/json"; if (leve && op.body.length < 60000) op.keepalive = true; }
    return fetch(API + caminho, op).catch(function () { throw Erro("rede", "sem internet"); }).then(function (r) {
      if (r.ok) return r.status === 204 ? null : r.json();
      if (r.status === 401) throw Erro("token", "O GitHub recusou o token (errado, apagado ou vencido).");
      if (r.status === 403 && r.headers.get("x-ratelimit-remaining") === "0") throw Erro("limite", "O GitHub pediu uma pausa. Tenta de novo em uma hora.");
      if (r.status === 403 || (r.status === 404 && (metodo === "POST" || caminho.indexOf("/gists?") === 0))) throw Erro("permissao", 'O token não tem a permissão "gist". Crie outro pelo link, com a caixinha "gist" marcada.');
      if (r.status === 404) throw Erro("sumiu", "gist não encontrado");
      if (r.status === 422) throw Erro("erro", "O GitHub não aceitou os dados (" + r.status + ").");
      throw Erro("erro", "O GitHub respondeu com erro " + r.status + ".");
    });
  }
  function acharGist() {
    var id = ler(K_GIST);
    if (id) return Promise.resolve(id);
    var achado = null;
    function pagina(n) {
      return pedir("GET", "/gists?per_page=100&page=" + n).then(function (lista) {
        (lista || []).forEach(function (g) {
          if (g && g.files && g.files[ARQ] && (!achado || String(g.updated_at) > String(achado.updated_at))) achado = g;
        });
        if (lista && lista.length === 100 && n < 30) return pagina(n + 1);
      });
    }
    return pagina(1).then(function () {
      if (achado) { gravar(K_GIST, achado.id); return achado.id; }
      return null;
    });
  }
  function baixar(id) {
    return pedir("GET", "/gists/" + encodeURIComponent(id)).then(function (g) {
      var f = g && g.files && g.files[ARQ];
      if (!f) return {itens: {}};
      var conteudo = f.truncated && f.raw_url
        ? fetch(f.raw_url, {cache: "no-store"}).catch(function () { throw Erro("rede", "sem internet"); }).then(function (r) { if (!r.ok) throw Erro("erro", "não deu pra ler o arquivo da nuvem"); return r.text(); })
        : Promise.resolve(f.content || "");
      return conteudo.then(function (txt) {
        if (!txt.trim()) return {itens: {}};
        var o = parse(txt);
        if (!o || typeof o !== "object" || !o.itens || typeof o.itens !== "object") throw Erro("estragado", "O arquivo da nuvem não está no formato da Estante. Nada foi mudado.");
        return o;
      });
    });
  }
  function docDe(itens) {
    var limite = Date.now() - 400 * 864e5, it = {};
    Object.keys(itens).forEach(function (id) { var x = itens[id]; if (!(x.d && x.t && x.t < limite)) it[id] = x; });   // lápides com mais de 400 dias saem
    return JSON.stringify({app: "Estante do Switch", v: 1, upd: Date.now(), itens: it});
  }
  function criar(conteudo) {
    return pedir("POST", "/gists", {description: "Estante do Switch: marcações (sincronização entre aparelhos; não apague)", public: false, files: arquivo(conteudo)})
      .then(function (g) { gravar(K_GIST, g.id); return g.id; });
  }
  function arquivo(conteudo) { var f = {}; f[ARQ] = {content: conteudo}; return f; }
  function enviar(id, conteudo, leve) {
    return pedir("PATCH", "/gists/" + encodeURIComponent(id), {files: arquivo(conteudo)}, leve);
  }

  // ---------- o ciclo: confere, baixa, junta, aplica, envia ----------
  var estado = {fase: conectado() ? "ok" : "off", msg: ""}, andando = false, deNovo = false, timer = 0, ultTent = 0, recargas = 0;
  function agendar(ms) { clearTimeout(timer); timer = setTimeout(function () { sincronizar("mudança"); }, ms); }
  function sincronizar(motivo, leve) {
    if (!conectado()) return Promise.resolve();
    if (andando) { deNovo = true; return Promise.resolve(); }
    andando = true; ultTent = Date.now(); clearTimeout(timer);
    var m0 = conferirTudo(), seq = m0.seq || 0, id = null;
    estado.fase = m0.pend ? "enviando" : "conferindo"; mostrar();
    return acharGist().then(function (gid) {
      if (!gid) {   // primeira vez nesta conta: cria o gist com o que tem aqui
        estado.fase = "enviando"; mostrar();
        return criar(docDe(lerMeta().itens)).then(function (nid) { id = nid; return {criou: true}; });
      }
      id = gid;
      return baixar(gid).catch(function (e) {
        if (e.tipo !== "sumiu") throw e;
        gravar(K_GIST, null);                    // o gist foi apagado: procura outro ou cria de novo
        return acharGist().then(function (g2) {
          if (g2) { id = g2; return baixar(g2); }
          return criar(docDe(lerMeta().itens)).then(function (nid) { id = nid; return {criou: true}; });
        });
      });
    }).then(function (remoto) {
      if (remoto.criou) return {recarga: false};
      var m = lerMeta(), res = juntar(m.itens, remoto.itens || {});
      var ap = aplicarLocal(res, m);
      seq = lerMeta().seq || 0;
      var precisa = res.difRemoto || lerMeta().pend;
      if (!precisa) return ap;
      estado.fase = "enviando"; mostrar();
      return enviar(id, docDe(res.itens), leve).then(function () { return ap; });
    }).then(function (ap) {
      var m = lerMeta();
      if ((m.seq || 0) === seq) m.pend = false;
      m.ult = Date.now();
      gravarMeta(m);
      estado.fase = "ok"; estado.msg = "";
      andando = false;
      if (m.pend || deNovo) { deNovo = false; agendar(800); }
      if (ap && ap.adiou) agendar(8000);
      mostrar();
      if (ap && ap.recarga) {
        // dados de um módulo mudaram: recarrega uma vez (o mod_S volta pro mesmo lugar)
        var n = 0; try { n = Number(sessionStorage.getItem(KEY + "-sync-rec") || 0); } catch (e) {}
        if (n < 3) { try { sessionStorage.setItem(KEY + "-sync-rec", String(n + 1)); } catch (e) {} location.reload(); }
      } else { try { sessionStorage.removeItem(KEY + "-sync-rec"); } catch (e) {} }
    }).catch(function (e) {
      andando = false;
      estado.fase = e.tipo === "rede" ? "offline" : e.tipo === "token" || e.tipo === "permissao" ? "token" : "erro";
      estado.msg = e.tipo === "rede" ? "" : e.message;
      if (!e.tipo) console.warn("sync:", e);
      mostrar();
      if (e.tipo === "rede" || e.tipo === "erro" || e.tipo === "limite") agendar(e.tipo === "limite" ? 3600e3 : 60000);
    });
  }

  // ---------- botão no topo + janela ----------
  var css = document.createElement("style");
  css.textContent =
    ".g-btn { white-space: nowrap; }" +
    '.g-btn[data-fase="ok"] { color: var(--pt); border-color: var(--pt); background: var(--pt-bg); }' +
    '.g-btn[data-fase="conferindo"], .g-btn[data-fase="enviando"] { color: var(--muted); }' +
    '.g-btn[data-fase="offline"] { color: var(--warn); border-color: var(--warn); }' +
    '.g-btn[data-fase="token"], .g-btn[data-fase="erro"] { color: var(--veto); border-color: var(--veto); background: var(--veto-bg); font-weight: 600; }' +
    "#g-dlg { padding: 0; border: 0; border-radius: 16px; width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); background: var(--surface); color: var(--ink); box-shadow: 0 20px 60px rgba(0,0,0,.35); }" +
    "#g-dlg::backdrop { background: rgba(10,14,20,.55); }" +
    "#g-dlg p { margin: 0; }" +
    ".g-passos { margin: 0; padding-left: 22px; display: grid; gap: 8px; }" +
    ".g-passos a, #g-dlg p a { color: var(--accent); font-weight: 600; }" +
    ".g-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 8px; align-items: center; }" +
    ".g-form label { grid-column: 1 / -1; font-weight: 600; }" +
    ".g-form input { min-width: 0; min-height: 44px; padding: 8px 12px; font: inherit; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--ink); }" +
    ".g-form input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }" +
    ".g-sim { min-height: 44px; font-weight: 600; background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }" +
    ".g-bts { display: flex; flex-wrap: wrap; gap: 8px; }" +
    ".g-sair { min-height: 44px; color: var(--veto); }" +
    ".g-mask { font-family: ui-monospace, Consolas, monospace; font-size: 14px; background: var(--bg); padding: 2px 6px; border-radius: 6px; }" +
    '.g-st { font-weight: 600; color: var(--pt); } .g-st[data-fase="token"], .g-st[data-fase="erro"] { color: var(--veto); } .g-st[data-fase="offline"] { color: var(--warn); }';
  document.head.appendChild(css);
  function quando(t) {
    if (!t) return "";
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return "agora mesmo";
    var mi = Math.round(s / 60);
    if (mi < 60) return "há " + mi + " min";
    var h = Math.round(mi / 60);
    if (h < 24) return "há " + h + " h";
    var d = Math.round(h / 24);
    return d === 1 ? "ontem" : "há " + d + " dias";
  }
  function mascarar(t) { return t.length > 12 ? t.slice(0, 4) + "••••••••" + t.slice(-4) : "••••••••"; }
  function textoEstado() {
    var m = lerMeta();
    switch (estado.fase) {
      case "off": return "☁️ Sincronizar";
      case "conferindo": return "☁️ conferindo…";
      case "enviando": return "☁️ enviando…";
      case "offline": return m.pend ? "☁️ sem internet: envia depois" : "☁️ sem internet";
      case "token": return "☁️ token recusado: toque aqui";
      case "erro": return "☁️ erro ao sincronizar";
      default: return m.pend ? "☁️ falta enviar" : "☁️ sincronizado " + (quando(m.ult) || "");
    }
  }
  var caixa = document.getElementById("p-pac") || document.querySelector("header");
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn g-btn"; btn.id = "g-abrir";
  btn.setAttribute("aria-haspopup", "dialog");
  if (caixa) caixa.appendChild(btn);
  var dlg = document.createElement("dialog");
  dlg.id = "g-dlg"; dlg.setAttribute("aria-labelledby", "g-tit");
  document.body.appendChild(dlg);

  function mostrar() {
    if (!btn) return;
    btn.textContent = textoEstado();
    btn.dataset.fase = estado.fase;
    btn.title = estado.msg || "Sincronizar as marcações entre o celular e o PC";
    if (dlg.open) desenhar();
  }
  function desenhar() {
    var t = token(), m = lerMeta(), login = ler(K_LOGIN);
    var html = '<div class="p-in"><div class="p-topo"><h2 id="g-tit">☁️ Celular e PC juntos</h2><button type="button" class="p-x" data-g-fechar aria-label="Fechar">✕</button></div>';
    if (!t) {
      html += "<p>Suas estrelas, marcações, planos, playlists e dispensados ficam iguais no celular e no PC. Elas ficam guardadas num arquivo secreto na sua conta do GitHub. Faça isso uma vez em cada aparelho:</p>" +
        '<ol class="g-passos">' +
        '<li>Abra o link e entre na sua conta do GitHub: <a href="' + LINK_TOKEN + '" target="_blank" rel="noopener">criar o código de acesso</a>.</li>' +
        '<li>Em <b>Expiration</b>, escolha <b>No expiration</b>. A caixinha <b>gist</b> já vem marcada: não marque mais nada.</li>' +
        '<li>Desça e toque no botão verde <b>Generate token</b>. Copie o código que aparece (começa com <b>ghp_</b>).</li>' +
        "<li>Cole o código aqui embaixo e toque em <b>Conectar</b>.</li>" +
        "<li>No outro aparelho, abra a Estante, toque em ☁️ e cole o mesmo código (ou crie outro do mesmo jeito).</li></ol>" +
        '<form class="g-form" data-g-form><label for="g-tok">Código de acesso</label>' +
        '<input id="g-tok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ghp_..." required>' +
        '<button type="submit" class="btn g-sim">Conectar</button></form>' +
        (estado.msg ? '<p class="p-erro" role="alert">' + esc(estado.msg) + "</p>" : "") +
        '<p class="fine">O código fica só neste aparelho e só serve para esse arquivo. Guarde-o num lugar seu (no Keep ou numa mensagem para você mesmo) para colar no outro aparelho.</p>';
    } else {
      html += "<p>" + (login ? "Conectado à conta <b>" + esc(login) + "</b>" : "Conectado") + ' com o código <code class="g-mask">' + esc(mascarar(t)) + "</code>.</p>" +
        '<p class="g-st" data-fase="' + estado.fase + '" role="status">' + esc(estado.fase === "token" ? "☁️ Parado: o código não vale mais" : textoEstado()) + "</p>" +
        (estado.msg ? '<p class="p-erro" role="alert">' + esc(estado.msg) + "</p>" : "") +
        (estado.fase === "token" ? '<p>Crie outro código pelo <a href="' + LINK_TOKEN + '" target="_blank" rel="noopener">link do GitHub</a>, toque em <b>Desconectar</b> e cole o novo.</p>' : "") +
        "<p>Tudo o que você muda aqui vai sozinho para a nuvem em poucos segundos; ao abrir a Estante, ela pega o que você mudou no outro aparelho. Se os dois mudaram, fica a mudança mais nova de cada jogo.</p>" +
        '<div class="g-bts"><button type="button" class="btn g-sim" data-g-agora>Sincronizar agora</button>' +
        '<button type="button" class="btn g-sair" data-g-sair>Desconectar</button></div>' +
        '<p class="fine">Desconectar só tira o código deste aparelho: as marcações continuam aqui e na nuvem.' + (m.ult ? " Última vez: " + esc(new Date(m.ult).toLocaleString("pt-BR")) + "." : "") + "</p>";
    }
    dlg.innerHTML = html + "</div>";
  }
  function conectar(t) {
    t = String(t || "").replace(/\s+/g, "");
    if (t.length < 20) { estado.msg = "Esse código está curto demais. Copie ele inteiro (começa com ghp_ ou github_pat_)."; desenhar(); return; }
    gravar(K_TOK, t); gravar(K_GIST, null); gravar(K_LOGIN, null);
    estado.msg = ""; estado.fase = "conferindo"; mostrar(); desenhar();
    pedir("GET", "/user").then(function (u) { if (u && u.login) gravar(K_LOGIN, String(u.login)); }).then(function () {
      return sincronizar("conectar");
    }).catch(function (e) {
      if (e.tipo === "token") { gravar(K_TOK, null); estado.fase = "off"; estado.msg = "O GitHub não aceitou esse código. Confira se copiou ele inteiro, ou crie outro pelo link."; }
      else if (e.tipo === "rede") { estado.fase = "offline"; estado.msg = "Sem internet agora. O código ficou guardado; a Estante tenta de novo sozinha."; agendar(30000); }
      else { estado.fase = "erro"; estado.msg = e.message; }
      mostrar(); desenhar();
    });
  }
  btn.addEventListener("click", function () { desenhar(); if (!dlg.open) dlg.showModal(); var i = dlg.querySelector("#g-tok"); if (i) i.focus(); });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) { dlg.close(); return; }
    var b = e.target.closest ? e.target.closest("button") : null;
    if (!b) return;
    if (b.hasAttribute("data-g-fechar")) dlg.close();
    else if (b.hasAttribute("data-g-agora")) { estado.msg = ""; sincronizar("botão"); }
    else if (b.hasAttribute("data-g-sair")) {
      gravar(K_TOK, null); gravar(K_GIST, null); gravar(K_LOGIN, null);
      estado.fase = "off"; estado.msg = ""; clearTimeout(timer); mostrar(); desenhar();
    }
  });
  dlg.addEventListener("close", function () { if (conectado() && !andando) agendar(600); });
  dlg.addEventListener("submit", function (e) { e.preventDefault(); var i = dlg.querySelector("#g-tok"); conectar(i ? i.value : ""); });

  // ---------- quando sincronizar ----------
  document.addEventListener("visibilitychange", function () {
    if (!conectado()) return;
    if (document.visibilityState === "visible") { if (Date.now() - ultTent > 5000) sincronizar("voltou"); }
    else if (lerMeta().pend) sincronizar("saiu", true);
  });
  window.addEventListener("pagehide", function () { if (conectado() && lerMeta().pend && !andando) sincronizar("saiu", true); });
  window.addEventListener("focus", function () { if (conectado() && Date.now() - ultTent > 20000) sincronizar("foco"); });
  window.addEventListener("online", function () { if (conectado()) sincronizar("voltou a internet"); });
  setInterval(function () {
    if (!conectado() || document.visibilityState !== "visible") return;
    if (Date.now() - ultTent > 180000) sincronizar("de tempos em tempos"); else mostrar();
  }, 30000);
  window.addEventListener("storage", function (e) { if (e.key === K_TOK) { estado.fase = conectado() ? "ok" : "off"; mostrar(); } });

  // ---------- começa ----------
  conferirTudo();
  mostrar();
  if (conectado()) sincronizar("abriu");
  window.G_sync = {sincronizar: sincronizar, estado: function () { return {fase: estado.fase, msg: estado.msg, meta: lerMeta()}; }};
})();

