import type { ProcessoInput } from './types';

/** Exemplo inventado (nada é de ninguém) que percorre as três classes. */
export function processoDeExemplo(): ProcessoInput {
  return {
    nome: 'Fechamento semanal do financeiro (exemplo)',
    pessoas: 2,
    tarefas: [
      { id: 't1', nome: 'Baixar extratos e notas e lançar na planilha', minutosPorVez: 90, vezesPorSemana: 1, repeticao: 'sempre', regra: 'sim', julgamento: 'nao', dadosPessoais: true, custoErro: 'medio' },
      { id: 't2', nome: 'Conferir lançamentos que não bateram', minutosPorVez: 60, vezesPorSemana: 1, repeticao: 'quase', regra: 'parte', julgamento: 'as-vezes', dadosPessoais: true, custoErro: 'alto' },
      { id: 't3', nome: 'Cobrar clientes em atraso', minutosPorVez: 45, vezesPorSemana: 2, repeticao: 'varia', regra: 'nao', julgamento: 'sim', dadosPessoais: true, custoErro: 'medio' },
      { id: 't4', nome: 'Enviar o resumo da semana por e-mail', minutosPorVez: 20, vezesPorSemana: 1, repeticao: 'sempre', regra: 'sim', julgamento: 'nao', dadosPessoais: false, custoErro: 'baixo' },
    ],
  };
}
