# Avaliação do roteamento automático de fontes

Data: 9 de setembro de 2026.

## Pergunta do experimento

A busca vetorial ampliada consegue escolher fontes suficientes para que uma
segunda busca textual recupere as evidências que estavam fora do top 50?

O experimento usa a pergunta original, sem decomposição. As fontes são escolhidas
automaticamente pela primeira ocorrência de cada documento no diagnóstico
vetorial. Em seguida, a RPC experimental da migração 0027 pesquisa trechos apenas
nessas fontes. Nenhuma fonte esperada é injetada nessa etapa.

Esta medição avalia a presença da evidência no conjunto candidato. Ela não mede a
ordenação final em oito resultados e não representa o comportamento da rota
pública.

## Resultados

| Configuração | Evidências no conjunto candidato | Média de candidatos nas 7 perguntas difíceis | Maior conjunto |
|---|---:|---:|---:|
| Vetorial top 50 | 22/32 (68,8%) | 50 ou menos | 50 |
| 13 fontes × 60 trechos | 29/32 (90,6%) | 735,7 | 791 |

A segunda etapa acrescentou sete evidências. A seleção vetorial incluiu a fonte
necessária em oito dos nove pares difíceis de pergunta–fonte.

Os resultados completos vigentes estão em
[`resultados-roteamento-fontes-13x60.json`](resultados-roteamento-fontes-13x60.json).
O arquivo `resultados-roteamento-fontes.json` preserva a execução anterior de
15 fontes × 100 trechos como histórico prévio ao ADR-027.

A execução reproduzível é `npm run avaliar:roteamento`, cujo padrão é 13 fontes ×
60 trechos. As variáveis
`AVALIACAO_ROTEAMENTO_FONTES`, `AVALIACAO_ROTEAMENTO_QTD` e
`AVALIACAO_ROTEAMENTO_SAIDA` controlam a configuração e o arquivo de saída.

## Evidências ainda ausentes

- **P17/F395:** a fonte correta foi roteada, mas o trecho não entrou nos 60 nem nos
  100 primeiros resultados textuais. O chunk mistura movimentos femininos,
  Movimento Negro Unificado e novo sindicalismo, o que dilui o tema.
- **P23/F9:** a fonte correta foi roteada, mas a apresentação geral do Volume II
  não entrou no top 100. A pergunta reúne vários grupos sociais e exige
  decomposição.
- **P15/E350:** a CNV Volume I não apareceu entre as fontes candidatas nesta
  execução, embora a busca textual encontre a evidência quando a fonte é fornecida.

## Decisão

A recuperação em duas etapas permanece experimental. A configuração 13 × 60 é o
melhor teto de candidatos medido nesta fase, mas 736 candidatos em média ainda é
excessivo para ordenar durante uma resposta pública. O próximo ensaio deve testar
decomposição para reduzir a posição das evidências dentro da fonte e revisar os
itens P15, P17 e P23 antes de qualquer promoção.
