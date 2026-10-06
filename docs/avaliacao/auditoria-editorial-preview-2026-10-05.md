# Auditoria editorial — preview de 05/10/2026

## Escopo e método

Foram auditados os cinco casos dirigidos `S01`, `S03`, `S04`, `S06` e `S12`, isto é,
40 citações públicas e seus 40 registros associados. Cada associação foi conferida
contra o chunk integral por `fonte_id`, páginas, seção e prefixo literal; o manifesto
registra zero associação ausente ou ambígua. Há 33 `chunk_id` distintos, pois `S01` e
`S12` reutilizam sete evidências sobre o AI-5. A revisão cotejou resumo e resposta
com os chunks citados, com atenção a datas, agentes, quantidades, causalidade,
limites e natureza da fonte. Não trata a presença do marcador como aprovação histórica.

| Caso e pergunta | Afirmações efetivamente verificadas | Resultado |
|---|---|---|
| S01 — “O que foi o AI-5 e quais garantias ele suspendeu?” | edição, poderes, recesso, cassações, habeas corpus, censura, expurgo e efeitos do AI-5 | sustentadas pelos chunks 1–8; a nota contextual do SJPMG é devidamente sinalizada no texto. |
| S03 — “Que violações atingiram o povo Waimiri-Atroari durante a construção da BR-174?” | BR-174, ataque aéreo como testemunho, estimativa de mais de 2 mil mortes, invasão, Balbina e mineração | sustentadas pelos chunks 1–8; a autoria do testemunho é indicada e a estimativa é apresentada como estimativa. |
| S04 — “Qual era a função da CEMDP?” | criação, composição, atribuições, cronologia, Lei 10.875, Perus e referências à CEMDP | problemas importantes abaixo. |
| S06 — “Que papel tiveram empresas e agentes civis na ditadura militar-empresarial?” | participação empresarial, colaboração repressiva, vigilância fabril e relação empresarial-militar | sustentadas pelos chunks 1–8, com ressalvas de atribuição abaixo. |
| S12 — continuação de S01: “E quais foram as consequências políticas dessa medida?” | consequências institucionais do AI-5, censura, repressão, transição e limitações | sustentadas pelos chunks 1–8; não há resumo e a resposta identifica o caráter testemunhal/setorial da fonte 6. |

## Achados

### [importante] S04 — generalização de referências bibliográficas como atuação da CEMDP

- **Afirmação:** “a CEMDP recebeu processos e relatos que constam em processos
  apresentados à Comissão da Anistia”, acompanhada de `[3] [6] [7] [8]`.
- **Evidência:** `[3]`, `chunk_id ddfabb0b-7f7c-4d51-9a4d-3714128ed781`, p. 174,
  informa apenas que, no perfil de João Alfredo Dias, foram consultados documentos e
  relatos do processo apresentado à CEMDP e à Comissão da Anistia. Os chunks `[6]`
  `37a87b76-5101-4db0-8f25-5a88392684f9`, `[7]`
  `f6f4faac-ae51-4454-9505-145917155cb5` e `[8]`
  `65d66c37-738f-4866-a590-a62f3e8b07c8` são notas bibliográficas de perfis distintos,
  não comprovam regra institucional de recebimento nem o enunciado agregado.
- **Problema:** a passagem transforma um dado situado de um perfil em atribuição
  geral da comissão e usa três referências que não sustentam essa generalização.
- **Correção editorial proposta:** omitir a passagem; se necessária, restringi-la
  explicitamente ao caso de João Alfredo Dias e usar somente `[3]`.

### [importante] S04 — recomendação da CNV apresentada no fluxo explicativo da CEMDP

- **Afirmação:** “Em casos específicos, como o de Lourival Moura Paulino”, segue-se
  recomendação de investigar, responsabilizar e retificar a causa da morte `[6]`.
- **Evidência:** `[6]`, `chunk_id 37a87b76-5101-4db0-8f25-5a88392684f9`, p. 946,
  é uma recomendação da CNV no perfil de Lourival Moura Paulino: “recomenda-se a
  investigação...” e remete, em nota, a fontes da CEMDP. Não atribui essa ação à
  CEMDP nem demonstra que seja exemplo de sua competência.
- **Problema:** a resposta sobre a comissão embaralha uma recomendação da CNV com
  sua explicação institucional, sem atribuição suficiente.
- **Correção editorial proposta:** retirar o exemplo ou reescrevê-lo como
  recomendação da CNV, separada da descrição das atribuições da CEMDP.

### [menor] S06 — cadeia de atribuição indireta para alegação sobre Boilesen e CIA

- **Afirmação:** Boilesen “também teria sido colaborador da CIA” `[3]`.
- **Evidência:** `[3]`, `chunk_id 6ba95d0a-79ff-47af-965b-05cde31726ed`, pp. 560–561,
  reproduz a nota 25, que atribui a informação a um documentário. O texto usa
  corretamente “teria”, mas a evidência imediata é uma nota de rodapé de segunda mão.
- **Correção editorial proposta:** manter somente com atribuição explícita (“a nota,
  citando o documentário *Cidadão Boilesen*, afirma...”) ou não usar esse detalhe
  quando a pergunta não o exigir.

## Metadados, proveniência e limites

Os títulos, autores/órgãos, páginas declaradas nos chunks, seções e URLs das 40
citações são compatíveis com os registros auditados. `S03[4]` é `tipo_chunk: nota_rodape` e a resposta o
declara como contexto secundário. `S01/S12[6]` e `S01/S12[7]` repetem o mesmo
conteúdo em relatórios diferentes; são corroborativos, não evidência independente.

O manifesto limita esta auditoria: não há prompt integral, portanto fontes recuperadas
e não citadas podem faltar; a amostra é dirigida de desenvolvimento, não independente
v4, e chunks não substituem conferência dos PDFs originais. Não foram conferidas página
física do PDF nem página impressa: a paginação registrada é somente o localizador
declarado na extração. A checagem HEAD externa informou 12 URLs com HTTP 200;
três PDFs da CNV ficaram sem confirmação por certificado e duas URLs retornaram HTML.
Isso é questão de acessibilidade a revalidar, não prova de documento falso nem base
para alterar metadados.

## Decisão editorial

**Vetar publicação deste preview até corrigir S04.** Os demais quatro casos preservam
o vínculo entre afirmação e material citado na amostra, mas a resposta S04 introduz
duas generalizações institucionais sem sustentação suficiente. Não há revisão histórica
completa: este parecer não aprova afirmações fora das verificadas acima.

## Ajustes de comportamento/prompt propostos (sem implementação)

1. Exigir que o modelo não infira competência institucional a partir de notas
   bibliográficas ou de um perfil individual; deve limitar a redação ao sujeito e ao
   alcance que o chunk enuncia.
2. Quando a evidência for recomendação de outra comissão, exigir nome do órgão autor
   na mesma frase; vedar sua apresentação como ação da instituição perguntada.
3. Para alegação sensível obtida de nota de rodapé, exigir atribuição à fonte
   intermediária e linguagem de escopo (“segundo...”), ou sua omissão.
4. Conservar a instrução de distinguir testemunho, análise e documento oficial; ela
   funcionou em S03 e S12.

## Checagem de consistência do parecer

Releitura final confirmou que os dois achados importantes citam exatamente os chunks
que não sustentam a generalização indicada; o achado menor conserva a ressalva já
presente no chunk. Não foram registrados como falhas fatos que os textos fornecidos
efetivamente afirmam, nem associação numérica foi tratada como prova histórica.
