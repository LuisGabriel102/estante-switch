/* mod_F_voltar.js */
// fica antes dos outros módulos: com o visor de capas aberto, o botão voltar fecha só ele e a ficha continua aberta
window.addEventListener("popstate", function (e) {
  if (typeof window.F_VOLTAR === "function" && window.F_VOLTAR()) e.stopImmediatePropagation();
});
