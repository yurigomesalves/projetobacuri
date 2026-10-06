# Proposta de correção bibliográfica — Dossiê Ditadura (05/10/2026)

> Proposta preparada, não aplicada. A fonte-alvo é somente
> `efc10a75-5cf4-435e-a598-7abf57f88ff7`.

## Problema e evidência

O registro atual chama a fonte de “Tomo II [síntese]”, aponta para PDF de 16 páginas
e exibe localizadores 30 e 120. O download oficial agora identificado é o Dossiê
completo: 762 páginas, 77.707.471 bytes, SHA-256
`e902047328adfa21ca523121684dd657ded74e28015199e2df59950cba0758a4`. Ele é idêntico
ao exemplar local `dossie-ditadura-cevsp.pdf`. A conferência de integridade achou
correspondência entre os 2.773 chunks e o exemplar local, sem divergências. A página
física 120 contém a passagem sobre AI-5 (página impressa 126); a página física 30
contém a passagem sobre a CEMDP e seu cabeçalho confirma a página impressa 36.

## Antes e depois propostos

| Campo | Antes | Depois proposto |
|---|---|---|
| título | Relatório da CEV-SP, Tomo II, síntese | *Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil (1964-1985)* |
| autor/órgão | Comissão da Verdade do Estado de São Paulo | Comissão de Familiares de Mortos e Desaparecidos Políticos; IEVE |
| URL | PDF da síntese de 16 p. | `https://comissaodaverdade.al.sp.gov.br/livros/downloads/Livro-Dossie-ditadura.pdf` |
| proveniência | afirma que o completo não foi localizado oficialmente | portal oficial da CEV-SP; hash acima |
| data | `2015-03-01` | `null` (ano de 2009 confirmado, sem dia/mês) |
| licença | “documento público oficial” | `null` (hospedagem pública não comprova licença) |
| nota de contexto | ausente | Compilação documental de familiares/IEVE, não relatório originalmente produzido pela CEV-SP; hospedar não implica autoria. |

## Classificação pendente, fora desta correção

O Dossiê não foi originalmente produzido pela CEV-SP; por isso, esta revisão não
valida a classificação atual `relatorio_oficial`. Isso também não autoriza impor
`material_didatico_educativo`: a taxonomia reserva essa categoria a conteúdo destinado
ao ensino, finalidade não demonstrada pela apresentação do Dossiê. `tipo_fonte` e
`confiabilidade` ficam fora do patch e requerem decisão editorial/taxonômica separada.

A autoria editorial da edição de 2009 é confirmada pela apresentação local (p. físicas
13–15) e pela fonte primária informada do Grupo Tortura Nunca Mais/RJ: Comissão de
Familiares de Mortos e Desaparecidos Políticos e IEVE; a Imprensa Oficial do Estado de
São Paulo é editora. O Grupo Tortura Nunca Mais/RJ corrobora essa informação e não deve
ser incluído como coautor.

## Pendências e consentimento

Restam: decisão separada sobre classificação e confiabilidade, e validação pública do
título, URL e localizadores após a aplicação. A correção bibliográfica estreita pode
resolver o veto bibliográfico, mas somente depois de aplicada e validada; não certifica
classificação, corpus ou paginação além dos localizadores físicos conferidos.

Com consentimento explícito de Yuri: **atualizar somente
`efc10a75-5cf4-435e-a598-7abf57f88ff7`, preservar os 2.773 chunks e não reindexar;
depois validar título, URL e localizadores físicos 30/120 (páginas impressas 36/126) na
resposta pública.**

Os valores exatos para aplicação estão em
[`proposta-metadados.json`](../../output/correcao-dossie-2026-10-05/proposta-metadados.json).

**Proposta estreita revisada.**
