/* mod_N_novidades.js */
// Aviso de versão nova: na primeira abertura depois de uma atualização, mostra o que mudou.
// O conteúdo vem de novidades.json (montar_app.py troca [{"v": "2026-11-26", "data": "26/11/2026", "titulo": "Estante nova: todos os 19 mil jogos", "itens": [{"i": "🎮", "t": "Todos os jogos, sem baixar nada", "d": "O catálogo inteiro (uns 19 mil jogos) vem junto. Antes apareciam só as suas listas."}, {"i": "🗂️", "t": "24 gêneros", "d": "Novos: RPG de nicho, Roguelike, Metroidvania, Tiro, Terror, Fazenda e vida, Puzzle, Casual, Sobrevivência, Música, Luta, Corrida e Esporte."}, {"i": "🏷️", "t": "Etiquetas pra combinar", "d": "Ex.: RPG de nicho + com romance + por turnos."}, {"i": "💬", "t": "Pra você, em cada ficha", "d": "Por que você gostaria, por que talvez não, e 🟢🟡🔴 se acho que você vai gostar."}, {"i": "🎯", "t": "Ordenar por \"Mais a sua cara\"", "d": "Os que mais combinam com você no topo."}, {"i": "🧩", "t": "Parecidos com este", "d": "Na ficha, uma fileira de jogos do mesmo jeito."}, {"i": "🃏", "t": "Avaliar jogos (modo Tinder)", "d": "Um jogo por vez: arraste pra ⭐ quero, ✖ não quero ou ⏭ depois."}, {"i": "🔎", "t": "Busca esperta", "d": "Acha mesmo com erro e sem acento: pokemom, dragao quest, ff7."}, {"i": "☁️", "t": "Sincronizar celular e PC", "d": "Marcou num, aparece no outro. Configure uma vez em cada aparelho."}, {"i": "📝", "t": "Descrições em português", "d": "Quase todas as descrições que estavam em inglês foram traduzidas."}, {"i": "✅", "t": "Suas traduções novas", "d": "Dragon Ruins, Drova, Caves of Qud, Potato Flowers, DecaDungeons e Dark Quest 2 e 3 agora aparecem como traduzidas por você."}, {"i": "🔧", "t": "Consertos", "d": "Miniaturas da galeria, jogos só de Switch 2 separados, total em GB certo, nomes com lixo, botão voltar do celular e outros."}]}]). Botão "📰 Novidades" reabre.
(function () {
  "use strict";
  var NOV = [{"v": "2026-11-26", "data": "26/11/2026", "titulo": "Estante nova: todos os 19 mil jogos", "itens": [{"i": "🎮", "t": "Todos os jogos, sem baixar nada", "d": "O catálogo inteiro (uns 19 mil jogos) vem junto. Antes apareciam só as suas listas."}, {"i": "🗂️", "t": "24 gêneros", "d": "Novos: RPG de nicho, Roguelike, Metroidvania, Tiro, Terror, Fazenda e vida, Puzzle, Casual, Sobrevivência, Música, Luta, Corrida e Esporte."}, {"i": "🏷️", "t": "Etiquetas pra combinar", "d": "Ex.: RPG de nicho + com romance + por turnos."}, {"i": "💬", "t": "Pra você, em cada ficha", "d": "Por que você gostaria, por que talvez não, e 🟢🟡🔴 se acho que você vai gostar."}, {"i": "🎯", "t": "Ordenar por \"Mais a sua cara\"", "d": "Os que mais combinam com você no topo."}, {"i": "🧩", "t": "Parecidos com este", "d": "Na ficha, uma fileira de jogos do mesmo jeito."}, {"i": "🃏", "t": "Avaliar jogos (modo Tinder)", "d": "Um jogo por vez: arraste pra ⭐ quero, ✖ não quero ou ⏭ depois."}, {"i": "🔎", "t": "Busca esperta", "d": "Acha mesmo com erro e sem acento: pokemom, dragao quest, ff7."}, {"i": "☁️", "t": "Sincronizar celular e PC", "d": "Marcou num, aparece no outro. Configure uma vez em cada aparelho."}, {"i": "📝", "t": "Descrições em português", "d": "Quase todas as descrições que estavam em inglês foram traduzidas."}, {"i": "✅", "t": "Suas traduções novas", "d": "Dragon Ruins, Drova, Caves of Qud, Potato Flowers, DecaDungeons e Dark Quest 2 e 3 agora aparecem como traduzidas por você."}, {"i": "🔧", "t": "Consertos", "d": "Miniaturas da galeria, jogos só de Switch 2 separados, total em GB certo, nomes com lixo, botão voltar do celular e outros."}]}];
  if (!NOV || !NOV.length) return;
  var CHAVE = "estante-switch-v1-novidades-vista";
  var atual = NOV[0];

  var css = document.createElement("style");
  css.textContent =
    "#n-dlg{border:0;border-radius:18px;padding:0;max-width:560px;width:calc(100% - 24px);max-height:86vh;background:var(--card,#fff);color:var(--ink,#111);box-shadow:0 20px 60px rgba(0,0,0,.35)}" +
    "#n-dlg::backdrop{background:rgba(10,15,30,.55)}" +
    "#n-dlg .n-in{padding:20px 20px 16px;overflow:auto;max-height:86vh;box-sizing:border-box}" +
    "#n-dlg .n-sel{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent,#3346e0);margin:0 0 4px}" +
    "#n-dlg h2{margin:0 0 4px;font-size:22px;line-height:1.2}" +
    "#n-dlg .n-data{margin:0 0 12px;color:var(--muted,#667);font-size:14px}" +
    "#n-dlg ul{margin:0 0 6px;padding:0;list-style:none;display:grid;gap:10px}" +
    "#n-dlg li{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:start;font-size:15px;line-height:1.4}" +
    "#n-dlg li .n-i{font-size:20px;line-height:1.2;text-align:center}" +
    "#n-dlg li b{display:block}" +
    "#n-dlg .n-ant{margin-top:14px;border-top:1px solid var(--line,#dde);padding-top:10px}" +
    "#n-dlg .n-ant summary{cursor:pointer;color:var(--muted,#667);font-size:14px}" +
    "#n-dlg .n-ant h3{font-size:15px;margin:12px 0 6px}" +
    "#n-dlg .n-ok{display:block;width:100%;margin-top:16px;padding:12px;border:0;border-radius:12px;background:var(--accent,#3346e0);color:#fff;font-size:16px;font-weight:700;cursor:pointer}" +
    ".n-faixa{display:flex;gap:10px;align-items:center;margin:8px 0;padding:10px 12px;border-radius:12px;background:var(--pt-bg,#e6f4ea);color:var(--ink,#111);font-size:14px}" +
    ".n-faixa button{margin-left:auto;white-space:nowrap}";
  document.head.appendChild(css);

  function esc_(t) { return String(t).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]; }); }
  function lista(v) {
    return "<ul>" + v.itens.map(function (it) {
      return '<li><span class="n-i" aria-hidden="true">' + esc_(it.i || "✨") + "</span><span><b>" + esc_(it.t) + "</b>" + (it.d ? esc_(it.d) : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  var dlg = document.createElement("dialog");
  dlg.id = "n-dlg";
  dlg.setAttribute("aria-labelledby", "n-tit");
  document.body.appendChild(dlg);

  function abrir() {
    var ant = NOV.slice(1, 6);
    dlg.innerHTML = '<div class="n-in"><p class="n-sel">Versão nova</p><h2 id="n-tit">' + esc_(atual.titulo || "O que mudou") + "</h2>" +
      '<p class="n-data">Atualizada em ' + esc_(atual.data) + "</p>" + lista(atual) +
      (ant.length ? '<details class="n-ant"><summary>Versões anteriores</summary>' + ant.map(function (v) {
        return "<h3>" + esc_(v.data) + " — " + esc_(v.titulo || "") + "</h3>" + lista(v);
      }).join("") + "</details>" : "") +
      '<button type="button" class="n-ok" data-n-ok>Entendi, vamos lá</button></div>';
    if (!dlg.open) dlg.showModal();
  }
  function visto() { try { localStorage.setItem(CHAVE, atual.v); } catch (e) {} }

  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || (e.target.closest && e.target.closest("[data-n-ok]"))) { dlg.close(); }
  });
  dlg.addEventListener("close", visto);

  // botão fixo perto dos outros do topo
  var caixa = document.getElementById("p-pac");
  var b = document.createElement("button");
  b.type = "button"; b.className = "btn"; b.id = "n-abrir"; b.textContent = "📰 Novidades";
  b.addEventListener("click", abrir);
  // fica num lugar próprio (o #p-pac é redesenhado por outros módulos)
  var lugar = document.createElement("div");
  lugar.className = "n-lugar";
  lugar.style.margin = "6px 0";
  lugar.appendChild(b);
  if (caixa && caixa.parentNode) caixa.parentNode.insertBefore(lugar, caixa.nextSibling);
  else { var r = document.getElementById("resumo"); if (r && r.parentNode) r.parentNode.insertBefore(lugar, r.nextSibling); }

  var viu = null;
  try { viu = localStorage.getItem(CHAVE); } catch (e) {}
  if (viu !== atual.v) {
    // abre logo que a página terminar de aparecer
    var tenta = function () { if (document.getElementById("carregando")) { setTimeout(tenta, 300); return; } setTimeout(abrir, 400); };
    tenta();
  }
  window.abrirNovidades = abrir;
})();

