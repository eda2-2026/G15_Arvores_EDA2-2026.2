/* =====================================================================
   visual.js — PARTE VISUAL: transforma um "passo" em desenho SVG
   ---------------------------------------------------------------------
   Não contém regra da árvore. Só lê o passo gerado em arvore.js:
     passo = { arvore, titulo, descricao, destaques, rotacao }
   e devolve/injeta texto SVG. Cada função desenha UMA coisa.
   ===================================================================== */
const VisualSVG = (function () {
  const ESPACO_X = 44;    // distância horizontal entre colunas
  const ESPACO_Y = 62;    // distância vertical entre níveis
  const MARGEM_ESQ = 64;
  const TOPO = 130;       // y do nível da raiz (deixa folga no alto para a seta da raiz)
  const LARGURA_MIN = 860; // tamanho mínimo do desenho: o canvas tem tamanho fixo
  const ALTURA_MIN = 480;
  const RAIO = 18;        // raio dos nós

  /* ---------- Layout: onde cada nó fica ---------- */
  /**
   * Percurso em ordem (esquerda, nó, direita): cada nó, e cada NIL, recebe
   * uma coluna nova; o nível (profundidade) define a linha.
   */
  function calcularLayout(raiz) {
    const posicoes = {};
    const nos = [];
    const nils = [];
    let coluna = 0;

    function posicao(col, nivel) {
      return { x: col * ESPACO_X + MARGEM_ESQ, y: nivel * ESPACO_Y + TOPO };
    }

    function visitar(no, nivel, idPai) {
      if (!no) {
        if (idPai) { // folha vazia (NIL) do nó idPai
          const id = "nil" + idPai + "_" + coluna;
          posicoes[id] = posicao(coluna++, nivel);
          nils.push({ id: id, idPai: idPai });
        }
        return;
      }
      visitar(no.esq, nivel + 1, no.id);
      posicoes[no.id] = posicao(coluna++, nivel);
      nos.push(no);
      visitar(no.dir, nivel + 1, no.id);
    }

    visitar(raiz, 0, 0);

    let alturaMax = 0;
    for (const id in posicoes) alturaMax = Math.max(alturaMax, posicoes[id].y);
    return { posicoes: posicoes, nos: nos, nils: nils, largura: Math.max(coluna * ESPACO_X + 110, 240), alturaMax: alturaMax };
  }

  /* ---------- Peças do desenho ---------- */

  function linha(a, b) {
    return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="var(--mute)" stroke-width="1.5"/>';
  }

  /** Linhas pai→filho (inclusive até os NIL). Desenhadas primeiro, ficam atrás dos nós. */
  function desenharArestas(layout) {
    let s = "";
    layout.nos.forEach(function (no) {
      [no.esq, no.dir].forEach(function (filho) {
        if (filho) s += linha(layout.posicoes[no.id], layout.posicoes[filho.id]);
      });
    });
    layout.nils.forEach(function (n) {
      s += linha(layout.posicoes[n.idPai], layout.posicoes[n.id]);
    });
    return s;
  }

  /** Círculos coloridos; nós em destaque ganham anel e rótulo (novo, pai, tio, avô). */
  function desenharNos(layout, destaques) {
    return layout.nos.map(function (no) {
      const p = layout.posicoes[no.id];
      const rotulo = destaques[no.id];
      const vermelho = no.cor === ArvoreRN.VERMELHO;
      const anel = rotulo
        ? '<circle cx="' + p.x + '" cy="' + p.y + '" r="23" fill="none" stroke="var(--ring)" stroke-width="2.5"/>' +
          '<text x="' + p.x + '" y="' + (p.y - 27) + '" text-anchor="middle" font-size="11" fill="var(--ring)" font-family="Georgia">' + rotulo + "</text>"
        : "";
      return "<g>" + anel +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + RAIO + '" fill="' + (vermelho ? "var(--red)" : "var(--blk)") +
        '" stroke="' + (vermelho ? "var(--red)" : "var(--mute)") + '" stroke-width="1.5"/>' +
        '<text x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle" font-size="14" fill="#fff" font-family="Georgia">' + no.valor + "</text></g>";
    }).join("");
  }

  /** Folhas vazias: quadradinhos pretos escritos NIL. */
  function desenharNils(layout) {
    return layout.nils.map(function (n) {
      const p = layout.posicoes[n.id];
      return '<rect x="' + (p.x - 11) + '" y="' + (p.y - 8) + '" width="22" height="16" rx="3" fill="var(--blk)" stroke="var(--mute)" stroke-width="1.5"/>' +
        '<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle" font-size="9" fill="#fff" font-family="Georgia">NIL</text>';
    }).join("");
  }

  /** Seta vinda de cima apontando para a raiz (sobe um pouco se a raiz tiver rótulo). */
  function desenharSetaRaiz(layout, passo) {
    const p = layout.posicoes[passo.arvore.id];
    const folga = passo.destaques[passo.arvore.id] ? 44 : 24;
    return '<line x1="' + p.x + '" y1="' + (p.y - folga - 28) + '" x2="' + p.x + '" y2="' + (p.y - folga) +
      '" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" marker-end="url(#seta-raiz)"/>';
  }

  /* ---------- Indicadores nos cantos do canvas (HTML sobre o desenho) ---------- */

  /**
   * Canto superior ESQUERDO: seta circular + sentido da rotação.
   * Só aparece nos passos em que houve rotação. "dir" = horário, "esq" = anti-horário.
   */
  function mostrarRotacao(el, rotacao) {
    if (!rotacao) { el.hidden = true; return; }
    const horario = rotacao.sentido === "dir";
    el.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">' +
        '<defs><marker id="ponta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs>' +
        '<g transform="' + (horario ? "" : "translate(34,0) scale(-1,1)") + '">' +
          '<path d="M9.93,9.93 A10,10 0 1 1 9.93,24.07" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" marker-end="url(#ponta)"/>' +
        "</g></svg>" +
      "<span><small>Rotação</small><b>à " + (horario ? "direita" : "esquerda") + "</b></span>";
    el.hidden = false;
  }

  /** Canto superior DIREITO: caso em que a árvore se encaixa neste passo (se houver). */
  function mostrarCaso(el, caso) {
    if (!caso) { el.hidden = true; return; }
    el.innerHTML = "<span><small>Situação</small><b>" + caso + "</b></span>";
    el.hidden = false;
  }

  /** Pontas de seta reutilizadas pelas linhas acima. */
  function definicoes() {
    return '<defs>' +
      '<marker id="seta-raiz" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker>' +
      "</defs>";
  }

  /* ---------- Interface pública ---------- */

  /**
   * Desenha o passo. "el" reúne os elementos da tela: { svg, rotacao, caso }.
   * O canvas tem tamanho fixo: o desenho é ajustado (viewBox) para caber nele.
   */
  function desenhar(el, passo) {
    const svg = el.svg;
    svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
    mostrarRotacao(el.rotacao, passo && passo.rotacao);
    mostrarCaso(el.caso, passo && passo.caso);

    if (!passo) {
      svg.setAttribute("viewBox", "0 0 " + LARGURA_MIN + " " + ALTURA_MIN);
      svg.innerHTML = '<text x="' + LARGURA_MIN / 2 + '" y="' + ALTURA_MIN / 2 + '" text-anchor="middle" fill="var(--mute)" font-family="Georgia" font-size="16">Insira um valor para começar</text>';
      return;
    }
    const layout = calcularLayout(passo.arvore);
    const largura = Math.max(layout.largura, LARGURA_MIN);
    const altura = Math.max(layout.alturaMax + 60, ALTURA_MIN);
    const deslocX = (largura - layout.largura) / 2; // centraliza a árvore
    svg.setAttribute("viewBox", "0 0 " + largura + " " + altura);
    svg.innerHTML = definicoes() + '<g id="camera" transform="' + CameraSVG.transformacao() + '"><g transform="translate(' + deslocX + ',0)">' +
      desenharArestas(layout) +
      desenharNos(layout, passo.destaques) +
      desenharNils(layout) +
      desenharSetaRaiz(layout, passo) +
      "</g></g>";
  }

  return { desenhar: desenhar };
})();
