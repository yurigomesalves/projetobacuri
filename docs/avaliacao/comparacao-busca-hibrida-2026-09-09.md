# Comparação da recuperação vetorial e híbrida — 09/09/2026

## Escopo

A comparação usa as mesmas 25 perguntas aprovadas, as mesmas 32 unidades de
evidência, o mesmo modelo `Xenova/multilingual-e5-small`, limiar semântico 0,82 e
oito resultados por pergunta. Somente a forma de ordenar os trechos mudou.

## Resultado

| Estratégia | Evidências no top 8 | Recall@8 | Perguntas com algum acerto |
|---|---:|---:|---:|
| Vetorial | 15/32 | 46,875% | 14/25 (56%) |
| Híbrida, RRF | 15/32 | 46,875% | 14/25 (56%) |

A busca híbrida não acrescentou nenhuma unidade de evidência. Em P01 e P05, a
evidência esperada caiu da primeira para a quarta posição. P11 preservou o acerto
na primeira posição, embora tenha mudado outros resultados. P13, P14, P15 e P20
tiveram alterações de ranking sem recuperar as evidências que faltavam.

## Implementação examinada

A RPC experimental `buscar_chunks_hibrida` combina a busca textual em português e
a busca vetorial por Reciprocal Rank Fusion. As migrações 0019–0024 preservam a RPC
vetorial anterior, materializam `busca_textual` nos 53.474 chunks e mantêm o campo
atualizado por trigger. A consulta lexical disjuntiva da migração 0021 excedeu o
tempo permitido; a versão final usa `websearch_to_tsquery`, índice GIN e 50
candidatos de cada busca antes da fusão.

## Decisão

A rota pública `/api/chat` continua usando `buscar_chunks`. A função híbrida fica no
banco para pesquisa reproduzível, mas não foi promovida ao produto porque empatou
no resultado agregado e piorou a posição de duas evidências. Uma nova tentativa
deve usar perguntas reservadas e investigar chunking, metadados ou reranqueamento,
sem ajustar parâmetros apenas para estas 25 perguntas visíveis.

Esta avaliação mede recuperação documental. Ela não mede a correção, a sustentação
ou a qualidade didática de respostas geradas por um modelo de linguagem.

## Próxima investigação recomendada

O diagnóstico vetorial com 50 resultados encontrou 22/32 evidências. Sete unidades
que faltam no top 8 já existem entre as posições 9 e 50: P03, P13, uma unidade de
P16, P19, P20, a segunda unidade de P21 e P24. Esse grupo é o melhor
alvo para testar um reranqueador em perguntas reservadas.

Dez unidades continuam fora do top 50: as duas de P14, P15, uma de P16, P17, as
duas de P18 e as três de P23. Antes de ajustar pesos, esse grupo exige
auditoria do texto efetivamente indexado, dos limites dos chunks e da correspondência
entre paginação física e o campo `paginas`. Estar fora do top 50 não prova que a
fonte esteja ausente do acervo.

Uma consulta direta ao banco confirmou ao menos um chunk em cada página esperada
desse grupo (entre 1 e 4 por página). Isso afasta a hipótese simples de ausência da
página e concentra a próxima auditoria no conteúdo extraído, nos limites dos chunks
e na ordenação.

## Verificação técnica

Passaram 83 testes automatizados, lint, checagem de tipos e validação sintática dos
JSONs. O build com Turbopack não pôde ser concluído neste ambiente porque o processo
de CSS tentou abrir uma porta e recebeu `Operation not permitted`; a tentativa com
Webpack encontrou um erro ao interpretar `tsc --showConfig`, embora o
próprio `tsc --showConfig` e a checagem de tipos tenham terminado normalmente.

A pendência de RLS encontrada na auditoria pós-migração foi resolvida posteriormente
pela migração 0025 e está documentada em
`docs/auditorias/seguranca-rls-2026-09-09.md`.
