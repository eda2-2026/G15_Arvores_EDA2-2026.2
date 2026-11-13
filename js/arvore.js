/* =====================================================================
   arvore.js — LÓGICA da árvore vermelho & preto (apenas inserção)
   ---------------------------------------------------------------------
   Este arquivo NÃO desenha nada: não usa HTML, SVG nem DOM.
   Ele mantém a árvore e, a cada etapa do algoritmo, guarda uma
   "fotografia" (um passo) que a parte visual (visual.js) apenas lê.

   As 5 propriedades de uma árvore vermelho & preto:
     1. Todo nó é vermelho ou preto.
     2. A raiz é preta.
     3. Toda folha vazia (NIL) é preta.
     4. Um nó vermelho nunca tem filho vermelho.
     5. Todos os caminhos de um nó até suas folhas NIL têm o mesmo
        número de nós pretos (a "altura negra").

   Ao inserir, o novo nó nasce VERMELHO (não muda a altura negra), mas
   pode violar a propriedade 4. Os 3 casos abaixo consertam isso.
   ===================================================================== */
const ArvoreRN = (function () {
  const VERMELHO = "V";
  const PRETO = "P";

  /* Nomes dos casos exibidos na tela. Edite aqui quando definir a nomenclatura final. */
  const CASOS = { TIO_VERMELHO: "Caso 1", TRIANGULO: "Caso 2", LINHA: "Caso 3" };

  let raiz = null;   // nó raiz da árvore "viva" (com ponteiro para o pai)
  let ultimoId = 0;  // gerador de identificadores únicos dos nós
  let passos = [];   // histórico de fotografias, uma por etapa

  /* ===================== 1) ESTRUTURA E AUXILIARES ===================== */

  /** Cria um nó novo. Todo nó inserido começa VERMELHO. */
  function criarNo(valor, pai) {
    return { id: ++ultimoId, valor: valor, cor: VERMELHO, esq: null, dir: null, pai: pai };
  }

  /** Copia a árvore SEM o ponteiro "pai" (cópia segura para o histórico). */
  function copiar(no) {
    if (!no) return null;
    return { id: no.id, valor: no.valor, cor: no.cor, esq: copiar(no.esq), dir: copiar(no.dir) };
  }

  /**
   * Guarda uma fotografia da árvore neste instante.
   *  - titulo/descricao: texto explicativo mostrado ao aluno
   *  - destaques: { idDoNo: "rótulo" } para marcar novo, pai, tio, avô...
   *  - rotacao: dados da rotação feita neste passo (ou null)
   *  - caso: nome do caso aplicado, ex. "Caso 1" (ou null)
   */
  function registrarPasso(titulo, descricao, destaques, rotacao, caso) {
    passos.push({
      arvore: copiar(raiz),
      titulo: titulo,
      descricao: descricao,
      destaques: destaques || {},
      rotacao: rotacao || null,
      caso: caso || null,
    });
  }

  /** Tio = irmão do pai (o outro filho do avô). Pode ser null (NIL). */
  function tioDe(pai, avo) {
    return pai === avo.esq ? avo.dir : avo.esq;
  }

  function nomeDaCor(no) {
    return no ? (no.cor === VERMELHO ? "vermelho" : "preto") : "preto (NIL)";
  }

  function destaquesDaFamilia(no, pai, tio, avo) {
    const d = {};
    d[no.id] = "novo";
    d[pai.id] = "pai";
    d[avo.id] = "avô";
    if (tio) d[tio.id] = "tio";
    return d;
  }

  /** O nó está "dobrado" em relação ao avô? (pai à esquerda e nó à direita, ou o contrário) */
  function ehTriangulo(no, pai, avo) {
    return (pai === avo.esq && no === pai.dir) || (pai === avo.dir && no === pai.esq);
  }

  /* ============================== 2) ROTAÇÃO ============================== */

  /**
   * Rotaciona em torno do nó x. O filho que "sobe" é y:
   *   sentido "esq": y = filho direito de x  (x desce para a esquerda)
   *   sentido "dir": y = filho esquerdo de x (x desce para a direita)
   * A ordem dos valores (propriedade de árvore de busca) é preservada.
   * Retorna um resumo usado pelo visual para desenhar a seta da rotação.
   */
  function rotacionar(x, sentido) {
    const paraEsquerda = sentido === "esq";
    const y = paraEsquerda ? x.dir : x.esq;

    // 1. A subárvore "do meio" de y passa a ser filha de x
    if (paraEsquerda) {
      x.dir = y.esq;
      if (y.esq) y.esq.pai = x;
    } else {
      x.esq = y.dir;
      if (y.dir) y.dir.pai = x;
    }

    // 2. y ocupa o lugar de x, ligando-se ao antigo pai de x
    y.pai = x.pai;
    if (!x.pai) raiz = y;
    else if (x === x.pai.esq) x.pai.esq = y;
    else x.pai.dir = y;

    // 3. x vira filho de y, do lado oposto ao da rotação
    if (paraEsquerda) y.esq = x;
    else y.dir = x;
    x.pai = y;

    return { topoAntigo: x.id, topoNovo: y.id, sentido: sentido };
  }

  /* ============================ 3) OS TRÊS CASOS ============================ */

  /**
   * CASO 1 — tio VERMELHO.
   * Solução: só recolorir. Pai e tio ficam pretos, o avô fica vermelho.
   * A altura negra não muda, mas o avô agora pode violar a regra com o
   * bisavô; por isso devolvemos o avô para continuar a correção "subindo".
   */
  function caso1TioVermelho(no, pai, tio, avo) {
    pai.cor = PRETO;
    tio.cor = PRETO;
    avo.cor = VERMELHO;
    registrarPasso(
      "Recolorir pai, tio e avô",
      "Recolorimos pai e tio para preto e o avô (" + avo.valor + ") para vermelho. " +
        "A violação pode subir, então repetimos a análise a partir do avô.",
      destaquesDaFamilia(no, pai, tio, avo),
      null,
      CASOS.TIO_VERMELHO
    );
    return avo; // próximo nó a ser analisado
  }

  /**
   * CASO 2 — tio PRETO e nó em TRIÂNGULO (dobrado em relação ao avô).
   * Solução: uma rotação no PAI, que transforma o triângulo em linha reta.
   * Depois disso, aplica-se o Caso 3. Devolve o nó que agora é o "filho"
   * da linha reta (o antigo pai).
   */
  function caso2Triangulo(no, pai, avo) {
    const sentido = pai === avo.esq ? "esq" : "dir";
    const rotacao = rotacionar(pai, sentido);
    const d = {};
    d[no.id] = "pai";
    d[pai.id] = "novo";
    d[avo.id] = "avô";
    registrarPasso(
      "Rotação no pai",
      "O nó está “dobrado” em relação ao avô. Uma rotação " +
        (sentido === "esq" ? "à esquerda" : "à direita") +
        " no pai transforma o triângulo em linha reta (" + CASOS.LINHA + ").",
      d,
      rotacao,
      CASOS.TRIANGULO
    );
    return pai;
  }

  /**
   * CASO 3 — tio PRETO e nó em LINHA RETA com o avô.
   * Solução: pai fica preto, avô fica vermelho e rotaciona-se o AVÔ para
   * o lado oposto ao do nó. A altura negra é preservada e a violação some.
   */
  function caso3Linha(no) {
    const pai = no.pai;
    const avo = pai.pai;
    const sentido = pai === avo.esq ? "dir" : "esq";
    pai.cor = PRETO;
    avo.cor = VERMELHO;
    const rotacao = rotacionar(avo, sentido);
    const d = {};
    d[pai.id] = "pai";
    d[avo.id] = "avô";
    d[no.id] = "novo";
    registrarPasso(
      "Recolorir e rotacionar o avô",
      "Pai (" + pai.valor + ") fica preto, avô (" + avo.valor + ") fica vermelho e rotacionamos o avô " +
        "para o lado oposto. Altura negra preservada, violação resolvida.",
      d,
      rotacao,
      CASOS.LINHA
    );
  }

  /* ===================== 4) CORREÇÃO APÓS A INSERÇÃO ===================== */

  /** Decide qual caso aplicar, repetindo enquanto houver dois vermelhos seguidos. */
  function corrigirInsercao(no) {
    while (no.pai && no.pai.cor === VERMELHO) {
      const pai = no.pai;
      const avo = pai.pai; // existe: pai é vermelho, logo não é a raiz
      const tio = tioDe(pai, avo);

      registrarPasso(
        "Violação: dois vermelhos seguidos",
        "O nó " + no.valor + " e o pai " + pai.valor + " são vermelhos. Olhamos o tio (" +
          (tio ? tio.valor + ", " : "NIL, que conta como preto") + (tio ? nomeDaCor(tio) : "") + ").",
        destaquesDaFamilia(no, pai, tio, avo)
      );

      if (tio && tio.cor === VERMELHO) {
        no = caso1TioVermelho(no, pai, tio, avo); // e continua o laço
      } else {
        if (ehTriangulo(no, pai, avo)) no = caso2Triangulo(no, pai, avo);
        caso3Linha(no);
        break; // após o Caso 3 não há mais violação
      }
    }
    garantirRaizPreta();
  }

  /** Propriedade 2: a raiz é sempre preta (pode ter ficado vermelha no Caso 1). */
  function garantirRaizPreta() {
    if (raiz.cor === VERMELHO) {
      raiz.cor = PRETO;
      const d = {};
      d[raiz.id] = "recolorida";
      registrarPasso(
        "Raiz sempre preta",
        "A raiz ficou vermelha após as recolorações. Pintamos de preto: todos os caminhos ganham " +
          "um nó preto, mantendo a igualdade.",
        d
      );
    } else {
      registrarPasso("Árvore válida", "Nenhuma regra foi violada. Inserção concluída.");
    }
  }

  /* ========================= 5) INTERFACE PÚBLICA ========================= */

  /**
   * Insere um valor, gera os passos e devolve o índice do primeiro passo
   * dessa inserção (para o visual saber de onde começar a mostrar).
   */
  function inserir(valor) {
    const primeiroPasso = passos.length;

    // Descida normal de árvore binária de busca
    let pai = null;
    let atual = raiz;
    while (atual) {
      if (valor === atual.valor) {
        registrarPasso("Valor repetido", "O valor " + valor + " já está na árvore. Nada foi alterado.");
        return primeiroPasso;
      }
      pai = atual;
      atual = valor < atual.valor ? atual.esq : atual.dir;
    }

    const novo = criarNo(valor, pai);
    if (!pai) raiz = novo;
    else if (valor < pai.valor) pai.esq = novo;
    else pai.dir = novo;

    const d = {};
    d[novo.id] = "novo";
    registrarPasso(
      "Inserção como em uma árvore binária de busca",
      "O " + valor + " entra como folha e nasce vermelho, para não alterar a altura negra. " +
        "Resta checar se o pai também é vermelho.",
      d
    );

    corrigirInsercao(novo);
    return primeiroPasso;
  }

  function limpar() {
    raiz = null;
    passos = [];
  }

  return {
    VERMELHO: VERMELHO,
    PRETO: PRETO,
    inserir: inserir,
    limpar: limpar,
    obterPassos: function () { return passos; },
  };
})();
