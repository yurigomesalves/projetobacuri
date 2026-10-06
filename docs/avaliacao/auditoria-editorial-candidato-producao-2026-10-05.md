# Auditoria editorial — candidato de produção (05/10/2026)

## Escopo

Revisão da amostra real do candidato `dpl_D2atEEe3Ny6kmErmhWcuqQ2hUJSu`, entrega
local `aa40d67`: S01, S03, S04, S06 e S12. Foram confrontados resumo e resposta com
37 citações associadas; o manifesto registra 29 consultas, zero associação ambígua ou
ausente. A decisão abaixo vale apenas para esta amostra, não aprova publicação,
corpus, prompt completo, paginação de PDF, v4 ou desempenho operacional.

| Caso | Afirmações conferidas | Resultado |
|---|---|---|
| S01 | AI-5, garantias, poderes, controle judicial, censura e argumentação de Gama e Silva | sustentadas; autores e nota de rodapé são identificados. |
| S03 | violações contra Waimiri-Atroari, testemunhos, estimativa, invasão, BR-174 e Balbina | sustentadas nos trechos citados; testemunho não é convertido em documento oficial. |
| S04 | função, composição, cronologia e expansão da CEMDP; Perus; notas e recomendações | sustentadas com distinção correta entre CEMDP e recomendações individuais da CNV. |
| S06 | participação empresarial, apoio material, vigilância, Boilesen, reparação e peso militar | uma ressalva menor abaixo. |
| S12 | seguimento sobre consequências políticas do AI-5, recesso, repressão e limites | sustentadas; o antecedente é o AI-5 de S01 e os limites não afirmam ausência no acervo. |

## Achado

### [menor] S06 — reconstrução não verificável de palavra ausente no chunk

- **Localizador:** seção “Financiamento e suporte material ao aparato repressivo”.
- **Afirmação:** as empresas “tiveram grande crescimento econômico” `[5]`.
- **Evidência:** `chunk_id d7d4b374-c675-472b-9dba-90f42601ed7a`, Relatório Final
  da Comissão da Verdade do Estado de São Paulo “Rubens Paiva”, Tomo I, p. 576.
  A conferência assistida do exemplar local, página física 576/página impressa 26,
  confirma visualmente a mesma lacuna: “tiveram um grande econômico”. Logo, não é
  hipótese de OCR do chunk e não sustenta a palavra “crescimento”.
- **Alcance da conferência assistida:** só esta frase e este exemplar local
  (`sha256 33d4a39f7fd0520a3390a3c398c1d374813737805df962901436b20bca8746c5`);
  não certifica autenticidade perante download atual nem outras páginas.
- **Correção proposta:** na próxima geração, omitir o qualificativo econômico quando
  a fonte o traz incompleto, ou reproduzir somente o que o trecho permite. A resposta
  atual não foi corrigida; a ressalva permanece na ficha humana.

## Salvaguardas verificadas

S04 afirma expressamente que os trechos `[3]`, `[6]`, `[7]` e `[8]` são notas,
referências ou recomendações da CNV sobre casos individuais e não os usa para definir
atribuições gerais da CEMDP. S06 atribui a informação sobre eventual colaboração de
Boilesen com a CIA a uma nota de rodapé e ao documentário intermediário, não a um
documento oficial. S03 identifica sobreviventes e audiência como testemunhos.

## Limites e decisão

Os chunks citados não registram o prompt completo nem todas as fontes recuperadas; os
documentos originais não foram abertos e as páginas são apenas localizadores declarados.
Os hashes dos casos e perguntas constam nos manifestos de proveniência do diretório de
saída. O gate de staging exige revisão humana; flags em 0 não equivalem a promoção v4,
e esta auditoria não certifica latência.

### Adendo bibliográfico — pendência adicional de publicação

Há divergência concreta na referência pública de `fonte_id`
`efc10a75-5cf4-435e-a598-7abf57f88ff7`: ela aparece como “Tomo II [síntese]”,
com URL de um PDF de 16 páginas, mas as respostas usam páginas declaradas 30 e 120.
No exemplar local, o arquivo correspondente ao título/URL tem 16 páginas; as frases
do AI-5 associadas à página 120 foram localizadas no **Dossiê completo** local, em
`dossie-ditadura-cevsp.pdf`, página física 120 (impressa 126). Isso não certifica a
página 30, a URL canônica do completo nem os demais PDFs.

O conteúdo histórico desta amostra permanece registrado como auditado nos chunks, mas
a referência exibida não permite ao leitor alcançar os localizadores declarados. A
orientação é: para conferir as páginas 30/120, usar o Dossiê completo; título e link
da citação precisam de correção de metadados antes de publicação. Não foi feita
correção em banco, código ou resposta.

**Decisão atual: veto operacional editorial da amostra para publicação até corrigir a
divergência de metadados/link/paginação dessa fonte, além da ressalva menor em S06.**
A publicação continua sem aprovação humana. Releitura final confirma que o veto novo
é bibliográfico e de rastreabilidade, não revisão da sustentação histórica já anotada.
