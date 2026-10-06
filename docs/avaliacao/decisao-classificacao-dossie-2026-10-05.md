# Decisão editorial proposta — classificação do *Dossiê Ditadura* (05/10/2026)

## Delimitação da decisão

Esta decisão trata exclusivamente da fonte `efc10a75-5cf4-435e-a598-7abf57f88ff7`:
*Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil (1964-1985)*. O
exemplar conferido tem 762 páginas, SHA-256
`e902047328adfa21ca523121684dd657ded74e28015199e2df59950cba0758a4`, e é a
edição de 2009 cuja apresentação atribui a organização editorial à Comissão de
Familiares de Mortos e Desaparecidos Políticos e ao IEVE. A Imprensa Oficial do
Estado de São Paulo é editora. O portal da CEV-SP é hospedeiro do PDF, não autor
da obra. Não há base para atribuir coautoria ao Grupo Tortura Nunca Mais/RJ nem
para declarar licença aberta.

## Classificação proposta

Proponho acrescentar ao vocabulário de `tipo_fonte` o valor
`compilacao_documental`, definido como: obra de memória e pesquisa que organiza,
contextualiza e apresenta documentos, denúncias, correspondência, entrevistas e
outros registros de proveniências múltiplas, com responsabilidade editorial
identificada. Não é relatório de uma comissão estatal, nem se torna material
didático apenas por poder ser usado em ensino.

Para esta fonte, a classificação proposta é:

| campo | valor proposto |
|---|---|
| `tipo_fonte` | `compilacao_documental` |
| `confiabilidade` | `alta` |
| `subtipo` | `memoria_e_direitos_humanos` (opcional, se o campo for adotado) |
| `periodo` | `pos_1985` |

A confiabilidade `alta` cabe no vocabulário atual pela proveniência editorial
identificada, pela integridade conferida do exemplar e pela rastreabilidade
amostral dos trechos verificados. Ela não transfere automaticamente a cada trecho
a força probatória de todos os documentos reunidos, nem valida os 2.773 chunks
como corpus. A nota de contexto obrigatória e a crítica por trecho expressam a
heterogeneidade que o eixo de confiabilidade não mede. Isso tampouco hierarquiza
famílias, sobreviventes e movimentos de memória abaixo de órgãos do Estado:
fontes de origem estatal também exigem crítica de autoria, interesse e contexto.
O critério é a pergunta histórica e a proveniência do trecho, não a posição
institucional de quem o produziu.

### Texto para o glossário público

`compilacao_documental`: obra de memória e pesquisa, com responsabilidade
editorial identificada, que reúne e contextualiza documentos, relatos, denúncias
e registros de proveniências diversas. Cada trecho é lido conforme sua autoria e
contexto; a compilação não transforma todas as peças reunidas em documento
oficial nem lhes atribui a mesma força probatória.

## Uso por trecho e nota de contexto

O Dossiê tem natureza mista. Trechos de apresentação, síntese editorial e perfis
devem ser citados como formulações da compilação de Familiares/IEVE. Quando um
trecho reproduz ou resume um documento identificado, a resposta deve nomear o
documento e seu produtor quando isso estiver disponível, sem apagar a mediação
editorial do Dossiê. Depoimentos, denúncias familiares e documentos repressivos
mantêm suas características próprias; sua presença na compilação não os converte
em relatório oficial nem elimina a crítica documental requerida para cada caso.

`nota_contexto` recomendada: “Compilação documental de memória e direitos
humanos organizada pela Comissão de Familiares de Mortos e Desaparecidos Políticos
e pelo IEVE (edição de 2009). Reúne pesquisa, documentos e relatos de
proveniências diversas; a atribuição e o alcance devem ser verificados no trecho
citado. Não é relatório originalmente produzido pela CEV-SP, que apenas hospeda
o PDF.”

Esta decisão não aprova o corpus inteiro, não certifica toda paginação, nem
dispensa a conferência humana de afirmações sobre pessoas, crimes ou vínculos.

## Efeito no catálogo e registros correlatos

1. A atualização do catálogo de ingestão deve identificar esta fonte pelo UUID
   `efc10a75-5cf4-435e-a598-7abf57f88ff7`, pelo hash e pela combinação de título,
   autoria e URL; não somente pela URL. Antes de qualquer reingestão, deve haver
   uma regra explícita que impeça selecionar arbitrariamente o primeiro de dois
   registros com a mesma URL.
2. O registro vazio `d6f2e787-ee4a-49a3-9992-534be02ba8f2` tem a mesma URL/hash e
   zero chunks. Requer auditoria específica, com comparação de metadados e
   histórico de ingestão, seguida de decisão humana de arquivar, fundir ou manter.
   Não deve receber automaticamente os metadados desta decisão, ser apagado, nem
   receber chunks por dedução.
3. A síntese distinta `cev-sp-rubens-paiva-tomo2` deve ser preservada como obra da
   CEV-SP, com seu próprio URL, paginação e classificação `relatorio_oficial`.
   Ela não é substituta do PDF completo e não pode compartilhar identificador ou
   metadados com a compilação de Familiares/IEVE.

## Problemas encontrados e decisão humana

- **[importante]** A taxonomia atual não comporta compilação documental de memória
  e direitos humanos; a mudança proposta exige registrar a definição em
  `docs/taxonomia.md`, atualizar o contrato e migrar o valor no banco de forma
  controlada.
- **[importante]** O catálogo contém duplicidade por URL que torna uma reingestão
  insegura até haver seleção determinística por identidade documental.
- **[menor]** `subtipo: memoria_e_direitos_humanos` é opcional e, se adotado,
  deve ser aceito pelo esquema/validações antes de uso. Não é necessário ampliar
  o vocabulário fechado de `confiabilidade`.

Decisão humana requerida: aprovar a inclusão da categoria e, caso desejado, do
subtipo acima, antes de alterar taxonomia, banco ou pipeline.
