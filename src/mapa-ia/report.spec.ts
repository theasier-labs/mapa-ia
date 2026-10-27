import { FATORES_PADRAO, montarMapa, riscosDaTarefa } from './report';
import { resumoEmTexto } from './summary';
import { processoDeExemplo } from './sample';
import { formatarMinutos } from './format';
import { lerNumero, MAX_TAREFAS, validarProcesso } from './validate';
import type { ProcessoInput } from './types';

describe('o mapa e a conta das horas (Mapa de IA, RF-03 a RF-05)', () => {
  const mapa = () => montarMapa(processoDeExemplo());

  it('o exemplo percorre as três classes, cada uma pela regra esperada', () => {
    const m = mapa();
    expect(m.tarefas.map((t) => [t.classe, t.regraAplicada])).toEqual([['automatizar', 'R1'], ['ia-propoe', 'R4'], ['manual', 'R2'], ['automatizar', 'R1']]);
    expect(m.contagem).toEqual({ automatizar: 2, 'ia-propoe': 1, manual: 1 });
  });

  it('tempo = minutos por vez × vezes por semana × pessoas, e mostra a conta', () => {
    const t1 = mapa().tarefas[0];
    expect(t1.minutosSemana.bruto).toBe(180); // 90 × 1 × 2
    expect(t1.minutosSemana.value).toBe('3 h');
    expect(t1.minutosSemana.formula).toBe('minutos por vez × vezes por semana × pessoas');
    expect(t1.minutosSemana.inputs.map((i) => i.value)).toEqual(['90', '1', '2']);
    expect(t1.minutosSemana.origem).toBe('usuario');
  });

  it('economia = tempo × fator da classe; o fator padrão é um ponto de partida, não uma medição', () => {
    const m = mapa();
    expect(m.tarefas.map((t) => t.economiaSemana.bruto)).toEqual([90, 30, 0, 20]);
    expect(m.tarefas[0].economiaSemana.origem).toBe('regra');
    expect(m.tarefas[0].economiaSemana.fonte).toContain('não é medição');
    expect(FATORES_PADRAO).toEqual({ automatizar: 0.5, 'ia-propoe': 0.25, manual: 0 });
  });

  it('os totais somam as tarefas, e o mês usa 52 ÷ 12 semanas', () => {
    const { totais } = mapa();
    expect(totais.minutosSemana.bruto).toBe(520);
    expect(totais.minutosSemana.value).toBe('8 h 40 min');
    expect(totais.economiaSemana.bruto).toBe(140);
    expect(totais.economiaSemana.value).toBe('2 h 20 min');
    expect(totais.economiaMes.bruto).toBeCloseTo((140 * 52) / 12, 6);
    expect(totais.economiaMes.value).toBe('10 h 7 min');
    expect(totais.economiaMes.formula).toContain('52');
  });

  it('trocar o fator recalcula e passa a origem para "você"', () => {
    const m = montarMapa(processoDeExemplo(), { fatores: { automatizar: 0.8 } });
    expect(m.tarefas[0].economiaSemana.bruto).toBe(144); // 180 × 0,8
    expect(m.tarefas[0].economiaSemana.origem).toBe('usuario');
    expect(m.fatores.automatizar).toEqual({ valor: 0.8, origem: 'usuario' });
    expect(m.fatores['ia-propoe'].origem).toBe('regra');
  });

  it('repetir o valor padrão do fator não vira "você"', () => {
    const m = montarMapa(processoDeExemplo(), { fatores: { automatizar: 0.5 } });
    expect(m.fatores.automatizar.origem).toBe('regra');
  });

  it('a pessoa troca a classe: a decisão é dela, com origem "você", e o cálculo acompanha', () => {
    const p = processoDeExemplo();
    p.tarefas[2].classeEscolhida = 'ia-propoe'; // sugerida: manual
    const m = montarMapa(p);
    expect(m.tarefas[2].classeSugerida).toBe('manual');
    expect(m.tarefas[2].classe).toBe('ia-propoe');
    expect(m.tarefas[2].origemClasse).toBe('usuario');
    expect(m.tarefas[2].economiaSemana.bruto).toBe(45); // 180 × 0,25
    p.tarefas[2].classeEscolhida = 'manual'; // igual à sugerida: continua "regra"
    expect(montarMapa(p).tarefas[2].origemClasse).toBe('regra');
  });

  it('cada fórmula traz entradas e fonte (mostrar a conta)', () => {
    const m = mapa();
    for (const n of [m.totais.minutosSemana, m.totais.economiaSemana, m.totais.economiaMes, ...m.tarefas.flatMap((t) => [t.minutosSemana, t.economiaSemana])]) {
      expect(n.formula.length).withContext(n.label).toBeGreaterThan(5);
      expect(n.inputs.length).withContext(n.label).toBeGreaterThan(0);
      expect(n.fonte.length).withContext(n.label).toBeGreaterThan(5);
    }
  });

  it('riscos por tarefa vêm das respostas e só aparecem quando a tarefa não fica manual', () => {
    const m = mapa();
    expect(m.tarefas[0].riscos.join(' ')).toContain('dados pessoais ou financeiros');
    expect(m.tarefas[0].riscos.join(' ')).toContain('confira uma amostra');
    expect(m.tarefas[1].riscos.join(' ')).toContain('o dano é grande');
    expect(m.tarefas[2].riscos).toEqual([]); // manual
    expect(m.tarefas[3].riscos).toEqual([]);
    const base = { id: 'x', nome: 'x', minutosPorVez: 10, vezesPorSemana: 1, repeticao: 'sempre', regra: 'sim', julgamento: 'sim', dadosPessoais: false, custoErro: 'baixo' } as const;
    expect(riscosDaTarefa(base, 'ia-propoe').join(' ')).toContain('Exige julgamento');
  });

  it('riscos do conjunto: depender de uma pessoa só, e a maior parte do tempo ficar manual', () => {
    const uma: ProcessoInput = { ...processoDeExemplo(), pessoas: 1 };
    expect(montarMapa(uma).riscosGerais.join(' ')).toContain('Só uma pessoa faz');
    const manual: ProcessoInput = { nome: 'p', pessoas: 3, tarefas: [{ id: 'a', nome: 'a', minutosPorVez: 60, vezesPorSemana: 5, repeticao: 'varia', regra: 'nao', julgamento: 'sim', dadosPessoais: false, custoErro: 'baixo' }] };
    expect(montarMapa(manual).riscosGerais.join(' ')).toContain('Mais da metade do tempo');
    expect(montarMapa(processoDeExemplo()).riscosGerais).toEqual([]);
  });

  it('traz os avisos: estimativa e nenhuma IA', () => {
    const avisos = mapa().avisos.join(' ');
    expect(avisos).toContain('não uma promessa de economia');
    expect(avisos).toContain('Nada aqui foi feito por IA');
  });

  it('frequência fracionada (uma vez por mês) funciona sem erro de arredondamento', () => {
    const p: ProcessoInput = { nome: 'p', pessoas: 1, tarefas: [{ id: 'a', nome: 'Fechamento mensal', minutosPorVez: 240, vezesPorSemana: 0.25, repeticao: 'sempre', regra: 'sim', julgamento: 'nao', dadosPessoais: false, custoErro: 'baixo' }] };
    expect(montarMapa(p).tarefas[0].minutosSemana.bruto).toBe(60);
  });
});

