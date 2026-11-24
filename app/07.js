/* mod_C_ajustes.js */
// Ajustes (grupo C): tema, colunas, letra, vibrar, compacto
(function () {
  const CH = KEY + "-C-ajustes";
  let aj = {tema: "auto", cols: 2, letra: 100, compacto: false, vibrar: true};
  try { Object.assign(aj, JSON.parse(localStorage.getItem(CH) || "{}")); } catch (e) {}
  // 24/11: o padrão virou 2 capas por linha (capas maiores). Quem estava no 3 antigo passa pro 2 uma vez; depois vale a escolha.
  if (!aj.capasV) { if (aj.cols == 3) aj.cols = 2; aj.capasV = 1; }
  const H = document.documentElement;
  function aplica() {
    if (aj.tema === "claro") H.dataset.theme = "light"; else if (aj.tema === "escuro") H.dataset.theme = "dark"; else delete H.dataset.theme;
    if ([1, 2, 3, 4].indexOf(Number(aj.cols)) >= 0) H.dataset.cols = aj.cols; else delete H.dataset.cols;
    if (aj.compacto) H.dataset.compacto = "1"; else delete H.dataset.compacto;
    if (aj.letra != 100) { H.dataset.letra = "1"; H.style.setProperty("--c-z", aj.letra / 100); } else { delete H.dataset.letra; H.style.removeProperty("--c-z"); }
    try { localStorage.setItem(CH, JSON.stringify(aj)); } catch (e) {}
  }
  aplica();
  const OPC = [
    ["Tema", "tema", [["auto", "Automático"], ["claro", "Claro"], ["escuro", "Escuro"]]],
    ["Capas por linha no celular", "cols", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], "Menos capas por linha, capa maior. Vale pras Capas e pra Vitrine."],
    ["Tamanho da letra", "letra", [[90, "Menor"], [100, "Normal"], [115, "Maior"]]]
  ];
  const fundo = document.createElement("div");
  fundo.className = "c-fundo";
  function monta() {
    fundo.innerHTML = '<div class="c-folha" role="dialog" aria-label="Ajustes"><h2>Ajustes</h2>' +
      OPC.map(function (o) {
        return "<div><h3>" + o[0] + '</h3><div class="seg">' + o[2].map(function (v) {
          return '<button type="button" data-c="' + o[1] + '" data-v="' + v[0] + '" aria-pressed="' + (aj[o[1]] == v[0]) + '">' + v[1] + "</button>";
        }).join("") + "</div>" + (o[3] ? "<p>" + o[3] + "</p>" : "") + "</div>";
      }).join("") +
      '<div><label class="c-chk"><input type="checkbox" data-t="compacto"' + (aj.compacto ? " checked" : "") + '> Modo compacto</label><p>Só capa e nome. Toque no nome do jogo para abrir a ficha; tocar na capa continua marcando.</p></div>' +
      '<div><label class="c-chk"><input type="checkbox" data-t="vibrar"' + (aj.vibrar ? " checked" : "") + '> Vibrar de leve ao tocar</label></div>' +
      '<button type="button" class="c-btn" data-fecha>Fechar</button></div>';
  }
  document.body.appendChild(fundo);
  function abre() { monta(); fundo.classList.add("aberto"); }
  function fecha() { fundo.classList.remove("aberto"); }
  fundo.addEventListener("click", function (e) {
    if (e.target === fundo || e.target.closest("[data-fecha]")) { fecha(); return; }
    const b = e.target.closest("[data-c]");
    if (b) {
      const k = b.dataset.c, v = b.dataset.v;
      aj[k] = k === "tema" ? v : Number(v);
      aplica(); monta();
    }
  });
  fundo.addEventListener("change", function (e) {
    const t = e.target.dataset.t;
    if (t) { aj[t] = e.target.checked; aplica(); }
  });
  const topo = document.createElement("div");
  topo.className = "c-topo";
  topo.innerHTML = '<button type="button" class="c-btn" id="c-aj-btn">⚙ Ajustes</button>';
  const hd = document.querySelector("header");
  if (hd) hd.appendChild(topo);
  topo.firstChild.addEventListener("click", abre);
  // vibrar
  function vibra() { if (aj.vibrar && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} } }
  document.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("input[data-id]")) vibra(); });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-fav]")) vibra(); });
  // compacto: toque no nome abre a ficha
  document.addEventListener("click", function (e) {
    if (!aj.compacto || !e.target.closest) return;
    const n = e.target.closest(".capa-tile .capa-nome");
    if (!n) return;
    const t = n.closest(".capa-tile");
    e.preventDefault();
    if (t && t.dataset.card) abrirFicha(t.dataset.card);
  }, true);
})();

