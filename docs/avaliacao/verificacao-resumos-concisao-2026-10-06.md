# Verificação de resumos e concisão — 6 de outubro de 2026

Implementação em branch isolado `melhoria/resumos-concisao-20261006`, baseada no main reconciliado. PR [#3](https://github.com/yurigomesalves/projetobacuri/pull/3) em rascunho. A versão pública continua no deployment `dpl_67Q3jyeCGNqNhARrEWPToNPetkwy`.

## Comportamento

A instrução de geração distingue resumo de 2–3 frases sem marcadores e desenvolvimento citado. A meta de 250–450 palavras e até seis parágrafos não corta texto automaticamente. Atribuições, cadeias indiretas e ressalvas têm prioridade. Mantidos fallback de resumo vazio, validação de referências, saída de 4.096 tokens e prazo compartilhado de 20 segundos, sem chamadas pagas adicionais para corrigir o formato.

O script operacional permite selecionar `AVALIACAO_SMOKE_CASOS=S01,S03,S04,S06`; S01 é obrigatório porque fornece a continuidade S12, executada ao final. Sem essa variável, conserva a bateria completa. Cada resultado documental agora informa resumo vazio, marcadores no resumo, palavras, blocos separados por linhas vazias e rótulos internos. Essas medidas não comprovam sustentação histórica; metas de apresentação ficam separadas da aprovação do contrato.

## Validação local

152 testes em 20 arquivos passaram, incluindo preservação de texto com separadores posteriores ou lados vazios e medidas de apresentação independentes das citações. Lint, checagem de tipos, autoteste do script e build webpack passaram. O build local usa as dependências existentes; a compilação remota da Vercel também passou.

## Primeira amostra

Código `5ef8f06e7cf73c024e4a527f07b076deadcc0aac`; candidato `dpl_2kRiwxXnVkNJdST9v1GVGQ6j624j`, READY, criado com configuração de produção e `--skip-domain`, sem promover o domínio público.

| Caso | Palavras no desenvolvimento | Blocos | Resumo preenchido sem marcadores |
| --- | ---: | ---: | --- |
| S01 | 849 | 7 | Sim |
| S03 | 553 | 6 | Sim |
| S04 | 553 | 5 | Sim |
| S06 | 516 | 6 | Sim |
| S12 | 881 | 7 | Sim |

5/5 casos passaram nos critérios operacionais; 33 citações encontraram correspondência única com os trechos do banco em 23 consultas somente de leitura. A concisão exige revisão: nenhum desenvolvimento ficou no intervalo de palavras pretendido. O máximo observado de duração do cliente foi 14.380,4 ms, em amostra pequena. Isso não estabelece uma garantia de latência.

Evidências locais em `output/resumos-concisao-2026-10-06/`: respostas sanitizadas sem token de continuidade, relatório operacional, medidas de apresentação e trechos integrais associados para revisão editorial. O custo observado desta amostra foi US$ 0,015174216; contabilização sujeita a atraso.

Esta primeira amostra não autoriza publicação. Revisão editorial e eventual reforço da instrução de concisão devem preceder a apresentação do candidato final. Nenhuma avaliação científica v4, reindexação ou migração de banco foi executada.
