import type { Classe, CustoErro, Julgamento, Regra, Repeticao } from './types';

export const CLASSE_ROTULO: Record<Classe, string> = {
  automatizar: 'Automatizar',
  'ia-propoe': 'IA propõe, a pessoa aprova',
  manual: 'Manter manual',
};

export const CLASSE_EXPLICACAO: Record<Classe, string> = {
  automatizar: 'Um programa ou fluxo faz sozinho, e uma pessoa confere uma amostra de tempos em tempos.',
  'ia-propoe': 'A IA faz um rascunho ou uma sugestão; a pessoa revisa e decide antes de seguir.',
  manual: 'Continua com a pessoa: exige julgamento, relacionamento ou não tem um padrão que se possa repetir.',
};

export const REPETICAO_ROTULO: Record<Repeticao, string> = {
  sempre: 'Sim, é sempre o mesmo passo a passo',
  quase: 'Quase sempre igual, com algumas exceções',
  varia: 'Não, muda a cada vez',
};
export const REGRA_ROTULO: Record<Regra, string> = {
  sim: 'Sim, dá para escrever as regras',
  parte: 'Em parte: há regras e há casos fora delas',
  nao: 'Não, depende de quem faz',
};
export const JULGAMENTO_ROTULO: Record<Julgamento, string> = {
  nao: 'Não, é executar o passo a passo',
  'as-vezes': 'Às vezes, em casos fora do comum',
  sim: 'Sim, é decidir ou conversar com pessoas',
};
export const CUSTO_ERRO_ROTULO: Record<CustoErro, string> = {
  baixo: 'Pequeno: corrige depois sem problema',
  medio: 'Médio: gera retrabalho ou um prejuízo contornável',
  alto: 'Grande: dinheiro, cliente ou obrigação em jogo',
};

/** Frases curtas usadas para mostrar o porquê da classificação. */
export const PORQUE = {
  repeticao: { sempre: 'o passo a passo é sempre o mesmo', quase: 'o passo a passo é quase sempre igual', varia: 'o passo a passo muda a cada vez' },
  regra: { sim: 'dá para escrever as regras', parte: 'só parte dá para escrever como regra', nao: 'não dá para escrever as regras' },
  julgamento: { nao: 'não exige julgamento', 'as-vezes': 'às vezes exige julgamento', sim: 'exige julgamento ou conversa com pessoas' },
} as const;
