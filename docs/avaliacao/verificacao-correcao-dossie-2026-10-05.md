# Verificação da correção bibliográfica do Dossiê Ditadura (05/10/2026)

> Verificação assistida da amostra S01, S04 e S12 após a aplicação autorizada de
> sete campos bibliográficos em uma única fonte. Não é autorização de publicação.

## Aplicação e integridade

A fonte `efc10a75-5cf4-435e-a598-7abf57f88ff7` deixou de exibir o título de
“Tomo II [síntese]” e autoria da CEV-SP. Passou a exibir *Dossiê Ditadura: Mortos
e Desaparecidos Políticos no Brasil (1964-1985)*, atribuído à Comissão de Familiares
de Mortos e Desaparecidos Políticos e ao IEVE, com URL oficial do PDF completo,
proveniência, `nota_contexto`, `data_documento` e licença corrigidos. O PDF tem 762
páginas e SHA-256 `e902047328adfa21ca523121684dd657ded74e28015199e2df59950cba0758a4`.

A conferência posterior preservou IDs, conteúdos e páginas de 2.773/2.773 chunks,
sem divergências. O localizador físico 30 corresponde à página impressa 36 neste
extrato; o físico 120, à impressa 126. Isto não certifica a paginação integral do PDF.

O outro registro `d6f2e787-ee4a-49a3-9992-534be02ba8f2`, de zero chunks e mesmo
SHA/URL, permaneceu inalterado. É pendência de catálogo para limpeza futura autorizada;
não justifica exclusão ou alteração nesta verificação.

## Conferência das respostas novas

O smoke remoto passou em S01, S04 e S12 (21 citações; zero ausentes ou ambíguas).
Comparei as respostas e os resumos com as evidências integrais associadas:

| Caso | Conferência efetuada | Resultado |
|---|---|---|
| S01 | Dossiê [1], p. 120, chunk `8529522f-dde5-42bb-9d85-3490749503ef`: data, alcance e efeitos do AI-5; referências restantes em correspondência única | A autoria aparece corretamente como Familiares/IEVE; o texto atribui ao Dossiê suas próprias formulações. |
| S04 | Dossiê [2], p. 30, chunk `9e127567-526f-4b5b-8313-56437412b63f`: Lei 10.875/2004, início e transferência da CEMDP; CNV [3]/[6] para recomendações | Correção preserva sujeito e alcance: as recomendações são da CNV, não da CEMDP; autoria do Dossiê está correta. |
| S12 | Dossiê [1] e [7], p. 120, chunks `8529522f-dde5-42bb-9d85-3490749503ef` e `cb7b1e24-5310-4771-9697-dfe11d644a43` | A nota identifica a compilação de Familiares/IEVE e não transfere autoria à CEV-SP; a síntese sobre AI-5 acompanha o trecho. |

Há redundância menor em S12: [2]/[4] sustentam a mesma passagem por fontes distintas,
e [5]/[6] repetem o mesmo trecho do SJPMG. Não há referência ausente, atribuição falsa
ou razão para reescrever as respostas nesta etapa.

## Decisão limitada e pendências

**Retiro o veto bibliográfico da amostra S01/S04/S12:** título, autoria editorial,
URL e localizadores usados agora são rastreáveis ao Dossiê completo, e os testes remotos
registraram 3/3 respostas aprovadas. Esta decisão é somente bibliográfica e amostral.

`tipo_fonte: relatorio_oficial` e `confiabilidade: alta` permaneceram sem reavaliação:
não são validados por esta aplicação e não se deve forçar outra categoria sem decisão
editorial/taxonômica própria. Persistem também avaliação humana/publicação, corpus,
paginação além dos dois pontos conferidos e eventual limpeza autorizada do registro vazio.
