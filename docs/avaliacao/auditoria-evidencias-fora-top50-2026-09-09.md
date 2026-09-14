# Auditoria das evidências fora do top 50

Data: 09/09/2026.

## Escopo

Foram examinadas as 10 unidades de evidência que continuaram ausentes no diagnóstico
vetorial com 50 resultados. Para cada uma, a auditoria conferiu o texto integral dos
chunks das páginas esperadas, buscou até 500 resultados e comparou os embeddings de
passagem gerados pelo pipeline Python com a implementação JavaScript usada pelo app.

## Resultado quantitativo

| Pergunta | Evidência | Maior similaridade do alvo | Similaridade na posição 500 | Melhor posição |
|---|---|---:|---:|---:|
| P14 | C47–50 | 0,8607 | 0,8754 | >500 |
| P14 | D94 | 0,8638 | 0,8754 | >500 |
| P15 | E350 | 0,8580 | 0,8665 | >500 |
| P16 | F204 | 0,8658 | 0,8666 | >500 |
| P17 | F395 | 0,8431 | 0,8575 | >500 |
| P18 | F314 | 0,8362 | 0,8581 | >500 |
| P18 | G3 | 0,8543 | 0,8581 | >500 |
| P23 | F9 | 0,8345 | 0,8605 | >500 |
| P23 | D94 | 0,8352 | 0,8605 | >500 |
| P23 | F204/206 | 0,8391 | 0,8605 | >500 |

Todos os alvos superam o limiar público de 0,82. A ausência no top 8 não decorre do
limiar: centenas de chunks concorrentes recebem similaridade ainda maior.

## Conferência do conteúdo

Os textos indexados sustentam as evidências esperadas. Entre os exemplos:

- C47–50 e D94 descrevem repressão a trabalhadores rurais, apoiadores, lideranças,
  jagunços e pistoleiros, além dos limites dos levantamentos de vítimas.
- E350 trata explicitamente da tortura de camponeses no Araguaia e das barreiras para
  testemunhar e denunciar.
- F204–206 caracteriza violações contra povos indígenas como sistêmicas e ligadas a
  políticas estruturais de Estado.
- F395 reúne no mesmo chunk a criação do MNU, violações institucionalizadas, identidade
  negra e conflito com a propaganda de “democracia racial”.
- F314 e G3 registram participação civil, financiamento da estrutura repressiva,
  benefícios e apoio de empresas e entidades privadas.
- C20–24 e C39–42 deixaram este grupo após a criação de P31: as duas evidências
  passaram a aparecer diretamente no top 50.

Não foi identificada página ausente, âncora deslocada ou evidência vazia.

## Equivalência dos embeddings

Foram recalculados em JavaScript os embeddings de 49 chunks únicos e comparados aos
vetores gravados pelo pipeline Python. O cosseno variou de
0,99999999999969 a 0,99999999999986, com média 0,99999999999980. As duas
implementações produzem, na prática, o mesmo vetor; a integração entre runtimes não é
a causa da perda.

## Diagnóstico

1. **Concorrência documental:** o acervo contém muitos relatórios e depoimentos com
   vocabulário semelhante. A ordenação puramente vetorial não privilegia a passagem
   mais adequada nem diversifica fontes.
2. **Diluição do assunto:** alguns chunks juntam o trecho relevante a outro tema. Em
   F395, por exemplo, o texto sobre o MNU vem depois de uma longa passagem sobre o
   movimento de mulheres.
3. **Perguntas compostas:** P23 exige recuperar grupos e tipos documentais distintos.
   Um único vetor de consulta representa mal todas essas necessidades.
4. **Formulação abstrata:** perguntas como P18 e P23 resumem uma conclusão histórica;
   os chunks usam formulações concretas diferentes, apesar de sustentarem a resposta.

## Consequência para a próxima experiência

Baixar o limiar não ajuda estas 10 unidades, pois todas já estão acima dele. Aumentar
o top-k até centenas elevaria ruído, custo e risco de citações inadequadas. A próxima
experiência deve combinar: decomposição de perguntas compostas em subconsultas,
diversidade por fonte e reranqueamento dos candidatos. Os parâmetros devem ser
escolhidos em perguntas reservadas, sem otimização sobre as 25 perguntas visíveis.

Dados completos e textos dos chunks:
`diagnostico-evidencias-fora-top50.json`.
