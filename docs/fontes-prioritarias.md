# Fontes Prioritárias — onde obter os documentos

> Ordem de ingestão definida pelo Yuri. URLs conferidas em jun/2026; endereços de acervos públicos
> mudam — se algum link quebrar, buscar pelo nome da instituição. Sempre registrar proveniência no manifesto.

## 1. Comissões da Verdade (prioridade máxima)
- **Comissão Nacional da Verdade (CNV)** — Relatório final (dez/2014), 3 volumes em PDF com camada de texto (não precisa de OCR). O volume III traz os perfis das 434 vítimas — base ideal para as biografias e o mapa. Hospedado no portal Memórias Reveladas / Arquivo Nacional: https://www.gov.br/memoriasreveladas/ (buscar "Relatório CNV").
- **Comissões estaduais e municipais**: Comissão da Verdade do Estado de São Paulo "Rubens Paiva" — relatório final (mar/2015) hospedado oficialmente em `comissaodaverdade.al.sp.gov.br/relatorio/`, organizado em 4 tomos. ✅ Ingerido (jun/2026): **Tomo I** (Recomendações Gerais e Recomendações Temáticas), 1912 p., PDF com camada de texto, baixado diretamente do portal oficial (que está no ar e não bloqueia downloads automatizados) — 1912 páginas extraídas em `pipeline/dados/extraido/cev-sp-rubens-paiva-tomo1.jsonl`. Hash e proveniência em `pipeline/manifesto.json`. **Tomo II** (Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil 1964-1985) verificado mas NÃO ingerido ainda — só existe no site oficial um PDF de 16 páginas/839 KB; pendente decisão do Yuri sobre ingerir esse documento curto ou buscar versão mais completa. **Tomo III** (Audiências Públicas, 184 MB, 12225 páginas) avaliado em jun/2026: PDF inteiramente escaneado, SEM camada de texto (~5121 páginas em branco/separadoras, ~7104 com conteúdo). Baixado do portal oficial (hash em `pipeline/manifesto.json`); OCR completo (Tesseract `por`, 200 DPI) rodando em segundo plano via `pipeline/02c_ocr_tomo3_cev_sp.py` — estimativa de 2-3 horas, com checkpoint incremental em `cev-sp-rubens-paiva-tomo3.jsonl.progresso`. **Tomo IV** (Contribuições e Relatórios dos Grupos de Trabalho, 124 MB, 1324 páginas) ✅ Ingerido (jun/2026): PDF com camada de texto, extraído diretamente em `pipeline/dados/extraido/cev-sp-rubens-paiva-tomo4.jsonl` (148 páginas vazias, ~1,97 milhão de caracteres). **Comissão da Verdade do Rio (CEV-Rio)** ✅ Ingerido (jun/2026): Relatório Final (dez/2015, 229 p., 6,7 MB), PDF com camada de texto, obtido via Wayback Machine (captura de 16/07/2025) pois o portal oficial bloqueia downloads automatizados — 229 páginas extraídas em `pipeline/dados/extraido/cev-rj-relatorio-final.jsonl` (3 páginas vazias, ~1,33 milhões de caracteres). Hash SHA-256 e proveniência em `pipeline/manifesto.json`.

**Comissões estaduais ainda não ingeridas** (mapeamento da página https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/ em jun/2026):
- **Amazonas** — Comitê da Verdade do Amazonas — "Relatório O Genocídio do Povo Waimiri-Atroari" (PDF via Memórias Reveladas): `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/1r_cv_am_waimiri_atroari.pdf/@@display-file/file`
- **Espírito Santo** — Comissão Estadual da Memória e Verdade Orlando Bomfim — Relatório Final: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/RelatriodaComissoEstadualdaMemriaeVerdade1.pdf/@@display-file/file`
- **Paraíba** — Comissão Estadual da Verdade da Paraíba — Relatório Final: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/PBrelatorio_comissao_estadual_da_verdade_pbcompactado.pdf/@@display-file/file`
- **Paraná** — Comissão Estadual da Verdade do Paraná Teresa Urban — Relatório Final Vol. 1: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/comissao_da_verdade_v1_2versao.pdf/@@display-file/file` e Vol. 2: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/comissao_da_verdade_v2_2versao.pdf/@@display-file/file`
- **Pernambuco** — Comissão Estadual da Memória e Verdade Dom Helder Câmara — Relatório Final Vol. 1: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/CEV_PE_Relatorio_final_vol_1_Web.pdf/@@display-file/file`
- **Rio Grande do Sul** — Subcomissão Verdade, Memória e Justiça — Relatório Final: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/RSRelatrioSubcomissaoVerdadeMemriaeJustia.pdf/@@display-file/file`
- **Santa Catarina** — Relatório Final: `https://www.gov.br/memoriasreveladas/pt-br/assuntos/comissoes-da-verdade/estaduais/389fa27327d13645e1c7627cdf1c232a.pdf/@@display-file/file`
- **Amapá** — Comissão Estadual da Verdade Francisco Chagas Bezerra Chaguinha — só disponível via site institucional (sem PDF direto listado): `http://www.cev.ap.gov.br/interno.php?dm=166`
Nota: todos os PDFs do Memórias Reveladas bloqueiam download automatizado (React SPA); usar Wayback Machine (ver padrão CEV-RJ acima). Verificar disponibilidade com `https://archive.org/wayback/available?url=<url-sem-@@display-file>` antes de baixar.

