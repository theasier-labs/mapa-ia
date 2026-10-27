import { classificarTarefa, REGRAS_TEXTO } from './classify';
import type { Julgamento, Regra, Repeticao, CustoErro } from './types';

const t = (repeticao: Repeticao, regra: Regra, julgamento: Julgamento, custoErro: CustoErro = 'baixo') => classificarTarefa({ repeticao, regra, julgamento, custoErro });

describe('classificação das tarefas (Mapa de IA, RF-03)', () => {
  it('R1: sempre igual, regra escrita e sem julgamento -> automatizar', () => {
    expect(t('sempre', 'sim', 'nao')).toEqual(jasmine.objectContaining({ classe: 'automatizar', regra: 'R1' }));
    expect(t('sempre', 'sim', 'nao', 'medio').classe).toBe('automatizar');
  });

  it('R5: o mesmo caso da R1, mas se o erro custa caro, a IA só propõe', () => {
    const r = t('sempre', 'sim', 'nao', 'alto');
    expect(r).toEqual(jasmine.objectContaining({ classe: 'ia-propoe', regra: 'R5' }));
    expect(r.porque.join(' ')).toContain('o erro custa caro');
  });

  it('R2: exige julgamento e a regra não existe ou é parcial -> manter manual', () => {
    expect(t('quase', 'nao', 'sim')).toEqual(jasmine.objectContaining({ classe: 'manual', regra: 'R2' }));
    expect(t('sempre', 'parte', 'sim')).toEqual(jasmine.objectContaining({ classe: 'manual', regra: 'R2' }));
  });

  it('R3: muda a cada vez e sem regra escrita -> manter manual', () => {
    expect(t('varia', 'nao', 'nao')).toEqual(jasmine.objectContaining({ classe: 'manual', regra: 'R3' }));
    expect(t('varia', 'nao', 'as-vezes')).toEqual(jasmine.objectContaining({ classe: 'manual', regra: 'R3' }));
  });

  it('R4: os casos do meio -> a IA propõe e a pessoa aprova', () => {
    for (const [a, b, c] of [['quase', 'parte', 'as-vezes'], ['sempre', 'parte', 'nao'], ['varia', 'sim', 'nao'], ['sempre', 'sim', 'as-vezes'], ['quase', 'sim', 'sim']] as const) {
      expect(t(a, b, c)).withContext(`${a}/${b}/${c}`).toEqual(jasmine.objectContaining({ classe: 'ia-propoe', regra: 'R4' }));
    }
  });

  it('toda combinação das três respostas cai em exatamente uma classe, e o "porquê" cita as três respostas', () => {
    const rep: Repeticao[] = ['sempre', 'quase', 'varia'];
    const reg: Regra[] = ['sim', 'parte', 'nao'];
    const jul: Julgamento[] = ['nao', 'as-vezes', 'sim'];
    let total = 0;
    for (const a of rep) for (const b of reg) for (const c of jul) {
      const r = t(a, b, c);
      total++;
      expect(['automatizar', 'ia-propoe', 'manual']).toContain(r.classe);
      expect(r.porque.length).toBeGreaterThanOrEqual(3);
      expect(r.regra).toMatch(/^R[1-5]$/);
    }
    expect(total).toBe(27);
  });

  it('a tabela de regras mostrada na página cobre as cinco regras e os três resultados', () => {
    expect(REGRAS_TEXTO.map((r) => r.id).sort()).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
    expect(new Set(REGRAS_TEXTO.map((r) => r.resultado))).toEqual(new Set(['automatizar', 'ia-propoe', 'manual']));
  });
});
