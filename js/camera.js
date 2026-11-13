/* =====================================================================
   camera.js — ZOOM e MOVIMENTAÇÃO (pan) dentro do canvas da árvore
   ---------------------------------------------------------------------
   Guarda a "câmera" (escala k e deslocamento x, y) e a aplica ao grupo
   <g id="camera"> que o visual.js desenha. Não conhece nós nem regras.
   A câmera é mantida entre os passos: dá para focar num trecho e seguir
   navegando. "Centralizar" volta a mostrar a árvore inteira.
   ===================================================================== */
const CameraSVG = (function () {
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 4;
  const PASSO_ZOOM = 1.25; // fator de cada clique em + ou −

  let k = 1; // escala (zoom)
  let x = 0; // deslocamento horizontal (em unidades do desenho)
  let y = 0; // deslocamento vertical
  let svg = null;

  /** Texto "transform" usado pelo visual.js ao redesenhar. */
  function transformacao() {
    return "translate(" + x + "," + y + ") scale(" + k + ")";
  }

  /** Aplica a câmera ao desenho atual, sem precisar redesenhar. */
  function aplicar() {
    const g = svg && svg.querySelector("#camera");
    if (g) g.setAttribute("transform", transformacao());
  }

  /** Converte um ponto da tela (pixels) para o sistema de coordenadas do SVG. */
  function pontoNoSvg(clienteX, clienteY) {
    const p = svg.createSVGPoint();
    p.x = clienteX;
    p.y = clienteY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  /** Muda o zoom mantendo fixo o ponto (cx, cy) — ex.: o ponto sob o mouse. */
  function zoomEm(fator, cx, cy) {
    const novo = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k * fator));
    const f = novo / k;
    x = cx - (cx - x) * f;
    y = cy - (cy - y) * f;
    k = novo;
    aplicar();
  }

  /** Zoom pelos botões: em torno do centro da área visível. */
  function zoomNoCentro(fator) {
    const vb = svg.viewBox.baseVal;
    zoomEm(fator, vb.x + vb.width / 2, vb.y + vb.height / 2);
  }

  function aproximar() { zoomNoCentro(PASSO_ZOOM); }
  function afastar() { zoomNoCentro(1 / PASSO_ZOOM); }

  /** Volta ao enquadramento original: a árvore inteira, centralizada. */
  function centralizar() {
    k = 1; x = 0; y = 0;
    aplicar();
  }

  /** Liga o mouse/toque ao canvas: arrastar move, a roda do mouse dá zoom. */
  function iniciar(elemento) {
    svg = elemento;
    let arrastando = false;
    let ultimoX = 0;
    let ultimoY = 0;

    svg.addEventListener("pointerdown", function (e) {
      arrastando = true;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add("arrastando");
    });

    svg.addEventListener("pointermove", function (e) {
      if (!arrastando) return;
      const escala = svg.getScreenCTM(); // pixels por unidade do desenho
      x += (e.clientX - ultimoX) / escala.a;
      y += (e.clientY - ultimoY) / escala.d;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
      aplicar();
    });

    function soltar() {
      arrastando = false;
      svg.classList.remove("arrastando");
    }
    svg.addEventListener("pointerup", soltar);
    svg.addEventListener("pointercancel", soltar);

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      const p = pontoNoSvg(e.clientX, e.clientY);
      zoomEm(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    }, { passive: false });
  }

  return {
    iniciar: iniciar,
    aproximar: aproximar,
    afastar: afastar,
    centralizar: centralizar,
    transformacao: transformacao,
  };
})();
