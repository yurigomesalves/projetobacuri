# Teto de decomposição curada

Data: 9 de setembro de 2026.

## Objetivo e limite

Este ensaio verifica se consultas mais específicas conseguem recuperar as
evidências difíceis com menos candidatos. As consultas foram formuladas após a
leitura das respostas e páginas aprovadas. Portanto, o resultado contém
informação do gabarito e representa somente um **teto de desenvolvimento**.

Ele não mede a capacidade de gerar subconsultas automaticamente, não é resultado
de teste reservado e não autoriza mudança na busca pública.

As formulações usadas estão expostas integralmente em
[`consultas-decomposicao-desenvolvimento.json`](consultas-decomposicao-desenvolvimento.json).

## Método

- preservar os 22 acertos do diagnóstico vetorial top 50;
- manter até 13 fontes distintas da pergunta original;
- pesquisar até 12 trechos por fonte para cada subconsulta, com uma fonte por
  chamada ao banco para evitar o limite de tempo;
- em P15, tentar acrescentar até cinco fontes encontradas pela consulta expandida;
- medir apenas a presença da evidência no conjunto candidato, antes da ordenação
  final em oito trechos.

## Resultado

| Estratégia | Evidências candidatas | Média nas 7 perguntas difíceis | Maior conjunto |
|---|---:|---:|---:|
| Vetorial top 50 | 22/32 (68,8%) | 50 ou menos | 50 |
| Roteamento 13 fontes × 60 | 29/32 (90,6%) | 735,7 | 791 |
| Decomposição curada | 31/32 (96,9%) | 223,2 | 412 |

A decomposição recuperou nove das dez unidades antes ausentes e reduziu em 69,7% a
média de candidatos em relação ao roteamento 13 × 60. O maior conjunto caiu
47,9%. P15/E350 permaneceu ausente porque a CNV Volume I não foi roteada.

Nas consultas isoladas dentro das fontes, as evidências ficaram nestas melhores
posições: P14 em 4 e 3; P15 em 1; P16 em 8; P17 em 1; P18 em 2 e 2; e P23 em 1,
11 e 3. Em P15, essa posição dentro do documento não se converteu em recuperação
automática porque a fonte correta não entrou no roteamento.

Os dados completos estão em
[`resultados-decomposicao-curada.json`](resultados-decomposicao-curada.json). A
execução reproduzível é `npm run avaliar:decomposicao`.

## Interpretação

O experimento demonstra que a informação necessária existe no índice e pode ser
recuperada com conjuntos menores quando a consulta usa o vocabulário documental.
Ele também confirma dois problemas diferentes:

- perguntas amplas, como P23, precisam ser divididas por sujeito ou dimensão;
- a divisão de P24 e P31 confirmou que referentes explícitos melhoram a recuperação.

P17 continua exigindo cautela editorial: o chunk aceito mistura movimentos
femininos, Movimento Negro Unificado e novo sindicalismo. A expansão encontra a
página, mas isso não resolve a segmentação temática do trecho.

A inspeção posterior confirmou que F395 sustenta integralmente as três afirmações
esperadas de P17; a recomendação é manter a âncora e tratar a dificuldade como
segmentação. A divisão aprovada de P24 e P31 está registrada em
[`proposta-revisao-p17-p24-2026-09-09.md`](proposta-revisao-p17-p24-2026-09-09.md).

## Próximo critério de passagem

Uma etapa posterior deve produzir subconsultas sem acesso ao gabarito, registrar
modelo, prompt, latência e custo, e ser avaliada em perguntas factuais reservadas.
Depois disso ainda será necessário validar uma ordenação final de até oito
trechos. Até cumprir essas duas condições, a rota pública permanece vetorial.
