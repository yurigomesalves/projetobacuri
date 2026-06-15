# Auditoria — CEV-SP "Rubens Paiva", Tomo II (versão de síntese), 2014

**Documento auditado**: `pipeline/dados/extraido/cev-sp-rubens-paiva-tomo2.jsonl` (16 páginas) e
`pipeline/dados/chunks/cev-sp-rubens-paiva-tomo2.jsonl` (25 chunks, `secao=null`, `tipo_chunk=corpo`).

**Veredito**: apto com ressalvas (uma delas bloqueante para indexação até correção).

## 1. Natureza do documento (achado principal)

Confirmado: este PDF é o texto de **apresentação/síntese** do "Dossiê Ditadura: Mortos e
Desaparecidos Políticos no Brasil (1964-1985)" — narra a história do Dossiê (origem em 1979,
edições de 1984, 1995, 2009 com 426/436 nomes), seu papel jurídico (Lei 9.140/95, Caso Araguaia)
e traz recomendações da CEV-SP. **Não contém a lista de vítimas nem as biografias individuais**
do Dossiê — apenas as referencia e descreve.

Risco real: se o chatbot citar este documento em resposta a "quem foi [nome de vítima X]", vai
parecer que tem a biografia mas não tem. O RAG precisa responder com base em outro acervo para
biografias individuais, e usar este Tomo II apenas para perguntas sobre a *história/metodologia
do Dossiê Ditadura* e seu papel nas investigações.

### Nota de contexto sugerida (`nota_contexto`, para aplicar via SQL)

> Este documento é a SÍNTESE/APRESENTAÇÃO do "Dossiê Ditadura: Mortos e Desaparecidos Políticos
> no Brasil (1964-1985)", elaborada pela Comissão da Verdade do Estado de São Paulo "Rubens
> Paiva" (2014). Ele narra a história, a metodologia e o papel jurídico do Dossiê, mas **não
> contém a lista nominal nem as biografias das 436 vítimas** registradas na edição de 2009 do
> Dossiê (Imprensa Oficial/SP, org. Janaína de Almeida Teles e Flamarion Maués). Para biografias
> individuais, consulte o acervo específico de vítimas do Projeto Bacuri, quando disponível.

## 2. Problemas encontrados

- **[bloqueante] Chunk duplicado**: `ordem 23` (p.15) e `ordem 24` (p.15-16) repetem
  verbatim o parágrafo "Em termos jurídicos e institucionais, o Dossiê serviu de fonte para a
  elaboração do anexo I da Lei 9.140/95... para formularem seus pedidos e propostas." Isso é
  artefato de OCR/parsing na junção de página 15→16, não decisão editorial. Vai gerar
  recuperação redundante e infla a contagem de chunks. **Correção proposta**: cientista-de-dados
  remove a duplicação do início do chunk `ordem 24`, mantendo apenas o conteúdo novo (a partir
  de "O Dossiê tem sido um dos principais documentos...").

- **[importante] Ausência de `nota_contexto`**: sem ela, há risco de o usuário/bot tratar este
  Tomo II como o Dossiê completo. Ver texto sugerido acima.

- **[menor] Citações jurídicas de terceiros país (Argentina)**: chunks 19-21 (ordens 18-20)
  citam Conadep, EAAF, "mega causa" Campo de Mayo, La Cacha — nomes próprios estrangeiros
  preservados corretamente, sem distorção. Sem ação necessária.

- **[menor] Epígrafe de Júlio Fuchik (chunk ordem 0, p.1)**: trecho literário de "Testamento sob
  a Forca" (Editora Brasil Debates, 1980), citado fora de contexto histórico-factual. Se
  recuperado isoladamente, não gera negacionismo nem erro factual — é uma epígrafe que já tem
  autoria e fonte explícitas no próprio chunk. Risco baixo; recomendo apenas observar se o bot
  o cita como se fosse afirmação factual da CEV-SP (não é — é epígrafe de abertura).

## 3. Qualidade do texto e segmentação

Texto nativo (não OCR), bem legível. Nomes de vítimas e perpetradores aparecem sempre com
contexto factual e fonte (ex.: Chael Charles Schreier com depoimento de Maria Auxiliadora Lara
Barcelos, nota 3; ata Geisel/Médici/Tavares/Bandeira citada via reportagem "A Ordem é Matar",
Isto É, 24/03/2004, Amaury Ribeiro Júnior). Nenhum chunk separa nome de vítima do contexto do
crime. Numeração de páginas (`paginas: "X-Y"`) coerente com as quebras de página do texto
extraído.

## 4. Conformidade editorial

Tom sóbrio, sem relativização ("não é revanchismo, é desejo de justiça" — citação direta,
preservada). Tortura, desaparecimento forçado e ocultação de cadáver são nomeados com precisão
(tipologia CNV). Nenhum trecho atribui crime a indivíduo nominado fora do que consta no próprio
documento (os generais citados — Geisel, Médici, Tavares, Bandeira — aparecem via citação da
reportagem de 2004, com fonte explícita).

## O que precisa de decisão do Yuri

1. Aprovar o texto da `nota_contexto` acima (ou ajustar) para aplicação via SQL.
2. Encaminhar ao cientista-de-dados a correção do chunk duplicado (ordens 23/24).
3. Sugestão de entrada no diário de bordo: "Auditoria do Tomo II (síntese) da CEV-SP concluída —
   apto com ressalvas; identificado chunk duplicado (p.15-16) a corrigir e proposta de nota de
   contexto deixando claro que o documento é a apresentação do Dossiê Ditadura, não a lista
   completa de vítimas."
