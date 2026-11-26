/* mod_V_tradutor.js */
// "📚 Minhas traduções" + "📖 Glossário": histórico das suas traduções e os termos fixados por série.
// O site público só traz a TELA. Os dados entram por um arquivo .json importado e ficam SÓ neste aparelho.
// A chave NÃO começa com KEY ("estante-switch-v1"): o mod_G_sync só olha chaves com esse começo
// (lista CHAVES, PADROES e G_SYNC_CHAVES), então estes dados nunca vão pra nuvem. Não mude o nome.
// Leve: sem dados, só cria o botão. Com dados, o índice é por id (a ficha não varre o DATA);
// as capas são achadas numa passada só quando a tela abre (e nos jogos do catálogo que chegam depois).
(function () {
  "use strict";
  var CHAVE = "estante-tradutor-local";
  var ST = {
    "pronta": {l: "Pronta", c: "pt"},
    "revisando": {l: "Revisando", c: "pronta"},
    "em andamento": {l: "Em andamento", c: "sua"},
    "adiada": {l: "Adiada", c: "espera"},
    "parada": {l: "Parada", c: "veto"}
  };
  var ORDEM_ST = ["pronta", "revisando", "em andamento", "adiada", "parada"];
  var MAX_GL = 150;

  var css = document.createElement("style");
  css.textContent = [
    "#v-dlg{padding:0;border:0;border-radius:16px;width:min(640px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:var(--surface);color:var(--ink);box-shadow:0 20px 60px rgba(0,0,0,.35)}",
    "#v-dlg::backdrop{background:rgba(10,14,20,.55)}",
    ".v-in{padding:16px 18px 20px;display:grid;gap:12px}",
    ".v-topo{display:flex;justify-content:space-between;align-items:center;gap:12px}",
    ".v-topo h2{font-size:21px;margin:0}",
    ".v-x{flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:17px;cursor:pointer}",
    ".v-abas{display:flex;gap:6px;border-bottom:1px solid var(--line)}",
    ".v-aba{font:inherit;font-weight:600;border:0;background:none;color:var(--muted);padding:8px 10px;border-bottom:3px solid transparent;cursor:pointer;margin-bottom:-1px}",
    ".v-aba[aria-selected=true]{color:var(--accent);border-bottom-color:var(--accent)}",
    ".v-in > p{margin:0;color:var(--muted)}",
    ".v-vazio{display:grid;gap:10px;padding:6px 0}",
    ".v-vazio p{margin:0}",
    ".v-imp{display:inline-flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-weight:600;padding:11px 14px;border-radius:12px;border:0;background:var(--accent);color:var(--accent-ink);cursor:pointer;justify-self:start}",
    ".v-msg{margin:0;font-size:14px}",
    ".v-msg.erro{color:var(--veto)}",
    ".v-msg.ok{color:var(--pt)}",
    ".v-filtros{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}",
    ".v-filtros input,.v-filtros select,.v-fgl input{font:inherit;font-size:16px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);min-width:0}",
    ".v-tot{font-size:14px;color:var(--muted);margin:0}",
    ".v-lista{display:grid;gap:10px}",
    ".v-lin{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;padding:10px;border:1px solid var(--line);border-radius:12px}",
    ".v-capa{width:64px;height:64px;padding:0;border:0;border-radius:10px;overflow:hidden;background:var(--line);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--muted)}",
    ".v-capa[disabled]{cursor:default}",
    ".v-capa img{width:100%;height:100%;object-fit:cover;display:block}",
    ".v-txt{display:grid;gap:4px;min-width:0;align-content:start}",
    ".v-nome{padding:0;border:0;background:none;color:var(--ink);font:inherit;font-weight:600;text-align:left;cursor:pointer}",
    "span.v-nome{cursor:default}",
    ".v-l1{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--muted)}",
    ".v-st{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px}",
    ".v-ch{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:var(--accent-soft);color:var(--ink)}",
    ".v-onde,.v-nota{font-size:13px;color:var(--muted);overflow-wrap:anywhere}",
    ".v-nota{color:var(--ink)}",
    ".v-glb{font:inherit;font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--accent);cursor:pointer}",
    ".v-pe{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:12px}",
    ".v-pe .btn{font-size:14px}",
    ".v-apagar{color:var(--veto)}",
    ".v-termos{display:grid;gap:0;border:1px solid var(--line);border-radius:12px;overflow:hidden}",
    ".v-t{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px 12px;padding:8px 12px;border-top:1px solid var(--line)}",
    ".v-t:first-child{border-top:0}",
    ".v-t .en{color:var(--muted)}",
    ".v-t .pt{font-weight:600}",
    ".v-t .nt{grid-column:1/-1;font-size:13px;color:var(--muted)}",
    ".v-gh{padding:8px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);background:var(--bg);border-top:1px solid var(--line)}",
    ".v-gh:first-child{border-top:0}",
    ".v-gh + .v-t{border-top:1px solid var(--line)}",
    "@media (max-width:520px){.v-filtros{grid-template-columns:minmax(0,1fr)}}",
    ".v-fonte{font-size:12px;color:var(--muted);margin:0}",
    ".v-ftr{font-size:14px;padding:8px 12px;border-radius:10px;background:var(--pt-bg);color:var(--ink);overflow-wrap:anywhere}",
    ".v-ftr.nao{background:var(--sua-bg)}",
    ".v-fgl{border:1px solid var(--line);border-radius:12px;padding:0 12px}",
    ".v-fgl summary{cursor:pointer;font-weight:600;padding:10px 0}",
    ".v-fgl[open]{padding-bottom:12px}",
    ".v-fgl .v-fgl-in{display:grid;gap:8px}",
    ".v-mais{font-size:13px;color:var(--muted);margin:0}"
  ].join("\n");
  document.head.appendChild(css);

  function e_(t) { return typeof esc === "function" ? esc(t == null ? "" : t) : String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function n_(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function dataBR(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : (iso ? String(iso) : "");
  }
  function juntar(a) {
    a = a.filter(Boolean);
    return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1];
  }
  function lista_(v) { return Array.isArray(v) ? v : (v == null || v === "" ? [] : [v]); }

  // ---------- validar e arrumar o arquivo ----------
  function validar(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return "O arquivo não tem o formato esperado (falta o { } de fora).";
    if (o.versao !== 1) return "Versão do arquivo desconhecida (esperava \"versao\": 1).";
    if (!Array.isArray(o.traducoes)) return "Falta a lista \"traducoes\" no arquivo.";
    if (o.glossarios != null && !Array.isArray(o.glossarios)) return "\"glossarios\" tem que ser uma lista.";
    for (var i = 0; i < o.traducoes.length; i++) {
      var t = o.traducoes[i];
      if (!t || typeof t !== "object") return "A tradução nº " + (i + 1) + " não está no formato certo.";
      if (typeof t.nome !== "string" || !t.nome.trim()) return "A tradução nº " + (i + 1) + " está sem nome.";
    }
    var gl = o.glossarios || [];
    for (var j = 0; j < gl.length; j++) {
      var g = gl[j];
      if (!g || typeof g !== "object" || typeof g.serie !== "string" || !g.serie.trim()) return "O glossário nº " + (j + 1) + " está sem o nome da série.";
      if (!Array.isArray(g.termos)) return "O glossário \"" + g.serie + "\" está sem a lista de termos.";
      for (var k = 0; k < g.termos.length; k++) {
        var x = g.termos[k];
        if (!x || typeof x !== "object" || (typeof x.en !== "string" && typeof x.pt !== "string")) return "No glossário \"" + g.serie + "\", o termo nº " + (k + 1) + " está sem \"en\" e \"pt\".";
      }
    }
    if (!o.traducoes.length && !gl.length) return "O arquivo está vazio (sem traduções e sem glossários).";
    return null;
  }
  function arrumar(o) {
    return {
      gerado: typeof o.gerado === "string" ? o.gerado : "",
      importado: new Date().toISOString().slice(0, 10),
      traducoes: o.traducoes.map(function (t) {
        var st = n_(t.status).trim();
        return {
          id: typeof t.id === "string" && t.id ? t.id : null,
          nome: t.nome.trim(),
          data: typeof t.data === "string" ? t.data : "",
          status: st,
          versoes: lista_(t.versoes).filter(function (v) { return typeof v === "string" && v; }),
          textos: typeof t.textos === "number" ? t.textos : null,
          letras: typeof t.letras === "number" ? t.letras : null,
          tipo: n_(t.tipo) === "revisao" ? "revisão" : "tradução",
          onde: lista_(t.onde).filter(function (v) { return typeof v === "string" && v; }),
          notas: typeof t.notas === "string" ? t.notas : ""
        };
      }),
      glossarios: (o.glossarios || []).map(function (g) {
        return {
          serie: g.serie.trim(),
          ids: lista_(g.ids).filter(function (v) { return typeof v === "string" && v; }),
          fonte: typeof g.fonte === "string" ? g.fonte : "",
          termos: g.termos.map(function (x) {
            return {en: typeof x.en === "string" ? x.en : "", pt: typeof x.pt === "string" ? x.pt : "", nota: typeof x.nota === "string" ? x.nota : ""};
          })
        };
      })
    };
  }

  // ---------- dados no aparelho + índices ----------
  var D = null, trPorId = {}, glPorId = {}, jogoDe = {}, faltam = 0, faltaNome = {};
  function indexar() {
    trPorId = {}; glPorId = {}; jogoDe = {}; faltam = 0; faltaNome = {};
    if (!D) return;
    D.traducoes.forEach(function (t, i) {
      t._i = i;
      t._b = n_(t.nome + " " + t.notas + " " + t.onde.join(" ") + " " + t.versoes.join(" "));
      if (t.id) { trPorId[t.id] = t; } else { faltaNome[t.nome.toLowerCase()] = t; }
    });
    D.glossarios.forEach(function (g, i) {
      g._i = i;
      g.ids.forEach(function (id) { (glPorId[id] = glPorId[id] || []).push(g); });
      g.termos.forEach(function (x) { x._b = n_(x.en + " " + x.pt + " " + x.nota); });
    });
    faltam = Object.keys(trPorId).length + Object.keys(faltaNome).length;
  }
  // acha o jogo da estante de cada tradução: uma passada só, e só enquanto faltar alguém
  function procurar(lista) {
    if (!D || faltam <= 0 || !lista) return;
    for (var i = 0; i < lista.length && faltam > 0; i++) {
      var g = lista[i];
      if (!g || jogoDe[g.id]) continue;
      var t = trPorId[g.id];
      if (t && !t._g) { t._g = g; jogoDe[g.id] = g; faltam--; continue; }
      var tn = faltaNome[String(g.n || "").toLowerCase()];
      if (tn && !tn._g) { tn._g = g; tn.id = g.id; trPorId[g.id] = tn; jogoDe[g.id] = g; faltam--; }
    }
  }
  var procurouTudo = false;
  function garantirJogos() { if (!procurouTudo) { procurouTudo = true; procurar(DATA); } }
  (window.CAT_AO_CRESCER || []).push(function (novos) { if (procurouTudo) procurar(novos); });

  function ler() {
    var t = null;
    try { t = localStorage.getItem(CHAVE); } catch (e) { t = null; }
    if (!t) return null;
    try { var o = JSON.parse(t); return o && Array.isArray(o.traducoes) && Array.isArray(o.glossarios) ? o : null; } catch (e) { return null; }
  }
  function gravar(o) {
    try {
      var limpo = JSON.stringify(o, function (k, v) { return k.charAt(0) === "_" ? undefined : v; });
      localStorage.setItem(CHAVE, limpo); return true;
    } catch (e) { return false; }
  }
  D = ler();
  indexar();

  // ---------- botão do topo e a tela ----------
  var caixa = document.getElementById("p-pac");
  var bt = document.createElement("button");
  bt.type = "button"; bt.className = "btn"; bt.id = "v-abrir"; bt.textContent = "📚 Minhas traduções";
  bt.setAttribute("aria-haspopup", "dialog");
  if (caixa) {
    var ha = document.getElementById("t-abrir") || document.getElementById("r-abrir") || document.getElementById("s-abrir");
    if (ha && ha.parentNode === caixa) ha.insertAdjacentElement("afterend", bt);
    else { var pt = caixa.querySelector("p.p-txt"); if (pt) caixa.insertBefore(bt, pt); else caixa.appendChild(bt); }
  } else {
    var r = document.getElementById("resumo");
    if (r && r.parentNode) r.parentNode.insertBefore(bt, r.nextSibling);
  }

  var dlg = document.createElement("dialog");
  dlg.id = "v-dlg"; dlg.setAttribute("aria-labelledby", "v-tit");
  document.body.appendChild(dlg);
  var arq = document.createElement("input");
  arq.type = "file"; arq.accept = ".json,application/json"; arq.hidden = true; arq.id = "v-arq";
  document.body.appendChild(arq);

  var aba = "tr", fStatus = "", fBusca = "", gSerie = "", gBusca = "", msg = null, apagando = 0;

  function vazioHTML() {
    return '<div class="v-vazio"><p>Aqui aparece o histórico das suas traduções e o glossário de cada série.</p>' +
      '<p>Esses dados não ficam no site: você importa o seu arquivo e eles ficam só neste aparelho (não vão pra sincronização).</p>' +
      '<button type="button" class="v-imp" data-v="importar">📥 Importar meus dados</button></div>';
  }
  function stHTML(s) {
    var d = ST[s];
    if (!d) return s ? '<span class="v-st" style="background:var(--line);color:var(--ink)">' + e_(s) + "</span>" : "";
    return '<span class="v-st" style="background:var(--' + d.c + '-bg);color:var(--' + d.c + ')">' + d.l + "</span>";
  }
  function numTxt(t) {
    var a = [];
    if (t.textos != null) a.push(t.textos.toLocaleString("pt-BR") + " textos");
    if (t.letras != null) a.push(t.letras >= 1e6 ? (Math.round(t.letras / 1e5) / 10).toLocaleString("pt-BR") + " milhões de letras" : t.letras.toLocaleString("pt-BR") + " letras");
    return a.join(" · ");
  }
  function linhaTr(t) {
    var g = t._g, img = g && g.img && typeof imgURL === "function" ? imgURL(g.img) : "";
    var capa = g ? '<button type="button" class="v-capa" data-v-ficha="' + e_(g.id) + '" aria-label="Ver a ficha de ' + e_(g.n) + '">' +
      (img ? '<img src="' + e_(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : "🎮") + "</button>"
      : '<button type="button" class="v-capa" disabled aria-hidden="true" tabindex="-1">🎮</button>';
    var nome = g ? '<button type="button" class="v-nome" data-v-ficha="' + e_(g.id) + '">' + e_(t.nome) + "</button>" : '<span class="v-nome">' + e_(t.nome) + "</span>";
    var l1 = [];
    if (t.data) l1.push("<span>" + e_(dataBR(t.data)) + "</span>");
    l1.push(stHTML(t.status));
    if (t.tipo === "revisão") l1.push('<span class="v-ch">revisão</span>');
    t.versoes.forEach(function (v) { l1.push('<span class="v-ch">' + e_(v) + "</span>"); });
    var nm = numTxt(t);
    if (nm) l1.push("<span>" + e_(nm) + "</span>");
    var gl = t.id && glPorId[t.id];
    if (gl) l1.push('<button type="button" class="v-glb" data-v-serie="' + gl[0]._i + '">📖 glossário</button>');
    return '<div class="v-lin">' + capa + '<div class="v-txt">' + nome + '<div class="v-l1">' + l1.join("") + "</div>" +
      (t.onde.length ? '<div class="v-onde">📦 Está em: ' + e_(t.onde.join(" · ")) + "</div>" : "") +
      (t.notas ? '<div class="v-nota">' + e_(t.notas) + "</div>" : "") + "</div></div>";
  }
  function trHTML() {
    garantirJogos();
    var cont = {}, prontas = 0;
    D.traducoes.forEach(function (t) { cont[t.status] = (cont[t.status] || 0) + 1; if (t.status === "pronta") prontas++; });
    var outros = Object.keys(cont).filter(function (s) { return ORDEM_ST.indexOf(s) < 0; });
    var q = n_(fBusca).trim();
    var vis = D.traducoes.filter(function (t) { return (!fStatus || t.status === fStatus) && (!q || t._b.indexOf(q) >= 0); });
    vis.sort(function (a, b) { return (b.data || "").localeCompare(a.data || "") || a.nome.localeCompare(b.nome, "pt-BR"); });
    var tot = D.traducoes.length;
    return '<p class="v-tot">' + tot + (tot === 1 ? " tradução, " : " traduções, ") + prontas + (prontas === 1 ? " pronta" : " prontas") +
      (vis.length !== tot ? " · mostrando " + vis.length : "") + "</p>" +
      '<div class="v-filtros"><input type="search" id="v-busca" placeholder="Buscar nome, nota ou lugar…" aria-label="Buscar nas suas traduções" value="' + e_(fBusca) + '">' +
      '<select id="v-status" aria-label="Filtrar por situação"><option value="">Todas (' + tot + ")</option>" +
      ORDEM_ST.concat(outros).filter(function (s) { return cont[s]; }).map(function (s) {
        return '<option value="' + e_(s) + '"' + (s === fStatus ? " selected" : "") + ">" + e_(ST[s] ? ST[s].l : s || "sem situação") + " (" + cont[s] + ")</option>";
      }).join("") + "</select></div>" +
      '<div class="v-lista" id="v-lista">' + (vis.length ? vis.map(linhaTr).join("") : '<p class="v-tot">Nada com esse filtro.</p>') + "</div>";
  }
  function termosHTML(gls, q, mostrarSerie) {
    q = n_(q).trim();
    var out = [], achados = 0, ult = null;
    gls.forEach(function (g) {
      g.termos.forEach(function (x) {
        if (q && x._b.indexOf(q) < 0) return;
        achados++;
        if (achados > MAX_GL) return;  // só conta; desenha no máximo MAX_GL termos
        if (mostrarSerie && ult !== g) { ult = g; out.push('<div class="v-gh">' + e_(g.serie) + "</div>"); }
        out.push('<div class="v-t">' +
          '<span class="en" lang="en">' + e_(x.en) + '</span><span class="pt">' + e_(x.pt) + "</span>" +
          (x.nota ? '<span class="nt">' + e_(x.nota) + "</span>" : "") + "</div>");
      });
    });
    if (!achados) return '<p class="v-mais">Nenhum termo com essa busca.</p>';
    return '<div class="v-termos">' + out.join("") + "</div>" +
      (achados > MAX_GL ? '<p class="v-mais">Mostrando ' + MAX_GL + " de " + achados + " termos. Busque pra achar o resto.</p>" : "");
  }
  function glHTML() {
    if (!D.glossarios.length) return '<p class="v-tot">O arquivo importado não tem glossários.</p>';
    var gls = gSerie === "" ? D.glossarios : [D.glossarios[+gSerie]].filter(Boolean);
    var nT = 0; D.glossarios.forEach(function (g) { nT += g.termos.length; });
    var fontes = gls.map(function (g) { return g.fonte; }).filter(Boolean);
    return '<p class="v-tot">' + D.glossarios.length + (D.glossarios.length === 1 ? " série, " : " séries, ") + nT.toLocaleString("pt-BR") + " termos fixados</p>" +
      '<div class="v-filtros"><input type="search" id="v-gbusca" placeholder="Buscar termo (inglês ou português)…" aria-label="Buscar termo no glossário" value="' + e_(gBusca) + '">' +
      '<select id="v-serie" aria-label="Filtrar por série"><option value="">Todas as séries</option>' +
      D.glossarios.map(function (g) { return '<option value="' + g._i + '"' + (String(g._i) === gSerie ? " selected" : "") + ">" + e_(g.serie) + " (" + g.termos.length + ")</option>"; }).join("") +
      "</select></div>" + '<div id="v-gres">' + termosHTML(gls, gBusca, gSerie === "" && D.glossarios.length > 1) + "</div>" +
      (gSerie !== "" && fontes.length ? '<p class="v-fonte">Fonte: ' + e_(fontes.join(", ")) + "</p>" : "");
  }
  function msgHTML() { return msg ? '<p class="v-msg ' + msg.t + '" role="status">' + e_(msg.m) + "</p>" : '<p class="v-msg" role="status"></p>'; }
  function desenhar() {
    var corpo, pe = "";
    if (!D) corpo = vazioHTML();
    else {
      corpo = '<div class="v-abas" role="tablist">' +
        '<button type="button" role="tab" class="v-aba" data-v-aba="tr" aria-selected="' + (aba === "tr") + '">📚 Traduções</button>' +
        '<button type="button" role="tab" class="v-aba" data-v-aba="gl" aria-selected="' + (aba === "gl") + '">📖 Glossário</button></div>' +
        '<div id="v-corpo" role="tabpanel">' + (aba === "gl" ? glHTML() : trHTML()) + "</div>";
      pe = '<div class="v-pe"><button type="button" class="btn" data-v="importar">🔄 Atualizar dados</button>' +
        '<button type="button" class="btn v-apagar" data-v="apagar">' + (apagando ? "Toque de novo pra apagar" : "🗑 Apagar deste aparelho") + "</button></div>" +
        '<p class="v-fonte">Arquivo de ' + e_(dataBR(D.gerado) || "data desconhecida") + " · importado em " + e_(dataBR(D.importado)) + " · fica só neste aparelho.</p>";
    }
    dlg.innerHTML = '<div class="v-in"><div class="v-topo"><h2 id="v-tit">' + (aba === "gl" && D ? "📖 Glossário" : "📚 Minhas traduções") + "</h2>" +
      '<button type="button" class="v-x" data-v="fechar" aria-label="Fechar">✕</button></div>' + corpo + msgHTML() + pe + "</div>";
  }
  function soCorpo() {
    var c = document.getElementById("v-corpo");
    if (!c) { desenhar(); return; }
    if (aba === "tr") { var l = document.getElementById("v-lista"); var tmp = document.createElement("div"); tmp.innerHTML = trHTML();
      // troca a contagem, o select e a lista, sem perder o foco da busca
      c.querySelector(".v-tot").replaceWith(tmp.querySelector(".v-tot"));
      c.querySelector("#v-status").replaceWith(tmp.querySelector("#v-status"));
      if (l) l.replaceWith(tmp.querySelector("#v-lista"));
    } else {
      var gls = gSerie === "" ? D.glossarios : [D.glossarios[+gSerie]].filter(Boolean);
      var r_ = document.getElementById("v-gres");
      if (r_) r_.innerHTML = termosHTML(gls, gBusca, gSerie === "" && D.glossarios.length > 1);
    }
  }
  function abrir(qual) {
    if (qual) aba = qual;
    msg = null; apagando = 0;
    desenhar();
    if (!dlg.open) dlg.showModal();
  }
  window.abrirTraducoes = abrir;
  bt.addEventListener("click", function () { abrir(); });

  var tBusca = 0;
  dlg.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "v-busca") { fBusca = t.value; clearTimeout(tBusca); tBusca = setTimeout(soCorpo, 120); }
    else if (t.id === "v-gbusca") { gBusca = t.value; clearTimeout(tBusca); tBusca = setTimeout(soCorpo, 120); }
  });
  dlg.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "v-status") { fStatus = t.value; soCorpo(); }
    else if (t.id === "v-serie") { gSerie = t.value; desenhar(); }
  });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) { dlg.close(); return; }
    var b = e.target.closest ? e.target.closest("button") : null;
    if (!b) return;
    if (b.dataset.vFicha) { dlg.close(); abrirFicha(b.dataset.vFicha); return; }
    if (b.dataset.vAba) { aba = b.dataset.vAba; msg = null; desenhar(); return; }
    if (b.dataset.vSerie != null) { aba = "gl"; gSerie = b.dataset.vSerie; gBusca = ""; msg = null; desenhar(); return; }
    var a = b.dataset.v;
    if (a === "fechar") dlg.close();
    else if (a === "importar") { arq.value = ""; arq.click(); }
    else if (a === "apagar") {
      if (!apagando) { apagando = setTimeout(function () { apagando = 0; if (dlg.open) desenhar(); }, 4000); desenhar(); return; }
      clearTimeout(apagando); apagando = 0;
      try { localStorage.removeItem(CHAVE); } catch (x) {}
      D = null; indexar(); procurouTudo = false;
      msg = {t: "ok", m: "Apagado deste aparelho. O site nunca teve esses dados."};
      desenhar();
    }
  });
  dlg.addEventListener("close", function () { if (apagando) { clearTimeout(apagando); apagando = 0; } });

  arq.addEventListener("change", function () {
    var f = arq.files && arq.files[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { msg = {t: "erro", m: "Arquivo grande demais (mais de 8 MB). Confira se é o arquivo certo."}; desenhar(); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var o;
      try { o = JSON.parse(String(rd.result).replace(/^﻿/, "")); }
      catch (x) { msg = {t: "erro", m: "Não deu pra ler: \"" + f.name + "\" não é um arquivo JSON válido."}; desenhar(); return; }
      var erro = validar(o);
      if (erro) { msg = {t: "erro", m: "Arquivo não aceito: " + erro + " Nada foi mudado."}; desenhar(); return; }
      var novo = arrumar(o);
      if (!gravar(novo)) { msg = {t: "erro", m: "Não deu pra guardar neste aparelho (memória cheia ou navegação anônima)."}; desenhar(); return; }
      D = novo; indexar(); procurouTudo = false;
      var nT = 0; D.glossarios.forEach(function (g) { nT += g.termos.length; });
      msg = {t: "ok", m: "Pronto: " + D.traducoes.length + " traduções e " + D.glossarios.length + " glossários (" + nT + " termos) guardados só neste aparelho."};
      desenhar();
      if (!dlg.open) dlg.showModal();
    };
    rd.onerror = function () { msg = {t: "erro", m: "Não deu pra abrir o arquivo."}; desenhar(); };
    rd.readAsText(f);
  });

  // ---------- na ficha do jogo ----------
  function linhaFicha(t) {
    var d = dataBR(t.data), vs = juntar(t.versoes), rev = t.tipo === "revisão", txt;
    if (t.status === "pronta") txt = (rev ? "Você revisou" : "Você traduziu") + (d ? " em " + d : "");
    else if (t.status === "revisando") txt = "Você está revisando" + (d ? " (desde " + d + ")" : "");
    else if (t.status === "em andamento") txt = "Você está traduzindo" + (d ? " (desde " + d + ")" : "");
    else txt = (rev ? "Revisão " : "Tradução ") + (ST[t.status] ? ST[t.status].l.toLowerCase() : t.status || "sua") + (d ? " em " + d : "");
    if (vs) txt += " — " + vs;
    if (t.onde.length) txt += " · está em: " + juntar(t.onde);
    return txt;
  }
  var fichaAntV = abrirFicha;
  abrirFicha = function (id) {
    var r = fichaAntV.apply(this, arguments);
    if (!D) return r;
    try {
      var fi = document.getElementById("ficha");
      if (!fi || !fi.open) return r;
      var inn = fi.querySelector(".ficha-in") || fi;
      var t = trPorId[id];
      if (!t) {
        // tradução sem id no arquivo: tenta pelo nome do jogo (o da ficha), sem varrer o DATA
        var hn = fi.querySelector("#ficha-nome"), tn = hn && faltaNome[hn.textContent.toLowerCase()];
        if (tn && (!tn.id || tn.id === id)) { t = tn; tn.id = id; trPorId[id] = tn; }
      }
      if (t) {
        var p = document.createElement("p");
        p.className = "v-ftr" + (t.status === "pronta" ? "" : " nao");
        p.style.margin = "0";
        p.textContent = "✎ " + linhaFicha(t);
        // logo abaixo do nome do jogo (antes do "Pra você"), pra ser a primeira coisa que se vê
        var alvo = fi.querySelector(".ficha-topo") || fi.querySelector(".ficha-dados");
        if (alvo) alvo.after(p); else inn.appendChild(p);
      }
      var gls = glPorId[id];
      if (gls && gls.length) {
        var n = 0; gls.forEach(function (g) { n += g.termos.length; });
        var dt = document.createElement("details");
        dt.className = "v-fgl";
        dt.innerHTML = "<summary>📖 Glossário da série (" + n.toLocaleString("pt-BR") + (n === 1 ? " termo" : " termos") + ")</summary>";
        var feito = false;
        dt.addEventListener("toggle", function () {
          if (!dt.open || feito) return;
          feito = true;
          var c = document.createElement("div");
          c.className = "v-fgl-in";
          c.innerHTML = '<input type="search" placeholder="Buscar termo…" aria-label="Buscar termo no glossário da série">' +
            '<div class="v-fgl-res">' + termosHTML(gls, "", gls.length > 1) + "</div>" +
            '<p class="v-fonte">' + e_(gls.map(function (g) { return g.serie + (g.fonte ? " (" + g.fonte + ")" : ""); }).join(" · ")) + "</p>";
          dt.appendChild(c);
          var inp = c.querySelector("input"), res = c.querySelector(".v-fgl-res"), tm = 0;
          inp.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { res.innerHTML = termosHTML(gls, inp.value, gls.length > 1); }, 120); });
        });
        var tx = fi.querySelector(".ficha-texto");
        if (tx) tx.after(dt); else inn.appendChild(dt);
      }
    } catch (e) { /* a ficha segue sem o bloco */ }
    return r;
  };
})();

/* 26/11: leitura para a tela de Estatísticas (mod_K): devolve os dados importados ou null */
window.V_dados = function () {
  try { var t = localStorage.getItem("estante-tradutor-local"); return t ? JSON.parse(t) : null; } catch (e) { return null; }
};

