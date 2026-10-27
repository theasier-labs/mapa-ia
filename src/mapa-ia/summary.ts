import { CLASSE_ROTULO } from './labels';
import { formatarMinutos, formatarPercentual } from './format';
import type { MapaRelatorio } from './types';

/**
 * Resumo em texto puro, para copiar ou (só se a pessoa pedir) enviar junto do contato. Cabe no campo
 * "processo" do formulário (2000 caracteres): se passar, as últimas tarefas saem e o texto avisa quantas.
 */
export function resumoEmTexto(r: MapaRelatorio, limite = 1900): string {
  const topo = [
    `Mapa de IA no meu processo: ${r.processo}`,
    `${r.pessoas} ${r.pessoas === 1 ? 'pessoa faz' : 'pessoas fazem'} estas tarefas. Tempo por semana: ${r.totais.minutosSemana.value}. Economia estimada: ${r.totais.economiaSemana.value} por semana (${r.totais.economiaMes.value} por mês).`,
    '',
  ];
  const fim = ['', `Fatores usados: automatizar ${formatarPercentual(r.fatores.automatizar.valor)}, IA propõe ${formatarPercentual(r.fatores['ia-propoe'].valor)}, manual ${formatarPercentual(r.fatores.manual.valor)}. Estimativa feita no Mapa de IA da Theasier; não é promessa de economia.`];
  const linhas = r.tarefas.map((t, i) => `${i + 1}. ${t.nome}: ${CLASSE_ROTULO[t.classe]}${t.origemClasse === 'usuario' ? ' (escolha minha)' : ''}; ${t.minutosSemana.value} por semana, economia ${t.economiaSemana.value}.`);

  const montar = (n: number): string => {
    const omitidas = linhas.length - n;
    const corpo = linhas.slice(0, n);
    if (omitidas > 0) corpo.push(`(+${omitidas} ${omitidas === 1 ? 'tarefa omitida' : 'tarefas omitidas'} por limite de tamanho)`);
    return [...topo, ...corpo, ...fim].join('\n');
  };
  let n = linhas.length;
  let texto = montar(n);
  while (texto.length > limite && n > 0) texto = montar(--n);
  return texto.length > limite ? texto.slice(0, limite - 1) + '…' : texto;
}
