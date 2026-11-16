/* =====================================================================
   main.js — CONTROLES: liga botões e teclado à lógica e ao visual
   ---------------------------------------------------------------------
   Aqui não há regra de árvore (isso é arvore.js) nem desenho
   (isso é visual.js): apenas experiência do usuário e navegação.
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
      ? "<b>" + passo.titulo + (passo.caso ? " — " + passo.caso : "") + "</b>" + passo.descricao
      : "<b>Pronto para começar</b>Digite um número e clique em<b>Inserir</b> ou experimente<b>Carregar Exemplo</b>";

    const ultimo = passos.length - 1;
    $("start").disabled = $("prev").disabled = atual <= 0;
    $("next").disabled = $("end").disabled = atual >= ultimo;

    // Efeito pulsante no botão Próximo para guiar o usuário quando há passos pela frente
    if (atual < ultimo) {
      $("next").classList.add("pulsando");
    } else {
      $("next").classList.remove("pulsando");
    }

    // Atualiza contador de passos
    $("cnt").textContent = passos.length
      ? "Passo " + (atual + 1) + " de " + passos.length
      : "0 passos";

    // Atualiza barra de progresso visual
    const barra = $("prog");
    if (barra) {
      const pct = passos.length > 0 ? ((atual + 1) / passos.length) * 100 : 0;
      barra.style.width = pct + "%";
    }

    // Habilitação contextual dos botões de remoção e limpeza
    const temArvore = Boolean(passo && passo.arvore);
    $("rem").disabled = !temArvore;
    $("clr").disabled = !passos.length;
  }

  function pararReproducao() {
    clearInterval(relogio);
    relogio = null;
    $("play").textContent = "▶ Reproduzir";
  }

  function iniciarReproducao(primeiroPasso) {
    clearInterval(relogio);
    mostrar(primeiroPasso);
    $("play").textContent = "⏸ Pausar";
    relogio = setInterval(function () {
      if (atual >= ArvoreRN.obterPassos().length - 1) pararReproducao();
      else mostrar(atual + 1);
    }, 1400);
  }

  function inserirDoCampo() {
    const campo = $("v");
    if (campo.value === "") return;
    const primeiro = ArvoreRN.inserir(parseInt(campo.value, 10));
    campo.value = "";
    campo.focus();
    iniciarReproducao(primeiro); // sempre inicia/continua a reprodução
  }

  function removerDoCampo() {
    const campo = $("v");
    if (campo.value === "") return;
    const primeiro = ArvoreRN.remover(parseInt(campo.value, 10));
    campo.value = "";
    campo.focus();
    iniciarReproducao(primeiro); // sempre inicia/continua a reprodução
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
    $("play").textContent = "⏸ Pausar";
    relogio = setInterval(function () {
      if (atual >= ArvoreRN.obterPassos().length - 1) pararReproducao();
      else mostrar(atual + 1);
    }, 1400);
  }

  // Ligações entre botões e ações
  $("ins").onclick = inserirDoCampo;
  $("rem").onclick = removerDoCampo;
  $("ex").onclick = inserirExemplo;
  $("clr").onclick = function () {
    pararReproducao();
    ArvoreRN.limpar();
    CameraSVG.centralizar();
    mostrar(0);
  };
  $("start").onclick = function () { pararReproducao(); mostrar(0); };
  $("prev").onclick = function () { pararReproducao(); mostrar(atual - 1); };
  $("next").onclick = function () { pararReproducao(); mostrar(atual + 1); };
  $("end").onclick = function () { pararReproducao(); mostrar(ArvoreRN.obterPassos().length - 1); };
  $("play").onclick = alternarReproducao;

  // Atalhos de teclado
  $("v").onkeydown = function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      inserirDoCampo();
    }
  };

  window.addEventListener("keydown", function (e) {
    if (document.activeElement === $("v")) return;

    if (e.key === "ArrowRight") {
      if (!$("next").disabled) {
        e.preventDefault();
        pararReproducao();
        mostrar(atual + 1);
      }
    } else if (e.key === "ArrowLeft") {
      if (!$("prev").disabled) {
        e.preventDefault();
        pararReproducao();
        mostrar(atual - 1);
      }
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      alternarReproducao();
    } else if (e.key === "Home") {
      e.preventDefault();
      pararReproducao();
      mostrar(0);
    } else if (e.key === "End") {
      e.preventDefault();
      pararReproducao();
      mostrar(ArvoreRN.obterPassos().length - 1);
    }
  });

  // Botões − e + do campo numérico
  $("menos").onclick = function () { $("v").stepDown(); };
  $("mais").onclick = function () { $("v").stepUp(); };

  // Zoom e movimentação do canvas
  CameraSVG.iniciar($("svg"));
  $("zmais").onclick = CameraSVG.aproximar;
  $("zmenos").onclick = CameraSVG.afastar;
  $("zcentro").onclick = CameraSVG.centralizar;

  /* =========================================================
     Travessia em Ordem (In-Order)
     Percorre a cópia da árvore do passo atual: esq → raiz → dir
     ========================================================= */
  function inOrder(no, resultado) {
    if (!no || no.ehSentinela) return;
    inOrder(no.esq, resultado);
    resultado.push(no.valor);
    inOrder(no.dir, resultado);
  }

  function abrirModalInOrder() {
    const passos = ArvoreRN.obterPassos();
    const passo = passos[atual];
    const resultado = [];

    if (passo && passo.arvore) {
      inOrder(passo.arvore, resultado);
    }

    const divResultado = $("modal-resultado");
    if (resultado.length === 0) {
      divResultado.textContent = "A árvore está vazia.";
    } else {
      divResultado.textContent = "[ " + resultado.join(", ") + " ]";
    }

    $("modal-inorder").removeAttribute("hidden");
  }

  $("btn-inorder").onclick = abrirModalInOrder;

  $("modal-fechar").onclick = function () {
    $("modal-inorder").setAttribute("hidden", "");
  };

  $("modal-inorder").addEventListener("click", function (e) {
    if (e.target === this) this.setAttribute("hidden", "");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $("modal-inorder").setAttribute("hidden", "");
  });

  mostrar(0);
})();
