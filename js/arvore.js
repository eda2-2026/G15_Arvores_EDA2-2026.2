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

   SOBRE O NIL
   O NIL não é "null": é um nó de verdade (um só, compartilhado por toda
   a árvore), sempre PRETO, com um valor impossível (MAXINT) que serve
   apenas para reconhecê-lo como "nada". Toda folha aponta para ele.
   Na remoção ele pode virar o "duplo-preto" (N), como na Wikipedia.

   CASOS (mesma numeração da Wikipedia, "Red–black tree"):
     Inserção (5 casos)
       1. N é a raiz                         -> pintar de preto
       2. Pai preto                          -> nada a fazer
       3. Pai e tio vermelhos                -> recolorir e subir
       4. Pai vermelho, tio preto, TRIÂNGULO -> rotacionar o pai
       5. Pai vermelho, tio preto, LINHA     -> recolorir e rotacionar o avô
     Remoção (6 casos)
       1. N é a nova raiz                    -> terminou
       2. Irmão (S) vermelho                 -> recolorir e rotacionar P
       3. P, S e filhos de S pretos          -> S fica vermelho, sobe para P
       4. P vermelho, S e filhos pretos      -> trocar cores de P e S
       5. S preto, sobrinho interno vermelho -> rotacionar S (triângulo)
       6. S preto, sobrinho externo vermelho -> recolorir e rotacionar P
   ===================================================================== */
