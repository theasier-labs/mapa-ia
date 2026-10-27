/** Minutos -> "45 min", "1 h 30 min", "12 h". Sempre inteiro de minutos (sem fração de minuto). */
export function formatarMinutos(total: number): string {
  const m = Math.round(total);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

/** 0.5 -> "50%". */
export const formatarPercentual = (fracao: number): string => `${Math.round(fracao * 100)}%`;

/** Número com vírgula decimal e no máximo uma casa: 4.5 -> "4,5", 2 -> "2". */
export const formatarNumero = (n: number): string => (Math.round(n * 10) / 10).toString().replace('.', ',');
