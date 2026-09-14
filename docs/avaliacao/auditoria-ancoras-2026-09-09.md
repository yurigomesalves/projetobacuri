# Auditoria das âncoras de evidência

Data: 09/09/2026.

## Objetivo

Conferir visualmente nos PDFs as fontes e páginas usadas para medir a recuperação das perguntas-ouro. A auditoria não alterou o conteúdo das respostas aprovadas; corrigiu e ampliou o mapa de evidências para representar todo o conteúdo necessário a cada resposta.

## Correções

| Item | Âncora anterior | Âncora auditada | Motivo |
|---|---|---|---|
| P12 | C20 | C20-24 | A crítica ao inquérito e suas omissões ocupa várias páginas do Capítulo I. |
| P13 | C42 | C39-42 | A análise de gênero, a coação sexual e a manifestação da Promotoria estão distribuídas entre as páginas físicas 39–42, impressas 48–51. |
| P14 | D | C47-50 e D94 | Os casos do Triângulo Mineiro e os números da CCV aparecem no relatório Ismene; o relatório camponês sustenta o padrão geral de violência. |
| P20 | E100 | E100-101 | A página 100 trata do recesso, cassações e suspensão de direitos; a 101 contém habeas corpus e controle judicial. |
| P21 | C20 | C20-24 e C128-131 | A análise está no Capítulo I; o depoimento direto de Islene está nas páginas físicas 128–131, impressas 144–147. |
| P22 | C20 | C20-24 | A conclusão sobre assassinato e omissão policial requer o conjunto do Capítulo I. |
| P23 | D e F206 | F9, D94, F204 e F206 | A abertura do Volume II enumera os grupos; as demais páginas documentam camponeses e povos indígenas. |
| P24 | E350 e C42 | E350 | A revisão editorial restringiu o item à questão geral sobre detenções sem registro. |
| P31 | — | C20-24 e C39-42 | A revisão editorial criou um item específico para as lacunas policiais e periciais do caso Ismene. |

## Paginação conferida

No relatório *Caso Ismene Mendes*, a paginação física do PDF difere da numeração impressa. Em especial, o Anexo IV indicado como páginas impressas 142–147 corresponde às páginas físicas 126–131 do PDF; o trecho usado em P21 está nas páginas físicas 128–131.

Foram inspecionadas visualmente as páginas relevantes dos cinco PDFs utilizados pelas perguntas P12–P24 e P31: relatório Ismene, Comissão Camponesa da Verdade, volumes I e II da CNV e Tomo I da Comissão da Verdade do Estado de São Paulo.

Arquivos conferidos: [relatório Ismene](../../pipeline/dados/brutos/cev-mg-triangulo-mineiro.pdf), [Comissão Camponesa da Verdade](../../pipeline/dados/brutos/ctv-camponesa.pdf), [CNV — Volume I](../../pipeline/dados/brutos/cnv-vol1.pdf), [CNV — Volume II](../../pipeline/dados/brutos/cnv-vol2.pdf) e [CEV-SP — Tomo I](../../pipeline/dados/brutos/cev-sp-rubens-paiva-tomo1.pdf).

## Efeito sobre a medição

O conjunto passa de 28 para 32 unidades de evidência. Por isso, os resultados produzidos antes desta auditoria são preservados apenas como registro histórico e não devem ser comparados diretamente com os resultados recalculados.

Após a divisão editorial, o baseline vetorial recuperou 15 de 32 unidades no Top 8 (46,9%) e ao menos uma evidência em 14 de 25 perguntas (56%). O diagnóstico sem corte de similaridade recuperou 22 de 32 unidades no Top 50 (68,8%) e ao menos uma evidência em 20 de 25 perguntas (80%). P31 recuperou suas duas evidências nas posições 1 e 4; P24 recuperou E350 na posição 24. O ganho decorre da formulação explícita do caso em P31, sem alteração do algoritmo de busca.
