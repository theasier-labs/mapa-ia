import { classificarTarefa } from './classify';
import { CLASSE_ROTULO } from './labels';
import { formatarMinutos, formatarNumero, formatarPercentual } from './format';
import type { Classe, Explicado, Fatores, MapaRelatorio, ProcessoInput, TarefaInput, TarefaResultado } from './types';
import { CLASSES } from './types';

/**
 * Pontos de partida conservadores, sem fonte de medição (decisão D-43-2 do fundador pendente):
 * automatizar quase nunca elimina todo o tempo (exceções, conferência, manutenção) e, quando a IA só propõe,
 * a revisão humana continua. Aparecem como "ponto de partida, edite" e passam a "você" quando a pessoa troca.
 */
export const FATORES_PADRAO: Fatores = { automatizar: 0.5, 'ia-propoe': 0.25, manual: 0 };

const SEMANAS_POR_MES = 52 / 12;
const FONTE_REGRA = 'Cálculo do Mapa de IA da Theasier (regra visível na página)';
const AVISOS = [
  'É uma estimativa para conversar, não uma promessa de economia: os fatores são pontos de partida que você pode trocar.',
  'Nada aqui foi feito por IA: as classes vêm de uma tabela de regras que você vê e pode contestar.',
] as const;

function explicar(e: Omit<Explicado, 'origem' | 'fonte'> & { origem?: Explicado['origem']; fonte?: string }): Explicado {
  return { fonte: FONTE_REGRA, origem: 'regra', ...e };
}

export function riscosDaTarefa(t: TarefaInput, classe: Classe): string[] {
  const r: string[] = [];
  if (classe !== 'manual' && t.dadosPessoais) r.push('Envolve dados pessoais ou financeiros de terceiros: defina onde esses dados podem ser usados e quem revisa.');
  if (classe !== 'manual' && t.custoErro === 'alto') r.push('Se errar, o dano é grande: uma pessoa aprova cada resultado antes de seguir.');
  if (classe === 'ia-propoe' && t.julgamento === 'sim') r.push('Exige julgamento: a IA só propõe, e a decisão é da pessoa.');
  if (classe === 'automatizar' && t.custoErro === 'medio') r.push('Automatizado não é abandonado: confira uma amostra de tempos em tempos.');
  return r;
}

export interface OpcoesRelatorio {
  fatores?: Partial<Fatores>;
}

/** Monta o mapa. Recebe só dados já validados (`validarProcesso`). */
export function montarMapa(entrada: ProcessoInput, opcoes: OpcoesRelatorio = {}): MapaRelatorio {
  const fatores: Fatores = { ...FATORES_PADRAO, ...opcoes.fatores };
  const origemFator = (c: Classe): 'regra' | 'usuario' => (opcoes.fatores?.[c] !== undefined && opcoes.fatores[c] !== FATORES_PADRAO[c] ? 'usuario' : 'regra');

  const tarefas: TarefaResultado[] = entrada.tarefas.map((t) => {
    const sugerida = classificarTarefa(t);
    const classe = t.classeEscolhida ?? sugerida.classe;
    const origemClasse: 'regra' | 'usuario' = t.classeEscolhida && t.classeEscolhida !== sugerida.classe ? 'usuario' : 'regra';

    const minutos = t.minutosPorVez * t.vezesPorSemana * entrada.pessoas;
    const minutosSemana = explicar({
      label: `Tempo por semana: ${t.nome}`,
      value: formatarMinutos(minutos),
      bruto: minutos,
      formula: 'minutos por vez × vezes por semana × pessoas',
      inputs: [
        { label: 'Minutos por vez', value: String(t.minutosPorVez) },
        { label: 'Vezes por semana', value: formatarNumero(t.vezesPorSemana) },
        { label: 'Pessoas', value: String(entrada.pessoas) },
      ],
      origem: 'usuario',
      fonte: 'Os números que você informou',
    });
    const fator = fatores[classe];
    const economia = minutos * fator;
    const economiaSemana = explicar({
      label: `Economia por semana: ${t.nome}`,
      value: formatarMinutos(economia),
      bruto: economia,
      formula: 'tempo por semana × fator da classe',
      inputs: [
        { label: 'Tempo por semana', value: formatarMinutos(minutos) },
        { label: `Fator de "${CLASSE_ROTULO[classe]}"`, value: formatarPercentual(fator) },
      ],
      origem: origemFator(classe),
      fonte: origemFator(classe) === 'usuario' ? 'Fator que você escolheu' : 'Ponto de partida conservador da Theasier, não é medição: troque pelo que vale para você',
    });
    return { id: t.id, nome: t.nome, classeSugerida: sugerida.classe, regraAplicada: sugerida.regra, porque: sugerida.porque, classe, origemClasse, minutosSemana, economiaSemana, riscos: riscosDaTarefa(t, classe) };
  });

  const somaMin = tarefas.reduce((s, t) => s + t.minutosSemana.bruto, 0);
  const somaEco = tarefas.reduce((s, t) => s + t.economiaSemana.bruto, 0);
  const contagem = Object.fromEntries(CLASSES.map((c) => [c, tarefas.filter((t) => t.classe === c).length])) as Record<Classe, number>;
  const economiaMes = somaEco * SEMANAS_POR_MES;

  const riscosGerais: string[] = [];
  const algumaAutomacao = tarefas.some((t) => t.classe !== 'manual');
  if (entrada.pessoas === 1 && algumaAutomacao) riscosGerais.push('Só uma pessoa faz estas tarefas hoje: escreva o passo a passo antes de automatizar, para o processo não depender só dela.');
  const minManual = tarefas.filter((t) => t.classe === 'manual').reduce((s, t) => s + t.minutosSemana.bruto, 0);
  if (somaMin > 0 && minManual / somaMin > 0.5) riscosGerais.push('Mais da metade do tempo está em tarefas que continuam manuais: o ganho com IA aqui é pequeno, e vale rever o processo antes.');

  return {
    processo: entrada.nome.trim(),
    pessoas: entrada.pessoas,
    tarefas,
    contagem,
    totais: {
      minutosSemana: explicar({ label: 'Tempo total por semana', value: formatarMinutos(somaMin), bruto: somaMin, formula: 'soma do tempo por semana de cada tarefa', inputs: tarefas.map((t) => ({ label: t.nome, value: t.minutosSemana.value })), origem: 'usuario', fonte: 'Os números que você informou' }),
      economiaSemana: explicar({ label: 'Economia estimada por semana', value: formatarMinutos(somaEco), bruto: somaEco, formula: 'soma da economia por semana de cada tarefa', inputs: tarefas.map((t) => ({ label: t.nome, value: t.economiaSemana.value })) }),
      economiaMes: explicar({ label: 'Economia estimada por mês', value: formatarMinutos(economiaMes), bruto: economiaMes, formula: 'economia por semana × 52 semanas ÷ 12 meses', inputs: [{ label: 'Economia por semana', value: formatarMinutos(somaEco) }, { label: 'Semanas por mês', value: '4,33 (52 ÷ 12)' }] }),
    },
    fatores: Object.fromEntries(CLASSES.map((c) => [c, { valor: fatores[c], origem: origemFator(c) }])) as MapaRelatorio['fatores'],
    riscosGerais,
    avisos: [...AVISOS],
  };
}
