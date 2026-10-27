# Mapa de IA no seu processo

[![Testes](https://github.com/theasier-labs/mapa-ia/actions/workflows/testes.yml/badge.svg)](https://github.com/theasier-labs/mapa-ia/actions/workflows/testes.yml)

O código da ferramenta gratuita da Theasier que ajuda a ver, em um processo de rotina, **o que dá para automatizar, o que a IA só propõe e o que continua com a pessoa**, com a estimativa de horas à mostra.

**A ferramenta no ar:** <https://www.theasier.com.br/ferramentas/mapa-de-ia>

Este repositório existe para que você não precise acreditar na frase "o que você descreve não sai do navegador" nem na de "isto não usa IA": dá para conferir as duas.

## Como funciona (sem IA)

A pessoa descreve até 8 tarefas (minutos por vez, vezes por semana e cinco perguntas por tarefa), confere tudo e só então vê o mapa. Cada tarefa recebe uma classe por **uma tabela de cinco regras**, que está inteira em [`src/mapa-ia/classify.ts`](src/mapa-ia/classify.ts):

| Regra | Quando | Classe |
|---|---|---|
| R1 | O passo a passo é sempre o mesmo, dá para escrever as regras, não exige julgamento e o erro não custa caro | Automatizar |
| R5 | Como a R1, mas o erro custa caro | IA propõe, a pessoa aprova |
| R2 | Exige julgamento e as regras não existem ou só cobrem uma parte | Manter manual |
| R3 | Muda a cada vez e não dá para escrever as regras | Manter manual |
| R4 | Qualquer outro caso | IA propõe, a pessoa aprova |

A primeira regra que se aplica decide, e a pessoa pode trocar a classe de qualquer tarefa ("você decide").

**As horas** são `minutos por vez × vezes por semana × pessoas` (tempo) e `tempo × fator da classe` (economia); o mês usa `52 ÷ 12` semanas. Os fatores iniciais (50% para automatizar, 25% quando a IA propõe, 0% para manual) são **pontos de partida conservadores, não medições**, e a pessoa pode trocá-los. Estão em [`src/mapa-ia/report.ts`](src/mapa-ia/report.ts) (`FATORES_PADRAO`). Cada número da tela abre a conta: fórmula, entradas, fonte e origem ("Regra" ou "Você").

## Como conferir, sem saber programar

1. Abra a página, **desligue a internet** (modo avião) e use o exemplo ou descreva um processo. Funciona, porque tudo é calculado no seu aparelho.
2. Com a página aberta, abra as ferramentas do navegador (F12), aba **Rede**, e use a ferramenta: não aparece nenhuma requisição enviando o que você digitou.
3. A página tem uma política de segurança (CSP) que proíbe o navegador de se conectar a outro endereço: [`seguranca/tool-csp.header.txt`](seguranca/tool-csp.header.txt) (`connect-src 'self'`, sem terceiros).

## Como conferir, lendo o código

| Onde | O que é |
|---|---|
| [`src/mapa-ia/`](src/mapa-ia) | O motor: tipos, a tabela de regras, o cálculo das horas, os riscos, a validação, o resumo em texto e um exemplo inventado. TypeScript puro, sem rede e sem IA. |
| [`pagina/`](pagina) | A tela: lê o que a pessoa digita e chama o motor. Depende do design system do site e não roda sozinha; serve para auditar o que a tela faz. |
| [`seguranca/`](seguranca) | A política de segurança, o service worker que deixa a página abrir sem internet e os testes da política. |

Procure por `fetch`, `XMLHttpRequest`, `sendBeacon` ou `WebSocket` em `src/` e `pagina/`: não há nenhum. O teste [`scripts/sem-rede.test.mjs`](scripts/sem-rede.test.mjs) falha se algum arquivo usar uma API de rede. (O service worker usa `fetch` só para o próprio site, para abrir sem internet; ele nunca vê o que você digitou.)

## Rodar os testes

```bash
npm install
npm test                 # regras e cálculo (25 testes)
npm run test:seguranca   # política de segurança e "nenhuma API de rede"
```

## O que este repositório não é

- **Não é consultoria nem promessa de economia.** É uma estimativa para conversar: os tempos são os que você informa e os fatores são pontos de partida.
- **Não usa IA.** A classificação é uma tabela de regras simples; ela não conhece o seu negócio.
- **Não analisa dados de clientes, regras fiscais nem obrigações legais**: isso precisa de gente.
- **Não é um produto isolado.** A pasta `pagina/` foi escrita para o site da Theasier.

## De onde vem este código

A fonte da verdade fica no repositório do site. Este repositório é um **espelho gerado por script** (`scripts/export-mapa-ia.mjs` no repositório do site): não edite aqui, porque a próxima exportação sobrescreve. Para sugerir uma correção, abra uma issue.

## Licença

[MIT](LICENSE). O processo de exemplo é inventado.
