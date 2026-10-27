import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { mapaIa } from '../../../content';
import { MAPA_IA_SOURCE_URL } from '../../../content/pt-BR/site';
import { CtaSectionComponent } from '../../../shared/components/cta-section/cta-section.component';
import { ExplainableNumberComponent } from '../../../shared/components/explainable-number/explainable-number.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PrivacyPanelComponent } from '../../../shared/components/privacy-panel/privacy-panel.component';
import { TrackService } from '../../../shared/analytics/track.service';
import { CLASSE_EXPLICACAO, CLASSE_ROTULO, CUSTO_ERRO_ROTULO, JULGAMENTO_ROTULO, REGRA_ROTULO, REPETICAO_ROTULO } from '../../../tools/mapa-ia/labels';
import { REGRAS_TEXTO } from '../../../tools/mapa-ia/classify';
import { formatarNumero, formatarPercentual } from '../../../tools/mapa-ia/format';
import { FATORES_PADRAO, montarMapa } from '../../../tools/mapa-ia/report';
import { processoDeExemplo } from '../../../tools/mapa-ia/sample';
import { resumoEmTexto } from '../../../tools/mapa-ia/summary';
import { lerNumero, MAX_TAREFAS, validarProcesso } from '../../../tools/mapa-ia/validate';
import { CLASSES, type Classe, type CustoErro, type Fatores, type Julgamento, type ProcessoInput, type Regra, type Repeticao } from '../../../tools/mapa-ia/types';

type Fase = 'inicio' | 'formulario' | 'revisao' | 'resultado';

/** O que a pessoa digita: números como texto (para mostrar o erro, não adivinhar) e escolhas ainda vazias. */
interface TarefaRascunho {
  id: string;
  nome: string;
  minutos: string;
  vezes: string;
  repeticao: Repeticao | '';
  regra: Regra | '';
  julgamento: Julgamento | '';
  dadosPessoais: boolean;
  custoErro: CustoErro | '';
}

const novaTarefa = (n: number): TarefaRascunho => ({ id: `t${n}`, nome: '', minutos: '', vezes: '', repeticao: '', regra: '', julgamento: '', dadosPessoais: false, custoErro: '' });

const OPCOES = {
  repeticao: Object.entries(REPETICAO_ROTULO) as [Repeticao, string][],
  regra: Object.entries(REGRA_ROTULO) as [Regra, string][],
  julgamento: Object.entries(JULGAMENTO_ROTULO) as [Julgamento, string][],
  custoErro: Object.entries(CUSTO_ERRO_ROTULO) as [CustoErro, string][],
};

