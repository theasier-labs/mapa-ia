import type { ErroValidacao, ProcessoInput } from './types';

export const MAX_TAREFAS = 8;

/** Confere o que a pessoa informou. Devolve todos os problemas de uma vez, com o campo e a mensagem em português. */
export function validarProcesso(p: ProcessoInput): ErroValidacao[] {
  const erros: ErroValidacao[] = [];
  const nomeOk = (s: string, max: number) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max && !/[<>]/.test(s);

  if (!nomeOk(p.nome, 80)) erros.push({ campo: 'processo.nome', mensagem: 'Dê um nome ao processo, com até 80 caracteres e sem < ou >.' });
  if (!Number.isInteger(p.pessoas) || p.pessoas < 1 || p.pessoas > 200) erros.push({ campo: 'processo.pessoas', mensagem: 'Informe quantas pessoas fazem estas tarefas (de 1 a 200).' });
  if (p.tarefas.length < 1) erros.push({ campo: 'tarefas', mensagem: 'Descreva pelo menos uma tarefa.' });
  if (p.tarefas.length > MAX_TAREFAS) erros.push({ campo: 'tarefas', mensagem: `No máximo ${MAX_TAREFAS} tarefas por mapa: escolha as que mais tomam tempo.` });

  p.tarefas.slice(0, MAX_TAREFAS).forEach((t, i) => {
    const n = i + 1;
    if (!nomeOk(t.nome, 80)) erros.push({ campo: `tarefas.${i}.nome`, mensagem: `Tarefa ${n}: dê um nome, com até 80 caracteres e sem < ou >.` });
    if (!Number.isInteger(t.minutosPorVez) || t.minutosPorVez < 1 || t.minutosPorVez > 960) erros.push({ campo: `tarefas.${i}.minutosPorVez`, mensagem: `Tarefa ${n}: informe os minutos de cada vez, de 1 a 960.` });
    if (typeof t.vezesPorSemana !== 'number' || !Number.isFinite(t.vezesPorSemana) || t.vezesPorSemana < 0.25 || t.vezesPorSemana > 100) erros.push({ campo: `tarefas.${i}.vezesPorSemana`, mensagem: `Tarefa ${n}: informe quantas vezes por semana, de 0,25 (uma vez por mês) a 100.` });
  });
  return erros;
}

/** "1,5" ou "1.5" -> 1.5; vazio ou inválido -> null. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}