**Comissão da Verdade em Minas Gerais (Covemg)**, comissão ESTADUAL ligada ao governo de Minas Gerais (não confundir com a comissão municipal de Belo Horizonte). ✅ Ingerido (jun/2026): **Relatório Final 2017** (1781 p., ~67 MB), PDF com camada de texto, baixado do repositório DSpace institucional `comissaodaverdade.mg.gov.br/bitstream/handle/123456789/2736/` — 1781 páginas extraídas em `pipeline/dados/extraido/cev-mg-covemg-relatorio-final-2017.jsonl` (3 páginas vazias, ~4,27 milhões de caracteres). Hash SHA-256 verificado contra valor previamente conhecido. **Anexo — Relatório Técnico de Recomendações do Centro de Estudos sobre Justiça de Transição da UFMG** (5 p., ~271 KB), PDF com camada de texto, baixado de `comissaodaverdade.mg.gov.br/bitstream/handle/123456789/2743/` — extraído em `pipeline/dados/extraido/cev-mg-covemg-anexo-justica-transicao-ufmg.jsonl` (0 páginas vazias, ~14,3 mil caracteres). Hash e proveniência de ambos em `pipeline/manifesto.json`.
- **Comissão Especial sobre Mortos e Desaparecidos Políticos (CEMDP)** — livro "Direito à Memória e à Verdade" (2007). ✅ Ingerido (jun/2026): PDF com camada de texto (502 p.), 502 páginas extraídas em `pipeline/dados/extraido/cemdp-direito-memoria-verdade.jsonl`. Não foi localizada cópia hospedada em domínio gov.br ainda ativa; usamos a cópia mantida pelo DHnet (Rede Direitos Humanos e Cultura Democrática, ONG de referência em direitos humanos), que distribui o PDF original da Secretaria Especial dos Direitos Humanos da Presidência da República/CEMDP (2007) sem alterações — URL e hash registrados em `pipeline/manifesto.json`. Se uma cópia oficial gov.br for encontrada no futuro, atualizar a fonte e re-registrar a proveniência.

### Catálogo DHnet de comissões da verdade (estaduais, municipais, universitárias e temáticas)
O **DHnet** (Rede Direitos Humanos e Cultura Democrática, ONG de referência) mantém em
`https://www.dhnet.org.br/verdade/estados/index.htm` um catálogo de ~44 relatórios de comissões
da verdade e **hospeda os PDFs diretamente** em `https://www.dhnet.org.br/verdade/cv/` — sem o
bloqueio anti-robô do Memórias Reveladas (mesmo host de onde já veio o CEMDP). É a via preferencial
para os documentos que o portal oficial trava. Proveniência: o DHnet redistribui o PDF original da
comissão sem alterações (registrar URL + hash no manifesto, como no CEMDP).

