# Fontes Prioritárias — onde obter os documentos

> Ordem de ingestão definida pelo Yuri. URLs conferidas em jun/2026; endereços de acervos públicos
> mudam — se algum link quebrar, buscar pelo nome da instituição. Sempre registrar proveniência no manifesto.

## 1. Comissões da Verdade (prioridade máxima)
- **Comissão Nacional da Verdade (CNV)** — Relatório final (dez/2014), 3 volumes em PDF com camada de texto (não precisa de OCR). O volume III traz os perfis das 434 vítimas — base ideal para as biografias e o mapa. Hospedado no portal Memórias Reveladas / Arquivo Nacional: https://www.gov.br/memoriasreveladas/ (buscar "Relatório CNV").
- **Comissões estaduais e municipais**: Comissão da Verdade do Estado de São Paulo "Rubens Paiva" — relatório final (mar/2015) hospedado oficialmente em `comissaodaverdade.al.sp.gov.br/relatorio/`, organizado em 4 tomos. ✅ Ingerido (jun/2026): **Tomo I** (Recomendações Gerais e Recomendações Temáticas), 1912 p., PDF com camada de texto, baixado diretamente do portal oficial (que está no ar e não bloqueia downloads automatizados) — 1912 páginas extraídas em `pipeline/dados/extraido/cev-sp-rubens-paiva-tomo1.jsonl`. Hash e proveniência em `pipeline/manifesto.json`. **Tomo II** (Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil 1964-1985) verificado mas NÃO ingerido ainda — só existe no site oficial um PDF de 16 páginas/839 KB; pendente decisão do Yuri sobre ingerir esse documento curto ou buscar versão mais completa. Tomos III (audiências, ~184 MB) e IV (contribuições/grupos de trabalho, ~124 MB) ainda não avaliados. Comissão da Verdade do Rio (CEV-Rio), comissão mineira, entre outras — relatórios públicos nos sites das assembleias/arquivos estaduais, ainda não ingeridos.
- **Comissão Especial sobre Mortos e Desaparecidos Políticos (CEMDP)** — livro "Direito à Memória e à Verdade" (2007). ✅ Ingerido (jun/2026): PDF com camada de texto (502 p.), 502 páginas extraídas em `pipeline/dados/extraido/cemdp-direito-memoria-verdade.jsonl`. Não foi localizada cópia hospedada em domínio gov.br ainda ativa; usamos a cópia mantida pelo DHnet (Rede Direitos Humanos e Cultura Democrática, ONG de referência em direitos humanos), que distribui o PDF original da Secretaria Especial dos Direitos Humanos da Presidência da República/CEMDP (2007) sem alterações — URL e hash registrados em `pipeline/manifesto.json`. Se uma cópia oficial gov.br for encontrada no futuro, atualizar a fonte e re-registrar a proveniência.

## 2. Brasil: Nunca Mais
- **BNM Digital** (Ministério Público Federal + Arquivo Edgard Leuenroth/Unicamp): cópias digitalizadas dos processos do STM usados no projeto BNM. https://bnmdigital.mpf.mp.br — atenção: muitos documentos são escaneados (exigem OCR) e o acervo é enorme; começar pelos tomos do "Projeto A".

## 3. Imprensa da época
- **Hemeroteca Digital Brasileira** (Biblioteca Nacional): https://bndigital.bn.gov.br/hemeroteca-digital/ — periódicos 1964–1985. Lembrete do curador: imprensa sob censura é objeto de crítica, não autoridade.
- Imprensa alternativa digitalizada (Opinião, Movimento, O Pasquim) — parte na própria Hemeroteca e no Armazém Memória (https://armazemmemoria.com.br).

## 4. Documentos dos EUA
- **CIA FOIA Electronic Reading Room**: https://www.cia.gov/readingroom/ — buscar "Brazil" + período; em inglês (o embedding multilíngue cobre).
- **Department of State – Office of the Historian (FRUS)**: https://history.state.gov — volumes sobre o Brasil (1964 etc.), texto estruturado de ótima qualidade.
- **National Security Archive (GWU)** — coleções "Brazil": https://nsarchive.gwu.edu — documentos desclassificados comentados.
- Projeto **Opening the Archives** (Brown University): dezenas de milhares de documentos do Departamento de Estado sobre o Brasil digitalizados.

## 5. Produção acadêmica
- **SciELO**: https://www.scielo.br — artigos com licença aberta (verificar a licença de cada um no metadado; priorizar CC-BY).
- **BDTD/IBICT** (teses e dissertações das universidades brasileiras): https://bdtd.ibict.br
- **Catálogo de Teses CAPES**: https://catalogodeteses.capes.gov.br
- Repositórios institucionais das federais (UFU: https://repositorio.ufu.br).

## Estado e direito (para o módulo crimes e justiça — Fase 7)
- Relatório CNV vol. I, parte de "conclusões e recomendações".
- Sentença da Corte Interamericana de Direitos Humanos, caso **Gomes Lund e outros ("Guerrilha do Araguaia") vs. Brasil** (2010) — pública no site da Corte IDH.
- Legislação no Planalto (Código Penal, Lei 6.683/1979 — Anistia, Lei 9.140/1995): https://www.planalto.gov.br/legislacao

## Nota legal de redistribuição
Documentos públicos oficiais (CNV, FRUS, CIA FOIA) podem ser armazenados e citados livremente. Artigos acadêmicos e jornais digitalizados: armazenar localmente para indexação é uso de pesquisa, mas o chatbot deve EXIBIR apenas trechos curtos com link para o original (o que o design de citações já garante). Teses/artigos: respeitar a licença declarada.