@Component({
  selector: 'app-mapa-ia-page',
  standalone: true,
  imports: [PageHeaderComponent, ExplainableNumberComponent, PrivacyPanelComponent, CtaSectionComponent, NgTemplateOutlet],
  templateUrl: './mapa-ia-page.html',
  styleUrl: './mapa-ia-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaIaPage {
  readonly c = mapaIa;
  /** Código aberto: vazio até o repositório existir (a linha só aparece quando há endereço). */
  readonly sourceUrl = MAPA_IA_SOURCE_URL;
  readonly opcoes = OPCOES;
  readonly classes = CLASSES;
  readonly classeRotulo = CLASSE_ROTULO;
  readonly classeExplicacao = CLASSE_EXPLICACAO;
  readonly regrasTexto = REGRAS_TEXTO;
  readonly maxTarefas = MAX_TAREFAS;
  readonly formatarNumero = formatarNumero;
  readonly formatarPercentual = formatarPercentual;
  readonly gruposClassificacao = [
    { campo: 'repeticao', pergunta: mapaIa.form.fields.repeticao, opcoes: OPCOES.repeticao },
    { campo: 'regra', pergunta: mapaIa.form.fields.regra, opcoes: OPCOES.regra },
    { campo: 'julgamento', pergunta: mapaIa.form.fields.julgamento, opcoes: OPCOES.julgamento },
  ] as const;
  readonly grupoErro = { campo: 'custoErro', pergunta: mapaIa.form.fields.custoErro, opcoes: OPCOES.custoErro } as const;
  readonly rotulos = { repeticao: REPETICAO_ROTULO, regra: REGRA_ROTULO, julgamento: JULGAMENTO_ROTULO, custoErro: CUSTO_ERRO_ROTULO };

  private readonly tracker = inject(TrackService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly heading = viewChild<ElementRef<HTMLElement>>('phaseHeading');

  readonly fase = signal<Fase>('inicio');
  readonly nome = signal('');
  readonly pessoas = signal('');
  readonly tarefas = signal<TarefaRascunho[]>([novaTarefa(1)]);
  readonly erros = signal<Record<string, string>>({});
  readonly errosLista = computed(() => Object.values(this.erros()));
  readonly exemplo = signal(false);
  readonly confirmado = signal<ProcessoInput | null>(null);
  readonly escolhas = signal<Record<string, Classe | undefined>>({});
  readonly fatoresTexto = signal<Record<Classe, string>>({ automatizar: '', 'ia-propoe': '', manual: '' });
  readonly copiado = signal(false);
  readonly hoje = signal('');
  private seq = 1;
  private iniciado = false;

  constructor() {
    afterNextRender(() => this.enableOffline());
  }

  /** Fatores digitados; texto vazio ou inválido volta ao ponto de partida (e o campo avisa). */
  readonly fatores = computed<Partial<Fatores>>(() => {
    const out: Partial<Fatores> = {};
    for (const cl of CLASSES) {
      const txt = this.fatoresTexto()[cl];
      const n = txt.trim() === '' ? null : lerNumero(txt);
      if (n !== null && n >= 0 && n <= 100) out[cl] = n / 100;
    }
    return out;
  });

  readonly fatorInvalido = (cl: Classe): boolean => {
    const txt = this.fatoresTexto()[cl].trim();
    if (txt === '') return false;
    const n = lerNumero(txt);
    return n === null || n < 0 || n > 100;
  };

  readonly padrao = (cl: Classe): string => String(Math.round(FATORES_PADRAO[cl] * 100));

  readonly relatorio = computed(() => {
    const base = this.confirmado();
    if (!base) return null;
    const esc = this.escolhas();
    return montarMapa({ ...base, tarefas: base.tarefas.map((t) => ({ ...t, classeEscolhida: esc[t.id] })) }, { fatores: this.fatores() });
  });

  readonly fill = (t: string, v: Record<string, string | number>): string => t.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

  /** O app registra um service worker para a ferramenta abrir sem internet, só em produção (https). */
  private enableOffline(): void {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    navigator.serviceWorker
      .register('/mapa-ia-sw.js', { scope: '/ferramentas/mapa-de-ia' })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = [location.pathname, ...performance.getEntriesByType('resource').map((r) => r.name)];
        reg.active?.postMessage({ type: 'guardar', urls });
      })
      .catch(() => undefined);
  }

  private focarTitulo(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const el = this.heading()?.nativeElement;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'start' });
    }, 0);
  }

  private comecou(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.tracker.track('mapa_iniciado', {});
  }

  verExemplo(): void {
    this.tracker.track('mapa_exemplo_aberto', {});
    this.exemplo.set(true);
    this.confirmado.set(processoDeExemplo());
    this.escolhas.set({});
    this.fatoresTexto.set({ automatizar: '', 'ia-propoe': '', manual: '' });
    this.hoje.set(new Date().toLocaleDateString('pt-BR'));
    this.fase.set('resultado');
    this.focarTitulo();
  }

  descreverMeu(): void {
    this.comecou();
    this.exemplo.set(false);
    this.fase.set('formulario');
    this.focarTitulo();
  }

  setNome(v: string): void { this.nome.set(v); }
  setPessoas(v: string): void { this.pessoas.set(v); }

  setTarefa<K extends keyof TarefaRascunho>(i: number, campo: K, valor: TarefaRascunho[K]): void {
    this.tarefas.update((l) => l.map((t, idx) => (idx === i ? { ...t, [campo]: valor } : t)));
  }

  adicionarTarefa(): void {
    if (this.tarefas().length >= MAX_TAREFAS) return;
    this.seq += 1;
    this.tarefas.update((l) => [...l, novaTarefa(this.seq)]);
  }

  removerTarefa(i: number): void {
    if (this.tarefas().length <= 1) return;
    this.tarefas.update((l) => l.filter((_, idx) => idx !== i));
  }

  /** Valida o rascunho e, se estiver tudo certo, mostra a revisão. Nada é calculado ainda. */
  revisar(): void {
    const erros: Record<string, string> = {};
    const pessoas = lerNumero(this.pessoas());
    const rascunho = this.tarefas();
    const tarefas = rascunho.map((t) => ({
      id: t.id,
      nome: t.nome,
      minutosPorVez: lerNumero(t.minutos) ?? Number.NaN,
      vezesPorSemana: lerNumero(t.vezes) ?? Number.NaN,
      repeticao: (t.repeticao || 'varia') as Repeticao,
      regra: (t.regra || 'nao') as Regra,
      julgamento: (t.julgamento || 'nao') as Julgamento,
      dadosPessoais: t.dadosPessoais,
      custoErro: (t.custoErro || 'baixo') as CustoErro,
    }));
    const input: ProcessoInput = { nome: this.nome(), pessoas: pessoas === null ? Number.NaN : pessoas, tarefas };
    for (const e of validarProcesso(input)) erros[e.campo] = e.mensagem;
    rascunho.forEach((t, i) => {
      for (const campo of ['repeticao', 'regra', 'julgamento', 'custoErro'] as const) {
        if (!t[campo]) erros[`tarefas.${i}.${campo}`] = `Tarefa ${i + 1}: ${this.c.form.missingChoice}`;
      }
    });
    this.erros.set(erros);
    if (Object.keys(erros).length > 0) {
      if (this.isBrowser) setTimeout(() => document.getElementById('mapa-erros')?.focus(), 0);
      return;
    }
    this.confirmado.set(input);
    this.escolhas.set({});
    this.fase.set('revisao');
    this.focarTitulo();
  }

  voltar(): void {
    this.fase.set('formulario');
    this.focarTitulo();
  }

  confirmar(): void {
    this.tracker.track('mapa_revisao_confirmada', {});
    this.hoje.set(new Date().toLocaleDateString('pt-BR'));
    this.fase.set('resultado');
    this.focarTitulo();
  }

  setClasse(id: string, valor: string): void {
    this.escolhas.update((e) => ({ ...e, [id]: valor as Classe }));
  }

  setFator(cl: Classe, valor: string): void {
    this.fatoresTexto.update((f) => ({ ...f, [cl]: valor }));
  }

  recomecar(): void {
    this.exemplo.set(false);
    this.confirmado.set(null);
    this.escolhas.set({});
    this.erros.set({});
    this.nome.set('');
    this.pessoas.set('');
    this.seq = 1;
    this.tarefas.set([novaTarefa(1)]);
    this.fatoresTexto.set({ automatizar: '', 'ia-propoe': '', manual: '' });
    this.copiado.set(false);
    this.fase.set('inicio');
    this.focarTitulo();
  }

  async copiar(): Promise<void> {
    const r = this.relatorio();
    if (!r) return;
    try {
      await navigator.clipboard.writeText(resumoEmTexto(r));
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
      this.tracker.track('mapa_resumo_copiado', {});
    } catch {
      this.copiado.set(false);
    }
  }

  imprimir(): void {
    this.tracker.track('mapa_pdf_gerado', {});
    window.print();
  }

  onCtaClick(event: Event): void {
    if ((event.target as HTMLElement).closest('a')) this.tracker.track('mapa_clique_proximo_passo', {});
  }
}
