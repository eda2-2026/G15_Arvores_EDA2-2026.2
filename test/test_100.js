/* =====================================================================
   test_100.js — BATERIA DE 100 TESTES RIGOROSOS DE ÁRVORE RN
   ---------------------------------------------------------------------
   Executa 100 baterias de inserções e remoções aleatórias e valida:
     1. Raiz sempre preta.
     2. Nenhum nó vermelho com filho vermelho.
     3. Altura negra perfeitamente uniforme em todos os caminhos.
     4. Propriedade de busca binária (BST).
     5. Integridade total do conjunto de elementos.
   ===================================================================== */
load("js/arvore.js");

function validarEstrutura(raiz) {
  if (!raiz) return { ok: true, alturaNegra: 0, nos: 0 };

  if (raiz.cor !== ArvoreRN.PRETO) {
    return { ok: false, erro: "Raiz não é preta! Cor = " + raiz.cor };
  }

  let totalNos = 0;

  function verificarNo(no, min, max) {
    if (!no) return 1;
    totalNos++;

    if (min !== null && no.valor <= min) return { erro: "Violação BST: " + no.valor + " <= min " + min };
    if (max !== null && no.valor >= max) return { erro: "Violação BST: " + no.valor + " >= max " + max };

    if (no.cor !== ArvoreRN.PRETO && no.cor !== ArvoreRN.VERMELHO) {
      return { erro: "Cor inválida no nó " + no.valor + ": " + no.cor };
    }

    if (no.cor === ArvoreRN.VERMELHO) {
      if (no.esq && no.esq.cor === ArvoreRN.VERMELHO) {
        return { erro: "Dois vermelhos consecutivos: " + no.valor + " e filho esq " + no.esq.valor };
      }
      if (no.dir && no.dir.cor === ArvoreRN.VERMELHO) {
        return { erro: "Dois vermelhos consecutivos: " + no.valor + " e filho dir " + no.dir.valor };
      }
    }

    const hEsq = verificarNo(no.esq, min, no.valor);
    if (typeof hEsq === "object" && hEsq.erro) return hEsq;

    const hDir = verificarNo(no.dir, no.valor, max);
    if (typeof hDir === "object" && hDir.erro) return hDir;

    if (hEsq !== hDir) {
      return { erro: "Alturas negras distintas no nó " + no.valor + ": esq=" + hEsq + ", dir=" + hDir };
    }

    return hEsq + (no.cor === ArvoreRN.PRETO ? 1 : 0);
  }

  const res = verificarNo(raiz, null, null);
  if (typeof res === "object" && res.erro) return { ok: false, erro: res.erro };
  return { ok: true, alturaNegra: res, nos: totalNos };
}

function obterElementosEmOrdem(raiz) {
  const lista = [];
  function percurso(no) {
    if (!no) return;
    percurso(no.esq);
    lista.push(no.valor);
    percurso(no.dir);
  }
  percurso(raiz);
  return lista;
}

let semente = 123456789;
function pseudoRandom() {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}

let testesPassados = 0;
let erros = [];
let casosEncontrados = {};

function registrarCasos(inicio) {
  const passos = ArvoreRN.obterPassos();
  for (let i = inicio; i < passos.length; i++) {
    if (passos[i].caso) {
      casosEncontrados[passos[i].caso] = (casosEncontrados[passos[i].caso] || 0) + 1;
    }
  }
}

for (let t = 1; t <= 100; t++) {
  ArvoreRN.limpar();

  let nElementos = 10 + Math.floor(pseudoRandom() * 40);
  let conjunto = {};
  let valores = [];

  while (valores.length < nElementos) {
    let v = Math.floor(pseudoRandom() * 500) + 1;
    if (!conjunto[v]) {
      conjunto[v] = true;
      valores.push(v);
    }
  }

  let erroNoTeste = null;
  for (let i = 0; i < valores.length; i++) {
    let tamAnt = ArvoreRN.obterPassos().length;
    ArvoreRN.inserir(valores[i]);
    registrarCasos(tamAnt);

    let passos = ArvoreRN.obterPassos();
    let ultimo = passos[passos.length - 1];
    let val = validarEstrutura(ultimo.arvore);
    if (!val.ok) {
      erroNoTeste = "Falha após inserir " + valores[i] + ": " + val.erro;
      break;
    }
  }

  if (erroNoTeste) {
    erros.push("Teste #" + t + " FALHOU na inserção: " + erroNoTeste);
    continue;
  }

  let passos = ArvoreRN.obterPassos();
  let emOrdem = obterElementosEmOrdem(passos[passos.length - 1].arvore);
  let ordenados = valores.slice().sort((a, b) => a - b);
  let bstValida = emOrdem.length === ordenados.length && emOrdem.every((v, i) => v === ordenados[i]);
  if (!bstValida) {
    erros.push("Teste #" + t + " FALHOU: BST inconsistente");
    continue;
  }

  let paraRemover = valores.slice();
  for (let i = paraRemover.length - 1; i > 0; i--) {
    let j = Math.floor(pseudoRandom() * (i + 1));
    let tmp = paraRemover[i];
    paraRemover[i] = paraRemover[j];
    paraRemover[j] = tmp;
  }

  let qtdRemover = Math.floor(pseudoRandom() * paraRemover.length) + 1;
  let removidos = [];

  for (let i = 0; i < qtdRemover; i++) {
    let alvo = paraRemover[i];
    removidos.push(alvo);
    let tamAnt = ArvoreRN.obterPassos().length;
    ArvoreRN.remover(alvo);
    registrarCasos(tamAnt);

    let p = ArvoreRN.obterPassos();
    let ult = p[p.length - 1];
    let val = validarEstrutura(ult.arvore);
    if (!val.ok) {
      erroNoTeste = "Falha após remover " + alvo + ": " + val.erro;
      break;
    }
  }

  if (erroNoTeste) {
    erros.push("Teste #" + t + " FALHOU na remoção: " + erroNoTeste);
    continue;
  }

  let restantesEsperados = valores.filter(v => removidos.indexOf(v) === -1).sort((a, b) => a - b);
  let pFinal = ArvoreRN.obterPassos();
  let emOrdemFinal = obterElementosEmOrdem(pFinal[pFinal.length - 1].arvore);

  let finalValido = (emOrdemFinal.length === restantesEsperados.length) &&
                    emOrdemFinal.every((v, i) => v === restantesEsperados[i]);

  if (!finalValido) {
    erros.push("Teste #" + t + " FALHOU: conjunto restante incorreto");
    continue;
  }

  testesPassados++;
}

print("==================================================");
print("RELATÓRIO DOS 100 TESTES AUTOMATIZADOS");
print("==================================================");
print("Testes aprovados: " + testesPassados + " / 100");
if (erros.length > 0) {
  print("Erros: " + erros.length);
  for (let e of erros) print("  - " + e);
} else {
  print("Status: 100% DOS TESTES PASSARAM COM SUCESSO!");
}
print("\nCasos exercitados nos 100 testes:");
for (let c in casosEncontrados) {
  print("  • " + c + ": " + casosEncontrados[c] + " vezes");
}
print("==================================================");
