import { PORQUE } from './labels';
import type { Classe, TarefaInput } from './types';

export interface Classificacao {
  classe: Classe;
  /** R1 a R5: a regra da tabela que decidiu. */
  regra: string;
  porque: string[];
}

/**
 * Tabela de regras (sem IA): a pessoa vê qual regra decidiu e pode trocar o resultado.
 *
 *  R1  sempre igual + regra escrita + sem julgamento       -> automatizar
 *  R5  (R1) mas o erro custa caro                           -> IA propõe, a pessoa aprova
 *  R2  exige julgamento + regra não ou só em parte          -> manter manual
 *  R3  muda a cada vez + sem regra escrita                  -> manter manual
 *  R4  qualquer outro caso                                  -> IA propõe, a pessoa aprova
 */
export function classificarTarefa(t: Pick<TarefaInput, 'repeticao' | 'regra' | 'julgamento' | 'custoErro'>): Classificacao {
  const porque = [PORQUE.repeticao[t.repeticao], PORQUE.regra[t.regra], PORQUE.julgamento[t.julgamento]];

  if (t.repeticao === 'sempre' && t.regra === 'sim' && t.julgamento === 'nao') {
    if (t.custoErro === 'alto') {
      return { classe: 'ia-propoe', regra: 'R5', porque: [...porque, 'o erro custa caro, então uma pessoa aprova cada resultado'] };
    }
    return { classe: 'automatizar', regra: 'R1', porque };
  }
  if (t.julgamento === 'sim' && (t.regra === 'nao' || t.regra === 'parte')) {
    return { classe: 'manual', regra: 'R2', porque };
  }
  if (t.repeticao === 'varia' && t.regra === 'nao') {
    return { classe: 'manual', regra: 'R3', porque };
  }
  return { classe: 'ia-propoe', regra: 'R4', porque };
}

/** Texto das regras, para a página mostrar a tabela inteira ("mostrar a conta"). */
export const REGRAS_TEXTO: { id: string; quando: string; resultado: Classe }[] = [
  { id: 'R1', quando: 'O passo a passo é sempre o mesmo, dá para escrever as regras, não exige julgamento e o erro não custa caro.', resultado: 'automatizar' },
  { id: 'R5', quando: 'Como a R1, mas o erro custa caro (dinheiro, cliente ou obrigação em jogo).', resultado: 'ia-propoe' },
  { id: 'R2', quando: 'Exige julgamento ou conversa com pessoas e as regras não existem ou só cobrem uma parte.', resultado: 'manual' },
  { id: 'R3', quando: 'Muda a cada vez e não dá para escrever as regras.', resultado: 'manual' },
  { id: 'R4', quando: 'Qualquer outro caso.', resultado: 'ia-propoe' },
];