✅ **1º lote ingerido (jun/2026) — estaduais faltantes + regional do Triângulo Mineiro** (todos PDF
com camada de texto, extração direta; chunking em `pipeline/03_chunkar_estaduais.py`, indexados no
Supabase com `nota_contexto` editorial):
- **Amapá** "Chaguinha" (2017, 129 p.) → `cev-ap-relatorio-final` — 173 chunks, 4 partes.
- **Bahia** vol. 1 (Relatório Final de Atividades, 2016, 828 p.) → `cev-ba-relatorio-vol1` — 1071 chunks, 7 capítulos.
- **Bahia** vol. 2 (Íntegra dos Depoimentos, 2016, 980 p.) → `cev-ba-relatorio-vol2` — 1972 chunks; `subtipo=volume_de_testemunhos` (relato em 1ª pessoa). Capa pp. 1–3 com encoding corrompido, descartada na limpeza.
- **Sergipe** "Paulo Barbosa de Araújo" (2020, 428 p.) → `cev-se-relatorio-final` — 754 chunks, 7 partes (I–VII) + Introdução.
- **Triângulo Mineiro e Alto Paranaíba** "Ismene Mendes" / Caso Ismene Mendes (UFU/EDUFU, 2016, 136 p.) → `cev-mg-triangulo-mineiro` — 177 chunks, 13 seções. Subcomissão **regional/universitária** ligada à Covemg+UFU — NÃO confundir com a Covemg estadual (`cev-mg-covemg-relatorio-final-2017`).

✅ **2º lote ingerido (jun/2026) — 8 comissões MUNICIPAIS** (extração direta, exceto Osasco;
chunking em `pipeline/03_chunkar_estaduais.py`, indexação no Supabase — ver diário):
- **Juiz de Fora** (MG, 2015) → `cmv-mg-juiz-de-fora` — 272 p., texto nativo (~547 mil chars).
- **João Pessoa** (PB, 2020) → `cmv-pb-joao-pessoa` — 345 p., texto nativo (~929 mil chars).
- **Niterói** (RJ, 2015, relatório *preliminar*) → `cmv-rj-niteroi` — 145 p., texto nativo (~214 mil chars).
- **Petrópolis** (RJ, 2018) → `cmv-rj-petropolis` — 402 p., texto nativo (~858 mil chars).
- **Volta Redonda** (RJ, 2015) → `cmv-rj-volta-redonda` — 589 p., texto nativo (~953 mil chars).
- **Mauá** (SP, 2014) → `cmv-sp-maua` — 72 p., texto nativo (~160 mil chars).
- **Osasco** (SP, 2014, dossiê) → `cmv-sp-osasco` — 117 p., **PDF escaneado → OCR** (Tesseract `por`,
  300 DPI, `pipeline/02d_ocr_osasco.py`; ~190 mil chars, 2 págs. em branco). Único do lote que exigiu OCR.
- **São Paulo "Vladimir Herzog"** (SP, 2016) → `cmv-sp-sao-paulo` — 396 p., texto nativo (~824 mil chars).

**Lotes futuros do catálogo DHnet** (ainda NÃO ingeridos; arquivos em `/verdade/cv/`):
- *Universitárias (8):* UFBA (`cuv_ba_ufba_r_2014`), UnB (`cuv_df_unb_r_2015`), UFES (`cuv_es_ufes_r_2016`), UFOP (`cuv_mg_ufop_2017`), UFCG (`cuv_pb_ufcg_r_parcial_2015`), Unicamp (`cuv_sp_unicamp_r_2015`), UNIFESP (`cuv_sp_unifesp_r_2015`), UFRN (`cuv_ufrn_r_final_2015`).
- *Temáticas/setoriais (9):* Comissão Camponesa (`cv_camponesa_r_2016`), bancários DF (`cv_df_bancarios_r_2015`), jornalistas FENAJ (`cv_df_fenaj_jornalistas_anexo_1`), UNE (`cv_df_une_r_2015`), jornalistas MG (`cv_mg_jornalistas_r_2013`), jornalistas SC (`cv_sc_jornalistas_r_2014`), CUT-SP (`cv_sp_cut_r_2015`), jornalistas SP (`cv_sp_jornalistas_r_2017`), ANDES (`cv_universidades_andes_2020`).
- *Já no acervo por outras vias (duplicatas no DHnet, ignorar):* CNV, CEV-SP Rubens Paiva, CEV-RJ, CEV-MG/Covemg, estaduais AM, ES, PB, PE, PR, RS, SC.

**Backlog de qualidade do 1º lote** (apontado pela curadoria, não bloqueante — tratar em ciclo
futuro): (a) reclassificar chunks de sumário/índice e o poema de abertura do Triângulo como
`tipo_chunk` não-`corpo` (ex.: `paratexto`/`indice`) — hoje todos entram como `corpo`; (b) extrair
metadado `depoente` por chunk no vol. 2 da Bahia (hoje o nome do depoente fica só no corpo do texto);
(c) duplicação de capa em chunks 0–1 do Triângulo; (d) typo de OCR "1288"→"128" em chunk do Amapá.

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
