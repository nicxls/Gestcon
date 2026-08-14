/* ============================================================
   GestCon — tema.js
   Execute este script ANTES do render (no <head>, sem defer)
   para aplicar o tema salvo sem piscar.
   ============================================================ */

(function () {
  var CHAVE = 'gestcon_tema';

  function temaAtual() {
    var salvo = localStorage.getItem(CHAVE);
    if (salvo === 'dark' || salvo === 'light') return salvo;
    // Sem preferência salva: segue o SO
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
  }

  // Aplica imediatamente (antes do primeiro paint)
  aplicarTema(temaAtual());

  // Expõe função global para o botão de toggle
  window.toggleTema = function () {
    var atual = document.documentElement.getAttribute('data-tema') || 'light';
    var novo  = atual === 'dark' ? 'light' : 'dark';
    localStorage.setItem(CHAVE, novo);
    aplicarTema(novo);
  };
})();
