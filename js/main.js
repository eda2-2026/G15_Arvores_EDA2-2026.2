/* =====================================================================
   main.js — CONTROLES: liga botões e teclado à lógica e ao visual
   ---------------------------------------------------------------------
   Aqui não há regra de árvore (isso é arvore.js) nem desenho
   (isso é visual.js): só navegação entre os passos.
   ===================================================================== */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  let atual = -1;     // índice do passo exibido
  let relogio = null; // temporizador do botão "Reproduzir"

  /** Mostra o passo de índice i (limitado ao intervalo válido). */
  function mostrar(i) {
    const passos = ArvoreRN.obterPassos();
    atual = Math.max(0, Math.min(passos.length - 1, i));
    const passo = passos[atual];

    VisualSVG.desenhar({ svg: $("svg"), rotacao: $("rot"), caso: $("caso") }, passo);
    $("exp").innerHTML = passo
      ? "<b>" + passo.titulo + (passo.caso ? " - " + passo.caso : "") + "</b>" + passo.descricao
      : "<b>Pronto para começar</b>Digite um número e clique em Inserir, ou use o Exemplo.";

    const ultimo = passos.length - 1;
    $("start").disabled = $("prev").disabled = atual <= 0;
    $("next").disabled = $("end").disabled = atual >= ultimo;
    $("cnt").textContent = passos.length ? "passo " + (atual + 1) + " de " + passos.length : "";
  }

  function pararReproducao() {
    clearInterval(relogio);
    relogio = null;
    $("play").textContent = "Reproduzir";
  }

  function inserirDoCampo() {
    const campo = $("v");
    if (campo.value === "") return;
    pararReproducao();
    const primeiro = ArvoreRN.inserir(parseInt(campo.value, 10));
    campo.value = "";
    mostrar(primeiro); // começa a mostrar do primeiro passo desta inserção
    campo.focus();
  }

  function inserirExemplo() {
    pararReproducao();
    let primeiro = -1;
    [10, 20, 30, 15, 25, 5, 1].forEach(function (valor) {
      const i = ArvoreRN.inserir(valor);
      if (primeiro < 0) primeiro = i;
    });
    mostrar(primeiro);
  }

  function alternarReproducao() {
    if (relogio) return pararReproducao();
    if (atual >= ArvoreRN.obterPassos().length - 1) return;
    $("play").textContent = "Pausar";
    relogio = setInterval(function () {
      if (atual >= ArvoreRN.obterPassos().length - 1) pararReproducao();
      else mostrar(atual + 1);
    }, 1400);
  }

  // Ligações entre botões e ações
  $("ins").onclick = inserirDoCampo;
  $("v").onkeydown = function (e) { if (e.key === "Enter") inserirDoCampo(); };
  $("ex").onclick = inserirExemplo;
  $("clr").onclick = function () { pararReproducao(); ArvoreRN.limpar(); CameraSVG.centralizar(); mostrar(0); };
  $("start").onclick = function () { pararReproducao(); mostrar(0); };
  $("prev").onclick = function () { pararReproducao(); mostrar(atual - 1); };
  $("next").onclick = function () { pararReproducao(); mostrar(atual + 1); };
  $("end").onclick = function () { pararReproducao(); mostrar(ArvoreRN.obterPassos().length - 1); };
  $("play").onclick = alternarReproducao;

  // Botões − e + do campo numérico (substituem os spinners nativos do navegador)
  $("menos").onclick = function () { $("v").stepDown(); };
  $("mais").onclick = function () { $("v").stepUp(); };

  // Zoom e movimentação do canvas (botões no canto inferior direito, roda do mouse e arrastar)
  CameraSVG.iniciar($("svg"));
  $("zmais").onclick = CameraSVG.aproximar;
  $("zmenos").onclick = CameraSVG.afastar;
  $("zcentro").onclick = CameraSVG.centralizar;

  mostrar(0);
})();
