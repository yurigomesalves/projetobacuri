# Notas de contexto — CEV-SP "Rubens Paiva", Tomo I (`cev-sp-rubens-paiva-tomo1`)

> Registro de transparência editorial (2026-06-14), em atendimento à auditoria de
> 14/06/2026 (ver `docs/diario-de-bordo.md`). Aplica-se ao campo `chunks.nota_contexto`
> (migração 0009), exibido em caixa de aviso na citação ao usuário e enviado ao LLM
> como contexto adicional.

## Problema

Dois blocos de páginas do Tomo I, ao serem recuperados isoladamente pelo RAG,
correm risco de má interpretação se apresentados sem aviso:

- O leitor pode confundir documentos PRODUZIDOS PELA REPRESSÃO, meramente
  reproduzidos pela CEV-SP como prova, com a análise/posição da própria Comissão.
- O leitor pode confundir documentos PRODUZIDOS PELA RESISTÊNCIA (denúncias),
  também reproduzidos como prova, com texto analítico da Comissão — além de
  enfrentar baixa legibilidade por OCR degradado.

Em ambos os casos, a ausência de nota viola o princípio 3 (referência autoral
clara) e abre espaço para leituras negacionistas ou descontextualizadas
(princípio 5).

---

## Bloco 1 — Boletins de inteligência do SNI (pp. 699–857)

**Natureza**: documentos `documento_repressao` (SNI/CI-SI, Agência São Paulo),
reproduzidos na íntegra pela CEV-SP como prova documental — carimbos
"RESERVADO", "DIFUSÃO EXTERNA". Conteúdo: relatórios de espionagem da Guerra
Fria, sob a ótica anticomunista paranoica do regime (vigilância de movimentos
sociais, Igreja, estudantes, alegada "espionagem soviética" etc.).

**Risco**: confundir a visão do órgão repressor com a análise da CEV-SP.

**Borda precisa (auditoria 14/06/2026)**: o anexo de boletins é contíguo da
p.699 (cabeçalho "PRESIDÊNCIA DA REPÚBLICA / SNI") até o início da p.857; a
partir da p.857 o texto analítico da CEV-SP recomeça (análise sobre o genocídio
de povos indígenas). Um chunk de transição na p.857 que já era texto da comissão
foi auditado e teve a nota REMOVIDA, para não rotular análise da comissão como
boletim do SNI.

**Texto da nota**:

> Este trecho é um boletim de inteligência produzido pelo Serviço Nacional de
> Informações (SNI), reproduzido pela Comissão Estadual da Verdade de São Paulo
> como prova documental — não é uma análise da Comissão. O conteúdo reflete a
> visão dos órgãos de repressão durante a ditadura, incluindo seu enquadramento
> anticomunista de movimentos sociais e religiosos, e deve ser lido como objeto
> de investigação histórica, não como relato factual sobre as pessoas e
> organizações vigiadas.

---

## Bloco 2 — Anexo de documentos da resistência/denúncia (pp. 460–501)

**Natureza**: documentos `testemunho`/denúncia produzidos pela resistência e
oposição à ditadura, reproduzidos pela CEV-SP. Inclui a lista "Les
tortionnaires" (boletim DIAL n°287, 1976, ~151 nomes de torturadores denunciados
por presos políticos do Presídio Militar) e dossiês clandestinos brasileiros
(caso Vladimir Herzog, "Braço Clandestino da Repressão"/AAA, farsas de suicídio).

**Risco duplo**: (a) o texto recuperado tem baixa legibilidade — reprodução
escaneada com OCR degradado (palavras quebradas, nomes corrompidos), com
re-OCR em andamento; (b) é documento de denúncia da resistência, não texto
analítico da Comissão.

**Texto da nota**:

> Este trecho é um documento de denúncia produzido pela resistência à ditadura
> (ex.: boletim DIAL ou dossiês clandestinos sobre crimes de agentes da
> repressão), reproduzido pela Comissão Estadual da Verdade de São Paulo como
> prova documental — não é texto analítico da Comissão. A digitalização desta
> seção tem OCR degradado e está em processo de revisão; nomes e trechos podem
> aparecer corrompidos ou ilegíveis até a conclusão do reprocessamento.

---

## Aplicação

Ambas as notas devem ser gravadas em `chunks.nota_contexto` para todos os chunks
cujo `pagina` esteja nos intervalos 699–857 (Bloco 1) e 460–501 (Bloco 2) da
fonte `cev-sp-rubens-paiva-tomo1`. Atualização aplicada diretamente no banco pelo
Yuri (fora do escopo deste agente).
