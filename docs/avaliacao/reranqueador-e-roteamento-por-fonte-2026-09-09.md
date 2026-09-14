# Ensaio de reranqueamento e roteamento por fonte

Data: 9 de setembro de 2026.

## Objetivo

Verificar duas etapas propostas após a auditoria das evidências fora do top 50:

1. se um reranqueador bilíngue reconhece as evidências corretas quando elas já
   estão no conjunto candidato;
2. se a busca textual restrita às fontes sugeridas pela busca vetorial reduz a
   concorrência entre documentos.

Este é um ensaio de desenvolvimento sobre perguntas visíveis. Não autoriza a
promoção de parâmetros para a busca pública.

## Reranqueador: teste de teto com evidências injetadas

Foi testado o modelo livre (licença MIT)
`unicamp-dl/mMiniLM-L6-v2-en-pt-msmarco-v2`, treinado para português e inglês. O
ambiente usou `sentence-transformers 6.0.1`, `torch 2.14.0+cpu` e execução local
sem GPU.

Para cada uma das sete perguntas difíceis, o conjunto candidato reuniu os 50
resultados do diagnóstico vetorial e todos os chunks das evidências esperadas.
Foram 314 chunks únicos. Como os alvos foram deliberadamente injetados, esta
medição é apenas um teto de ordenação, não recall real da recuperação.

| Pergunta | Evidência | Melhor posição após reranqueamento |
|---|---|---:|
| P14 | C47-50 | 33 |
| P14 | D94 | 19 |
| P15 | E350 | 23 |
| P16 | F204 | 13 |
| P17 | F395 | 23 |
| P18 | F314 | 32 |
| P18 | G3 | 29 |
| P23 | F9 | 41 |
| P23 | D94 | 21 |
| P23 | F204/206 | 38 |
| P24 | C20-24 | 23 |
| P24 | C39-42 | 33 |

Resultado: **0/12 evidências no top 8**, mesmo com todas presentes nos
candidatos. A escala foi conferida: pontuações maiores correspondem a maior
relevância no modelo. Este reranqueador foi descartado para o Bacuri.

Os dados completos estão em
[`resultados-reranqueador-oraculo.json`](resultados-reranqueador-oraculo.json).
O script reproduzível está em `pipeline/avaliar_reranqueador.py`. O modelo fica
no diretório local ignorado `pipeline/dados/cache-huggingface/`.

## Busca textual dentro da fonte

A busca vetorial ampliada já trouxe a fonte esperada em **9 de 10 pares únicos
pergunta–fonte**. A única ausência foi o relatório de Ismene em P24. Em seguida,
foi calculado BM25 local usando somente os chunks da fonte correta, para medir o
potencial da segunda etapa:

| Pergunta | Evidência | Posição textual dentro da fonte |
|---|---|---:|
| P14 | C47-50 | 7 |
| P14 | D94 | 32 |
| P15 | E350 | 4 |
| P16 | F204 | 12 |
| P17 | F395 | 4 |
| P18 | F314 | 17 |
| P18 | G3 | 46 |
| P23 | F9 | 184 |
| P23 | D94 | 2 |
| P23 | F204/206 | 104 |
| P24 | C20-24 | 9 |
| P24 | C39-42 | 21 |

Resultado: **10/12 evidências no top 50 da própria fonte** e oito entre as 21
primeiras. As duas ausências pertencem à pergunta composta P23. Subconsultas
separadas para segmentos sociais e povos indígenas fizeram o Volume II da CNV
aparecer, respectivamente, nas posições 12 e 6 da primeira etapa.

### Validação da função instalada no PostgreSQL

Após autorização de Yuri, a migração 0027 criou a RPC experimental
`buscar_chunks_textuais_por_fontes`, restrita ao papel `service_role`. A função
usa a busca textual nativa do PostgreSQL, cuja pontuação não é idêntica ao BM25
local. Com a fonte correta fornecida ao teste e até 100 trechos por fonte, foram
obtidas estas posições:

| Pergunta | Evidência | Posição na RPC 0027 |
|---|---|---:|
| P14 | C47-50 | 25 |
| P14 | D94 | 46 |
| P15 | E350 | 22 |
| P16 | F204 | 9 |
| P17 | F395 | fora do top 100 |
| P18 | F314 | 54 |
| P18 | G3 | 2 |
| P23 | F9 | fora do top 100 |
| P23 | D94 | 31 |
| P23 | F204/206 | 20 |

A tabela foi recalculada após a divisão editorial de P24 e P31. As duas
evidências de Ismene passaram a aparecer diretamente no top 50 vetorial e saíram
deste grupo de teste. A RPC recuperou **7/10 no top 50** e **8/10 no top 100**.
O resultado ainda é um teto com fonte fornecida e não mede o roteamento automático. A execução
reproduzível é `npm run avaliar:fontes`; os dados estão em
[`resultados-busca-textual-por-fontes.json`](resultados-busca-textual-por-fontes.json).

## Revisão editorial de P24

Yuri aprovou a divisão: P24 ficou restrita à questão geral sobre ausência de
registro formal, e P31 passou a nomear o caso Ismene. Com o referente explícito,
C20-24 e C39-42 foram recuperadas no top 50 vetorial. A decisão está no ADR-027.

## Decisão

- não usar o reranqueador testado;
- prosseguir apenas em ambiente experimental com recuperação em duas etapas:
  fontes candidatas pela busca vetorial e trechos por busca textual dentro de
  cada fonte;
- decompor perguntas compostas antes da recuperação;
- criar perguntas reservadas antes de comparar uma nova estratégia
  com a busca pública.
