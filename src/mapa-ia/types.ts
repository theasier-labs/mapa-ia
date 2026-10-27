import type { Origin } from '../core/origin';

/** O passo a passo desta tarefa é sempre o mesmo? */
export type Repeticao = 'sempre' | 'quase' | 'varia';
/** Dá para escrever a regra de como fazer? */
export type Regra = 'sim' | 'parte' | 'nao';
/** Exige julgamento ou conversa com pessoas? */
export type Julgamento = 'nao' | 'as-vezes' | 'sim';
/** Se errar, o dano é... */
export type CustoErro = 'baixo' | 'medio' | 'alto';
/** O que fazer com a tarefa. */
export type Classe = 'automatizar' | 'ia-propoe' | 'manual';

export const CLASSES: readonly Classe[] = ['automatizar', 'ia-propoe', 'manual'];

export interface TarefaInput {
  id: string;
  nome: string;
  /** Minutos por vez (inteiro, 1 a 960). */
  minutosPorVez: number;
  /** Vezes por semana por pessoa; aceita fração (0,25 = uma vez por mês). */
  vezesPorSemana: number;
  repeticao: Repeticao;
  regra: Regra;
  julgamento: Julgamento;
  /** Envolve dados pessoais ou financeiros de terceiros? */
  dadosPessoais: boolean;
  custoErro: CustoErro;
  /** Classe que a pessoa escolheu no lugar da sugerida (a decisão é dela). */
  classeEscolhida?: Classe;
}

export interface ProcessoInput {
  nome: string;
  /** Quantas pessoas fazem estas tarefas, cada uma com a frequência informada. */
  pessoas: number;
  tarefas: TarefaInput[];
}

/** Fração do tempo da tarefa que se espera economizar, por classe (0 a 1). */
export type Fatores = Record<Classe, number>;

export interface Explicado {
  label: string;
  /** Texto pronto para mostrar. */
  value: string;
  /** Valor em minutos (ou número puro), para somar sem erro de formatação. */
  bruto: number;
  formula: string;
  inputs: { label: string; value: string }[];
  fonte: string;
  origem: Origin;
}

export interface TarefaResultado {
  id: string;
  nome: string;
  classeSugerida: Classe;
  /** Qual regra da tabela decidiu (R1 a R5), para a pessoa conferir. */
  regraAplicada: string;
  porque: string[];
  classe: Classe;
  origemClasse: 'regra' | 'usuario';
  minutosSemana: Explicado;
  economiaSemana: Explicado;
  riscos: string[];
}

export interface MapaRelatorio {
  processo: string;
  pessoas: number;
  tarefas: TarefaResultado[];
  contagem: Record<Classe, number>;
  totais: { minutosSemana: Explicado; economiaSemana: Explicado; economiaMes: Explicado };
  fatores: Record<Classe, { valor: number; origem: 'regra' | 'usuario' }>;
  riscosGerais: string[];
  avisos: string[];
}

export interface ErroValidacao {
  campo: string;
  mensagem: string;
}
