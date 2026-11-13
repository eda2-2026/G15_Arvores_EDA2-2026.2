/* =====================================================================
   arvore.js — LÓGICA da árvore vermelho & preto (inserção e remoção)
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
   pode violar a propriedade 4. Os 3 casos de inserção consertam isso.
   Ao remover um nó preto, a altura negra é violada (duplo-preto).
   Os 5 casos de remoção rebalanceiam a árvore.
   ===================================================================== */
const ArvoreRN = (function () {
  const VERMELHO = "V";
  const PRETO = "P";

  /* Nomes dos casos exibidos na tela. */
  const CASOS = {
    // Inserção
    TIO_VERMELHO: "Caso 1 - Inserção",
    TRIANGULO: "Caso 2 - Inserção",
    LINHA: "Caso 3 - Inserção",
    // Remoção (5 casos)
    REM_IRMAO_VERMELHO: "Caso 1 - Remoção",
    REM_PAI_PRETO: "Caso 2 - Remoção",
    REM_PAI_VERMELHO: "Caso 3 - Remoção",
    REM_TRIANGULO: "Caso 4 - Remoção",
    REM_LINHA: "Caso 5 - Remoção"
  };

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
    return {
      id: no.id,
      valor: no.valor,
      cor: no.cor,
      ehSentinela: Boolean(no.ehSentinela),
      esq: copiar(no.esq),
      dir: copiar(no.dir)
    };
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

  function corDe(no) {
    return no ? no.cor : PRETO;
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

  /* ====================== 5) OS CINCO CASOS DE REMOÇÃO ====================== */
  /*
   * Quando um nó preto é removido, a altura negra do caminho é reduzida.
   * O nó substituto (ou a folha sentinela) herda um "preto extra" (duplo-preto).
   * Os 5 casos abaixo restauram o balanceamento analisando o irmão (S),
   * o pai (P) e os sobrinhos (filhos de S).
   */

  /**
   * CASO 1 (Remoção) — Irmão VERMELHO.
   * Inverte cores do pai e do irmão e rotaciona o pai em direção ao nó.
   * Transforma a situação em um dos casos em que o irmão é preto.
   */
  function casoRemocao1IrmaoVermelho(no, pai, irmao, ehEsquerda) {
    irmao.cor = PRETO;
    pai.cor = VERMELHO;
    const sentido = ehEsquerda ? "esq" : "dir";
    const rotacao = rotacionar(pai, sentido);
    const d = {};
    d[no.id] = "duplo-preto";
    d[pai.id] = "pai";
    d[irmao.id] = "irmão";
    registrarPasso(
      "Caso 1 — Irmão vermelho",
      "O irmão (" + irmao.valor + ") é vermelho. Invertemos as cores do pai (" + pai.valor +
        ") e do irmão, e rotacionamos o pai à " + (sentido === "esq" ? "esquerda" : "direita") +
        ". O novo irmão agora é preto, permitindo aplicar um dos outros casos.",
      d,
      rotacao,
      CASOS.REM_IRMAO_VERMELHO
    );
    return ehEsquerda ? pai.dir : pai.esq;
  }

  /**
   * CASO 2 (Remoção) — Irmão PRETO, sobrinhos PRETOS e pai PRETO.
   * Recolore o irmão para vermelho. O duplo-preto sobe para o pai,
   * e a correção continua subindo pela árvore.
   */
  function casoRemocao2IrmaoPretoFilhosPretos(no, pai, irmao) {
    irmao.cor = VERMELHO;
    const d = {};
    d[no.id] = "antigo duplo-preto";
    d[irmao.id] = "irmão";
    d[pai.id] = "duplo-preto";
    registrarPasso(
      "Caso 2 — Irmão e pai pretos",
      "O irmão (" + irmao.valor + ") e seus filhos são pretos, e o pai (" + pai.valor +
        ") também é preto. Recolorimos o irmão para vermelho e o duplo-preto sobe para o pai.",
      d,
      null,
      CASOS.REM_PAI_PRETO
    );
    return pai;
  }

  /**
   * CASO 3 (Remoção) — Irmão PRETO, sobrinhos PRETOS, mas pai VERMELHO.
   * Troca as cores do pai e do irmão: pai fica preto e irmão fica vermelho.
   * O pai absorve o duplo-preto e a árvore volta a ser válida.
   */
  function casoRemocao3IrmaoPretoPaiVermelho(no, pai, irmao) {
    irmao.cor = VERMELHO;
    pai.cor = PRETO;
    const d = {};
    d[no.id] = "resolvido";
    d[irmao.id] = "irmão";
    d[pai.id] = "pai (absorve)";
    registrarPasso(
      "Caso 3 — Irmão preto e pai vermelho",
      "O irmão (" + irmao.valor + ") e seus filhos são pretos, mas o pai (" + pai.valor +
        ") é vermelho. Recolorimos o irmão para vermelho e o pai para preto. O pai absorve o duplo-preto e o balanceamento é concluído.",
      d,
      null,
      CASOS.REM_PAI_VERMELHO
    );
  }

  /**
   * CASO 4 (Remoção) — Irmão PRETO, sobrinho interno VERMELHO, sobrinho externo PRETO (Triângulo).
   * Recolore o irmão e o sobrinho interno e rotaciona o irmão para alinhar em linha reta (Caso 5).
   */
  function casoRemocao4Triangulo(no, pai, irmao, sobrinhoInterno, ehEsquerda) {
    sobrinhoInterno.cor = PRETO;
    irmao.cor = VERMELHO;
    const sentido = ehEsquerda ? "dir" : "esq";
    const rotacao = rotacionar(irmao, sentido);
    const d = {};
    d[no.id] = "duplo-preto";
    d[irmao.id] = "antigo irmão";
    d[sobrinhoInterno.id] = "novo irmão";
    d[pai.id] = "pai";
    registrarPasso(
      "Caso 4 — Sobrinho interno vermelho (triângulo)",
      "O sobrinho interno (" + sobrinhoInterno.valor + ") é vermelho e o externo é preto. Recolorimos e rotacionamos o irmão à " +
        (sentido === "dir" ? "direita" : "esquerda") + " para alinhar os nós em linha reta (" + CASOS.REM_LINHA + ").",
      d,
      rotacao,
      CASOS.REM_TRIANGULO
    );
    return ehEsquerda ? pai.dir : pai.esq;
  }

  /**
   * CASO 5 (Remoção) — Irmão PRETO e sobrinho externo VERMELHO (Linha reta).
   * O irmão herda a cor do pai, pai e sobrinho externo viram pretos,
   * e rotacionamos o pai em direção ao nó com duplo-preto. Violação eliminada.
   */
  function casoRemocao5Linha(no, pai, irmao, sobrinhoExterno, ehEsquerda) {
    irmao.cor = pai.cor;
    pai.cor = PRETO;
    if (sobrinhoExterno) sobrinhoExterno.cor = PRETO;
    const sentido = ehEsquerda ? "esq" : "dir";
    const rotacao = rotacionar(pai, sentido);
    const d = {};
    d[irmao.id] = "irmão";
    d[pai.id] = "antigo pai";
    if (sobrinhoExterno) d[sobrinhoExterno.id] = "sobrinho";
    registrarPasso(
      "Caso 5 — Sobrinho externo vermelho (linha reta)",
      "O sobrinho externo (" + (sobrinhoExterno ? sobrinhoExterno.valor : "") + ") é vermelho. O irmão (" +
        irmao.valor + ") herda a cor do pai (" + pai.valor + "), o pai e o sobrinho ficam pretos, e rotacionamos o pai à " +
        (sentido === "esq" ? "esquerda" : "direita") + ". Altura negra restaurada com sucesso!",
      d,
      rotacao,
      CASOS.REM_LINHA
    );
  }

  /* ===================== 6) CORREÇÃO APÓS A REMOÇÃO ===================== */

  /**
   * Corrige a perda de altura negra (duplo-preto) subindo pela árvore
   * e aplicando um dos 5 casos modulares até restaurar a validade.
   */
  function corrigirRemocao(no) {
    while (no && no !== raiz && corDe(no) === PRETO) {
      const pai = no.pai;
      if (!pai) break;

      const ehEsquerda = (no === pai.esq);
      let irmao = ehEsquerda ? pai.dir : pai.esq;

      if (!irmao) {
        no = pai;
        continue;
      }

      // Caso 1: Irmão é vermelho -> rotaciona pai para torná-lo preto
      if (irmao.cor === VERMELHO) {
        irmao = casoRemocao1IrmaoVermelho(no, pai, irmao, ehEsquerda);
      }

      const sobrinhoInterno = ehEsquerda ? irmao.esq : irmao.dir;
      const sobrinhoExterno = ehEsquerda ? irmao.dir : irmao.esq;

      if (corDe(sobrinhoInterno) === PRETO && corDe(sobrinhoExterno) === PRETO) {
        if (pai.cor === PRETO) {
          // Caso 2: Pai preto -> duplo-preto sobe
          no = casoRemocao2IrmaoPretoFilhosPretos(no, pai, irmao);
        } else {
          // Caso 3: Pai vermelho -> absorve o duplo-preto
          casoRemocao3IrmaoPretoPaiVermelho(no, pai, irmao);
          no = raiz;
          break;
        }
      } else {
        // Pelo menos um sobrinho é vermelho
        if (corDe(sobrinhoExterno) === PRETO) {
          // Caso 4: Triângulo -> alinha em linha reta
          irmao = casoRemocao4Triangulo(no, pai, irmao, sobrinhoInterno, ehEsquerda);
        }
        // Caso 5: Linha reta -> finaliza a restauração
        const novoSobrinhoExterno = ehEsquerda ? irmao.dir : irmao.esq;
        casoRemocao5Linha(no, pai, irmao, novoSobrinhoExterno, ehEsquerda);
        no = raiz;
        break;
      }
    }

    if (no) {
      no.cor = PRETO;
    }
  }

  /**
   * Remove um valor da árvore, gerando os passos explicativos.
   */
  function remover(valor) {
    const primeiroPasso = passos.length;

    if (!raiz) {
      registrarPasso("Árvore vazia", "Não há nós para remover.");
      return primeiroPasso;
    }

    // 1. Busca o nó com o valor
    let z = raiz;
    while (z && z.valor !== valor) {
      z = valor < z.valor ? z.esq : z.dir;
    }

    if (!z) {
      registrarPasso("Valor não encontrado", "O valor " + valor + " não está presente na árvore.");
      return primeiroPasso;
    }

    const dInicial = {};
    dInicial[z.id] = "remover";
    registrarPasso("Nó localizado", "O nó com valor " + valor + " foi localizado para remoção.", dInicial);

    // 2. Se o nó tem dois filhos, substitui pelo sucessor in-order
    let nodeToRemove = z;
    if (z.esq && z.dir) {
      let sucessor = z.dir;
      while (sucessor.esq) sucessor = sucessor.esq;

      const dSucessor = {};
      dSucessor[z.id] = "alvo";
      dSucessor[sucessor.id] = "sucessor";
      registrarPasso(
        "Substituição pelo sucessor",
        "Como o nó " + z.valor + " possui dois filhos, encontramos seu sucessor in-order (" +
          sucessor.valor + "). Copiamos o valor do sucessor para o nó e agora removeremos o sucessor físico.",
        dSucessor
      );

      z.valor = sucessor.valor;
      nodeToRemove = sucessor;
    }

    // Agora nodeToRemove tem no máximo um filho não-nulo
    const filho = nodeToRemove.esq || nodeToRemove.dir;
    const corOriginal = nodeToRemove.cor;
    const pai = nodeToRemove.pai;

    // Caso A: Tem um filho não-nulo (só pode ser filho vermelho de pai preto)
    if (filho) {
      filho.pai = pai;
      if (!pai) raiz = filho;
      else if (nodeToRemove === pai.esq) pai.esq = filho;
      else pai.dir = filho;

      if (corOriginal === PRETO) {
        filho.cor = PRETO;
        const d = {};
        d[filho.id] = "recolorido";
        registrarPasso(
          "Filho substitui e vira preto",
          "O nó " + nodeToRemove.valor + " era preto e seu único filho (" + filho.valor +
            ") era vermelho. O filho assume a posição e é pintado de preto, preservando a altura negra.",
          d
        );
      } else {
        const d = {};
        d[filho.id] = "substituto";
        registrarPasso("Filho assume posição", "O nó " + nodeToRemove.valor + " foi removido e seu filho assumiu a posição.", d);
      }
      return primeiroPasso;
    }

    // Caso B: É folha (não tem filhos não-nulos)
    if (!pai) {
      // Era a raiz e único nó da árvore
      raiz = null;
      registrarPasso("Árvore vazia", "A raiz era o único nó e foi removida.");
      return primeiroPasso;
    }

    if (corOriginal === VERMELHO) {
      // Folha vermelha: remoção direta sem afetar altura negra
      if (nodeToRemove === pai.esq) pai.esq = null;
      else pai.dir = null;

      registrarPasso(
        "Folha vermelha removida",
        "O nó " + nodeToRemove.valor + " era uma folha vermelha. Removê-lo não altera a altura negra de nenhum caminho."
      );
      return primeiroPasso;
    }

    // Folha preta: gera duplo-preto (perda de 1 nó preto no caminho)
    const sentinela = {
      id: ++ultimoId,
      valor: "NIL",
      cor: PRETO,
      ehSentinela: true,
      esq: null,
      dir: null,
      pai: pai
    };

    if (nodeToRemove === pai.esq) pai.esq = sentinela;
    else pai.dir = sentinela;

    const dDuplo = {};
    dDuplo[sentinela.id] = "duplo-preto";
    dDuplo[pai.id] = "pai";
    registrarPasso(
      "Déficit de altura negra (Duplo Preto)",
      "O nó " + nodeToRemove.valor + " era preto. Ao ser removido, o nó NIL em seu lugar herda um preto extra (Duplo Preto), exigindo rebalanceamento.",
      dDuplo
    );

    corrigirRemocao(sentinela);

    // Remove o nó sentinela ao final
    if (sentinela.pai) {
      if (sentinela.pai.esq === sentinela) sentinela.pai.esq = null;
      else if (sentinela.pai.dir === sentinela) sentinela.pai.dir = null;
    } else if (raiz === sentinela) {
      raiz = null;
    }

    registrarPasso("Árvore válida", "Remoção concluída com sucesso. Todas as 5 propriedades foram mantidas.");
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
    remover: remover,
    limpar: limpar,
    obterPassos: function () { return passos; },
  };
})();