const ArvoreRN = (function () {
  const VERMELHO = "V";
  const PRETO = "P";
  const MAXINT = 2147483647; // valor "impossível": só identifica o NIL

  /* Nomes dos casos exibidos na tela (numeração da Wikipedia). */
  const CASOS = {
    // Inserção
    INS_1: "Caso 1 - Inserção",
    INS_2: "Caso 2 - Inserção",
    INS_3: "Caso 3 - Inserção",
    INS_4: "Caso 4 - Inserção",
    INS_5: "Caso 5 - Inserção",
    // Remoção
    REM_1: "Caso 1 - Remoção",
    REM_2: "Caso 2 - Remoção",
    REM_3: "Caso 3 - Remoção",
    REM_4: "Caso 4 - Remoção",
    REM_5: "Caso 5 - Remoção",
    REM_6: "Caso 6 - Remoção"
  };

  /** O NIL: nó único, preto, compartilhado. "pai" só é usado na remoção. */
  const NIL = { id: "NIL", valor: MAXINT, cor: PRETO, esq: null, dir: null, pai: null };

  let raiz = NIL;    // raiz da árvore "viva" (NIL = árvore vazia)
  let ultimoId = 0;  // gerador de identificadores únicos dos nós
  let passos = [];   // histórico de fotografias, uma por etapa
  let duploPreto = null; // nó que carrega o "preto extra" durante a remoção

  /* ===================== 1) ESTRUTURA E AUXILIARES ===================== */

  /** Cria um nó novo. Todo nó inserido começa VERMELHO e com dois filhos NIL. */
  function criarNo(valor, pai) {
    return { id: ++ultimoId, valor: valor, cor: VERMELHO, esq: NIL, dir: NIL, pai: pai };
  }

  /**
   * Copia a árvore SEM o ponteiro "pai" (cópia segura para o histórico).
   * O NIL vira null na cópia (o visual desenha os quadradinhos NIL), exceto
   * quando é o duplo-preto da remoção: aí vira um nó "NIL" destacável.
   */
  function copiar(no) {
    if (no === NIL) return null;
    let jaMarcou = false;
    function filho(f) {
      if (f !== NIL) return copiar(f);
      if (!jaMarcou && duploPreto === NIL && NIL.pai === no) {
        jaMarcou = true;
        return { id: NIL.id, valor: "NIL", cor: PRETO, ehSentinela: true, esq: null, dir: null };
      }
      return null;
    }
    return {
      id: no.id,
      valor: no.valor,
      cor: no.cor,
      ehSentinela: false,
      esq: filho(no.esq),
      dir: filho(no.dir)
    };
  }

  /**
   * Guarda uma fotografia da árvore neste instante.
   *  - titulo/descricao: texto explicativo mostrado ao aluno
   *  - destaques: { idDoNo: "rótulo" } para marcar novo, pai, tio, avô...
   *  - rotacao: dados da rotação feita neste passo (ou null)
   *  - caso: nome do caso aplicado, ex. "Caso 3 - Inserção" (ou null)
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

  /** Tio = irmão do pai (o outro filho do avô). Pode ser o NIL. */
  function tioDe(pai, avo) {
    return pai === avo.esq ? avo.dir : avo.esq;
  }

  /** Irmão de n (o outro filho do pai de n). */
  function irmaoDe(n) {
    return n === n.pai.esq ? n.pai.dir : n.pai.esq;
  }

  function nomeDaCor(no) {
    return no === NIL ? "preto (NIL)" : (no.cor === VERMELHO ? "vermelho" : "preto");
  }

  function destaquesDaFamilia(no, pai, tio, avo) {
    const d = {};
    d[no.id] = "novo";
    d[pai.id] = "pai";
    d[avo.id] = "avô";
    if (tio !== NIL) d[tio.id] = "tio";
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
      if (y.esq !== NIL) y.esq.pai = x;
    } else {
      x.esq = y.dir;
      if (y.dir !== NIL) y.dir.pai = x;
    }

    // 2. y ocupa o lugar de x, ligando-se ao antigo pai de x
    y.pai = x.pai;
    if (x.pai === null) raiz = y;
    else if (x === x.pai.esq) x.pai.esq = y;
    else x.pai.dir = y;

    // 3. x vira filho de y, do lado oposto ao da rotação
    if (paraEsquerda) y.esq = x;
    else y.dir = x;
    x.pai = y;

    return { topoAntigo: x.id, topoNovo: y.id, sentido: sentido };
  }

  /* ====================== 3) OS CINCO CASOS DE INSERÇÃO ====================== */

  /**
   * CASO 1 — N é a RAIZ.
   * Solução: pintar de preto (propriedade 2). Isso soma um nó preto em
   * todos os caminhos de uma vez, então a propriedade 5 não é violada.
   */
  function insercaoCaso1(no) {
    no.cor = PRETO;
    const d = {};
    d[no.id] = "raiz";
    registrarPasso(
      "Raiz sempre preta",
      "O nó " + no.valor + " é a raiz. Pintamos de preto (propriedade 2). Como todos os caminhos " +
        "passam pela raiz, todos ganham um nó preto e a igualdade da altura negra se mantém.",
      d,
      null,
      CASOS.INS_1
    );
  }

  /**
   * CASO 2 — o PAI é PRETO.
   * Nada a fazer: um nó vermelho sob pai preto não viola a propriedade 4,
   * e a altura negra não mudou (o novo nó vermelho tem dois NIL pretos).
   */
  function insercaoCaso2(no, pai) {
    const d = {};
    d[no.id] = "novo";
    d[pai.id] = "pai";
    registrarPasso(
      "Pai preto: árvore válida",
      "O pai (" + pai.valor + ") é preto, então não há dois vermelhos seguidos (propriedade 4). " +
        "A altura negra não mudou. A árvore continua válida e a inserção termina.",
      d,
      null,
      CASOS.INS_2
    );
  }

  /**
   * CASO 3 — pai e tio VERMELHOS.
   * Solução: só recolorir. Pai e tio ficam pretos, o avô fica vermelho.
   * A altura negra não muda, mas o avô agora pode violar a regra com o
   * bisavô; por isso devolvemos o avô para repetir a análise a partir dele.
   */
  function insercaoCaso3(no, pai, tio, avo) {
    pai.cor = PRETO;
    tio.cor = PRETO;
    avo.cor = VERMELHO;
    registrarPasso(
      "Recolorir pai, tio e avô",
      "Pai e tio são vermelhos: recolorimos os dois para preto e o avô (" + avo.valor + ") para vermelho. " +
        "A violação pode subir, então repetimos a análise a partir do avô.",
      destaquesDaFamilia(no, pai, tio, avo),
      null,
      CASOS.INS_3
    );
    return avo; // próximo nó a ser analisado
  }

  /**
   * CASO 4 — pai VERMELHO, tio PRETO e N em TRIÂNGULO (por "dentro").
   * Solução: uma rotação no PAI, que transforma o triângulo em linha reta.
   * Depois disso, aplica-se o Caso 5. Devolve o nó que agora é o "filho"
   * da linha reta (o antigo pai).
   */
  function insercaoCaso4(no, pai, avo) {
    const sentido = pai === avo.esq ? "esq" : "dir";
    const rotacao = rotacionar(pai, sentido);
    const d = {};
    d[no.id] = "pai";
    d[pai.id] = "novo";
    d[avo.id] = "avô";
    registrarPasso(
      "Rotação no pai",
      "O pai é vermelho, o tio é preto e o nó está “dobrado” em relação ao avô. Uma rotação " +
        (sentido === "esq" ? "à esquerda" : "à direita") +
        " no pai transforma o triângulo em linha reta (" + CASOS.INS_5 + ").",
      d,
      rotacao,
      CASOS.INS_4
    );
    return pai;
  }

  /**
   * CASO 5 — pai VERMELHO, tio PRETO e N em LINHA RETA com o avô (por "fora").
   * Solução: pai fica preto, avô fica vermelho e rotaciona-se o AVÔ para
   * o lado oposto ao do nó. A altura negra é preservada e a violação some.
   */
  function insercaoCaso5(no) {
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
      CASOS.INS_5
    );
  }

  /* ===================== 4) REPARO APÓS A INSERÇÃO ===================== */

  /** Decide qual caso aplicar, repetindo só quando o Caso 3 empurra a violação para cima. */
  function repararInsercao(no) {
    while (true) {
      if (no.pai === null) { insercaoCaso1(no); return; }
      if (no.pai.cor === PRETO) { insercaoCaso2(no, no.pai); return; }

      const pai = no.pai;
      const avo = pai.pai; // existe: pai é vermelho, logo não é a raiz
      const tio = tioDe(pai, avo);

      registrarPasso(
        "Violação: dois vermelhos seguidos",
        "O nó " + no.valor + " e o pai " + pai.valor + " são vermelhos. Olhamos o tio (" +
          (tio === NIL ? "NIL, que conta como preto" : tio.valor + ", " + nomeDaCor(tio)) + ").",
        destaquesDaFamilia(no, pai, tio, avo)
      );

      if (tio.cor === VERMELHO) {
        no = insercaoCaso3(no, pai, tio, avo); // e continua o laço
      } else {
        if (ehTriangulo(no, pai, avo)) no = insercaoCaso4(no, pai, avo);
        insercaoCaso5(no);
        return; // após o Caso 5 não há mais violação
      }
    }
  }

  /* ========================= 5) INTERFACE: INSERIR ========================= */

  /**
   * Insere um valor, gera os passos e devolve o índice do primeiro passo
   * dessa inserção (para o visual saber de onde começar a mostrar).
   */
  function inserir(valor) {
    const primeiroPasso = passos.length;

    // Descida normal de árvore binária de busca
    let pai = null;
    let atual = raiz;
    while (atual !== NIL) {
      if (valor === atual.valor) {
        registrarPasso("Valor repetido", "O valor " + valor + " já está na árvore. Nada foi alterado.");
        return primeiroPasso;
      }
      pai = atual;
      atual = valor < atual.valor ? atual.esq : atual.dir;
    }

    const novo = criarNo(valor, pai);
    if (pai === null) raiz = novo;
    else if (valor < pai.valor) pai.esq = novo;
    else pai.dir = novo;

    const d = {};
    d[novo.id] = "novo";
    registrarPasso(
      "Inserção como em uma árvore binária de busca",
      "O " + valor + " entra no lugar de um NIL, nasce vermelho (não altera a altura negra) e ganha " +
        "dois filhos NIL pretos. Resta checar a raiz e a cor do pai.",
      d
    );

    repararInsercao(novo);
    return primeiroPasso;
  }

  /* ====================== 6) OS SEIS CASOS DE REMOÇÃO ====================== */
  /*
   * Quando um nó preto é removido, a altura negra do caminho é reduzida.
   * O nó que o substitui (N, que pode ser o NIL) herda um "preto extra"
   * (duplo-preto). Os casos abaixo restauram o balanceamento analisando
   * N, o pai (P), o irmão (S) e os sobrinhos (filhos de S).
   */

  /**
   * CASO 1 (Remoção) — N é a NOVA RAIZ.
   * Terminou: removemos um preto de todos os caminhos de uma vez e a raiz
   * é preta, então as propriedades continuam valendo.
   * Devolve true se o caso se aplica.
   */
  function remocaoCaso1(n) {
    if (n.pai !== null) return false;
    const d = {};
    d[n.id] = "raiz";
    registrarPasso(
      "N é a nova raiz",
      "O nó com o preto extra chegou à raiz. Todos os caminhos perderam exatamente um nó preto, " +
        "então a altura negra continua igual para todos. Correção concluída.",
      d,
      null,
      CASOS.REM_1
    );
    return true;
  }

  /**
   * CASO 2 (Remoção) — irmão (S) VERMELHO.
   * Inverte as cores de P e S e rotaciona P em direção a N. Agora N tem
   * irmão preto e pai vermelho, e seguimos para os casos 3, 4, 5 ou 6.
   * Devolve o novo irmão.
   */
  function remocaoCaso2(n, pai, irmao, ehEsquerda) {
    irmao.cor = PRETO;
    pai.cor = VERMELHO;
    const sentido = ehEsquerda ? "esq" : "dir";
    const rotacao = rotacionar(pai, sentido);
    const d = {};
    d[n.id] = "duplo-preto";
    d[pai.id] = "pai";
    d[irmao.id] = "irmão";
    registrarPasso(
      "Irmão vermelho",
      "O irmão (" + irmao.valor + ") é vermelho. Invertemos as cores do pai (" + pai.valor +
        ") e do irmão, e rotacionamos o pai à " + (sentido === "esq" ? "esquerda" : "direita") +
        ". O novo irmão é preto e o pai é vermelho: seguimos para os próximos casos.",
      d,
      rotacao,
      CASOS.REM_2
    );
    return ehEsquerda ? pai.dir : pai.esq;
  }

  /**
   * CASO 3 (Remoção) — P, S e os filhos de S PRETOS.
   * Pinta S de vermelho: os caminhos de S perdem um preto, igualando com
   * os de N. Mas tudo sob P ficou com um preto a menos, então o duplo-preto
   * sobe para P e a análise recomeça (Caso 1) a partir dele.
   */
  function remocaoCaso3(n, pai, irmao) {
    irmao.cor = VERMELHO;
    const d = {};
    d[n.id] = "antigo duplo-preto";
    d[irmao.id] = "irmão";
    d[pai.id] = "duplo-preto";
    registrarPasso(
      "Pai, irmão e sobrinhos pretos",
      "O pai (" + pai.valor + "), o irmão (" + irmao.valor + ") e os filhos do irmão são pretos. " +
        "Recolorimos o irmão para vermelho. Os caminhos sob o pai ainda têm um preto a menos, " +
        "então o duplo-preto sobe para o pai e repetimos a análise.",
      d,
      null,
      CASOS.REM_3
    );
    return pai;
  }

  /**
   * CASO 4 (Remoção) — P VERMELHO, S e os filhos de S PRETOS.
   * Troca as cores de P e S: P fica preto (devolve o preto que faltava
   * no lado de N) e S fica vermelho. Termina.
   */
  function remocaoCaso4(n, pai, irmao) {
    irmao.cor = VERMELHO;
    pai.cor = PRETO;
    const d = {};
    d[n.id] = "resolvido";
    d[irmao.id] = "irmão";
    d[pai.id] = "pai (absorve)";
    registrarPasso(
      "Pai vermelho, irmão e sobrinhos pretos",
      "O irmão (" + irmao.valor + ") e seus filhos são pretos, mas o pai (" + pai.valor +
        ") é vermelho. Trocamos as cores: o pai fica preto e o irmão vermelho. " +
        "Os caminhos de N ganham o preto que faltava e os do irmão não mudam. Correção concluída.",
      d,
      null,
      CASOS.REM_4
    );
  }

  /**
   * CASO 5 (Remoção) — S PRETO, sobrinho INTERNO vermelho e EXTERNO preto (triângulo).
   * Rotaciona S para o lado oposto a N e troca as cores de S e do novo pai.
   * Nenhum caminho muda sua altura negra e caímos no Caso 6.
   * Devolve o novo irmão.
   */
  function remocaoCaso5(n, pai, irmao, sobrinhoInterno, ehEsquerda) {
    sobrinhoInterno.cor = PRETO;
    irmao.cor = VERMELHO;
    const sentido = ehEsquerda ? "dir" : "esq";
    const rotacao = rotacionar(irmao, sentido);
    const d = {};
    d[n.id] = "duplo-preto";
    d[irmao.id] = "antigo irmão";
    d[sobrinhoInterno.id] = "novo irmão";
    d[pai.id] = "pai";
    registrarPasso(
      "Sobrinho interno vermelho (triângulo)",
      "O irmão é preto, o sobrinho interno (" + sobrinhoInterno.valor + ") é vermelho e o externo é preto. " +
        "Rotacionamos o irmão à " + (sentido === "dir" ? "direita" : "esquerda") +
        " e trocamos as cores dele e do novo pai. Agora o sobrinho externo é vermelho (" + CASOS.REM_6 + ").",
      d,
      rotacao,
      CASOS.REM_5
    );
    return ehEsquerda ? pai.dir : pai.esq;
  }

  /**
   * CASO 6 (Remoção) — S PRETO e sobrinho EXTERNO VERMELHO (linha reta).
   * S herda a cor de P, P e o sobrinho externo ficam pretos, e rotaciona-se
   * P em direção a N. N ganha um preto como ancestral: violação eliminada.
   */
  function remocaoCaso6(n, pai, irmao, ehEsquerda) {
    const sobrinhoExterno = ehEsquerda ? irmao.dir : irmao.esq;
    irmao.cor = pai.cor;
    pai.cor = PRETO;
    sobrinhoExterno.cor = PRETO;
    const sentido = ehEsquerda ? "esq" : "dir";
    const rotacao = rotacionar(pai, sentido);
    const d = {};
    d[irmao.id] = "irmão";
    d[pai.id] = "antigo pai";
    d[sobrinhoExterno.id] = "sobrinho";
    registrarPasso(
      "Sobrinho externo vermelho (linha reta)",
      "O sobrinho externo (" + sobrinhoExterno.valor + ") é vermelho. O irmão (" + irmao.valor +
        ") herda a cor do pai (" + pai.valor + "), o pai e o sobrinho ficam pretos, e rotacionamos o pai à " +
        (sentido === "esq" ? "esquerda" : "direita") + ". Os caminhos de N ganham um preto: altura negra restaurada.",
      d,
      rotacao,
      CASOS.REM_6
    );
  }

  /* ===================== 7) REPARO APÓS A REMOÇÃO ===================== */

  /**
   * Corrige a perda de altura negra (duplo-preto) em N. Segue a ordem da
   * Wikipedia: caso 1, depois 2, depois 3/4/5/6. Só o Caso 3 repete o laço.
   */
  function repararRemocao(n) {
    while (true) {
      duploPreto = n;
      if (remocaoCaso1(n)) return;

      const pai = n.pai;
      const ehEsquerda = (n === pai.esq);
      let irmao = ehEsquerda ? pai.dir : pai.esq;

      if (irmao.cor === VERMELHO) irmao = remocaoCaso2(n, pai, irmao, ehEsquerda);

      const sobrinhoInterno = ehEsquerda ? irmao.esq : irmao.dir;
      const sobrinhoExterno = ehEsquerda ? irmao.dir : irmao.esq;

      if (sobrinhoInterno.cor === PRETO && sobrinhoExterno.cor === PRETO) {
        if (pai.cor === PRETO) {
          n = remocaoCaso3(n, pai, irmao); // o duplo-preto sobe
          continue;
        }
        remocaoCaso4(n, pai, irmao);
        return;
      }

      if (sobrinhoExterno.cor === PRETO) {
        irmao = remocaoCaso5(n, pai, irmao, sobrinhoInterno, ehEsquerda);
      }
      remocaoCaso6(n, pai, irmao, ehEsquerda);
      return;
    }
  }

  /** Coloca "filho" no lugar de "no" (sob o pai de "no"). Se filho for o NIL, ele guarda o pai. */
  function substituir(no, filho) {
    filho.pai = no.pai;
    if (no.pai === null) raiz = filho;
    else if (no === no.pai.esq) no.pai.esq = filho;
    else no.pai.dir = filho;
  }

  /* ========================= 8) INTERFACE: REMOVER ========================= */

  /** Remove um valor da árvore, gerando os passos explicativos. */
  function remover(valor) {
    const primeiroPasso = passos.length;

    if (raiz === NIL) {
      registrarPasso("Árvore vazia", "Não há nós para remover.");
      return primeiroPasso;
    }

    // 1. Busca o nó com o valor
    let z = raiz;
    while (z !== NIL && z.valor !== valor) {
      z = valor < z.valor ? z.esq : z.dir;
    }

    if (z === NIL) {
      registrarPasso("Valor não encontrado", "O valor " + valor + " não está presente na árvore.");
      return primeiroPasso;
    }

    const dInicial = {};
    dInicial[z.id] = "remover";
    registrarPasso("Nó localizado", "O nó com valor " + valor + " foi localizado para remoção.", dInicial);

    // 2. Se o nó tem dois filhos (não-NIL), usa o sucessor in-order
    let m = z; // m = nó que realmente sai da árvore (tem no máximo um filho não-NIL)
    if (z.esq !== NIL && z.dir !== NIL) {
      let sucessor = z.dir;
      while (sucessor.esq !== NIL) sucessor = sucessor.esq;

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
      m = sucessor;
    }

    // 3. Substitui m pelo seu filho c (que pode ser o NIL)
    const c = m.dir === NIL ? m.esq : m.dir;
    const pai = m.pai;
    substituir(m, c);

    if (m.cor === VERMELHO) {
      // m vermelho só tem filhos NIL: remoção direta, altura negra intacta
      registrarPasso(
        "Folha vermelha removida",
        "O nó " + m.valor + " era uma folha vermelha. Removê-lo não altera a altura negra de nenhum caminho."
      );
    } else if (c.cor === VERMELHO) {
      // m preto com filho vermelho: o filho assume a posição e vira preto
      c.cor = PRETO;
      const d = {};
      d[c.id] = "recolorido";
      registrarPasso(
        "Filho substitui e vira preto",
        "O nó " + m.valor + " era preto e seu único filho (" + c.valor +
          ") era vermelho. O filho assume a posição e é pintado de preto, preservando a altura negra.",
        d
      );
    } else if (c === NIL && pai === null) {
      registrarPasso("Árvore vazia", "A raiz era o único nó e foi removida.");
    } else {
      // m preto e c preto (na prática, c é o NIL): duplo-preto
      duploPreto = c;
      const d = {};
      d[c.id] = "duplo-preto";
      if (pai) d[pai.id] = "pai";
      registrarPasso(
        "Déficit de altura negra (duplo-preto)",
        "O nó " + m.valor + " era preto. Ao ser removido, o NIL no seu lugar herda um preto extra " +
          "(duplo-preto), pois os caminhos por ali perderam um nó preto. É preciso rebalancear.",
        d
      );
      repararRemocao(c);
      duploPreto = null;
      registrarPasso("Árvore válida", "Remoção concluída com sucesso. Todas as 5 propriedades foram mantidas.");
    }

    NIL.pai = null; // o NIL volta a não ter pai
    return primeiroPasso;
  }

  function limpar() {
    raiz = NIL;
    NIL.pai = null;
    duploPreto = null;
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