describe('formatação, validação e resumo', () => {
  it('formata minutos', () => {
    expect(formatarMinutos(0)).toBe('0 min');
    expect(formatarMinutos(45)).toBe('45 min');
    expect(formatarMinutos(60)).toBe('1 h');
    expect(formatarMinutos(90)).toBe('1 h 30 min');
    expect(formatarMinutos(606.67)).toBe('10 h 7 min');
  });

  it('lê números com vírgula ou ponto e recusa o resto', () => {
    expect(lerNumero('1,5')).toBe(1.5);
    expect(lerNumero(' 2 ')).toBe(2);
    for (const ruim of ['', 'abc', '-1', '1,2,3']) expect(lerNumero(ruim)).withContext(ruim).toBeNull();
  });

  it('o exemplo é válido; cada problema vem com o campo e a mensagem', () => {
    expect(validarProcesso(processoDeExemplo())).toEqual([]);
    const ruim = processoDeExemplo();
    ruim.nome = '';
    ruim.pessoas = 0;
    ruim.tarefas[0].minutosPorVez = 0;
    ruim.tarefas[1].vezesPorSemana = 0;
    ruim.tarefas[2].nome = 'x <b>';
    const campos = validarProcesso(ruim).map((e) => e.campo);
    expect(campos).toEqual(['processo.nome', 'processo.pessoas', 'tarefas.0.minutosPorVez', 'tarefas.1.vezesPorSemana', 'tarefas.2.nome']);
  });

  it('exige ao menos uma tarefa e no máximo oito', () => {
    expect(validarProcesso({ nome: 'p', pessoas: 1, tarefas: [] }).map((e) => e.campo)).toEqual(['tarefas']);
    const muitas: ProcessoInput = { nome: 'p', pessoas: 1, tarefas: Array.from({ length: MAX_TAREFAS + 1 }, (_, i) => ({ ...processoDeExemplo().tarefas[0], id: `t${i}` })) };
    expect(validarProcesso(muitas).map((e) => e.campo)).toContain('tarefas');
  });

  it('o resumo em texto cabe no campo do formulário, é texto puro e cita os fatores e o aviso', () => {
    const texto = resumoEmTexto(montarMapa(processoDeExemplo()));
    expect(texto.length).toBeLessThanOrEqual(1900);
    expect(texto).toContain('Mapa de IA no meu processo');
    expect(texto).toContain('Economia estimada: 2 h 20 min por semana');
    expect(texto).toContain('Fatores usados: automatizar 50%, IA propõe 25%, manual 0%');
    expect(texto).toContain('não é promessa de economia');
    expect(texto).not.toMatch(/[<>]/);
  });

  it('um mapa grande é cortado para caber, avisando quantas tarefas saíram', () => {
    const p = processoDeExemplo();
    p.tarefas = Array.from({ length: 8 }, (_, i) => ({ ...p.tarefas[0], id: `t${i}`, nome: 'Tarefa com um nome bem comprido para ocupar espaço no resumo '.repeat(1) + i }));
    const texto = resumoEmTexto(montarMapa(p), 700);
    expect(texto.length).toBeLessThanOrEqual(700);
    expect(texto).toMatch(/\(\+\d+ tarefas? omitidas? por limite de tamanho\)/);
  });
});
