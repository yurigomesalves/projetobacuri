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

**Comissão da Verdade em Minas Gerais (Covemg)**, comissão ESTADUAL ligada ao governo de Minas Gerais (não confundir com a comissão municipal de Belo Horizonte). Repositório DSpace acessível sem bloqueio de bots: `http://www.comissaodaverdade.mg.gov.br/` — REST API funcional em `/rest/items/`.

✅ Ingerido (jun/2026): **Relatório Final 2017** (1781 p., ~67 MB), PDF com camada de texto, baixado do repositório DSpace institucional `comissaodaverdade.mg.gov.br/bitstream/handle/123456789/2736/` — 1781 páginas extraídas em `pipeline/dados/extraido/cev-mg-covemg-relatorio-final-2017.jsonl` (3 páginas vazias, ~4,27 milhões de caracteres). Hash SHA-256 verificado contra valor previamente conhecido. **Anexo — Relatório Técnico de Recomendações do Centro de Estudos sobre Justiça de Transição da UFMG** (5 p., ~271 KB), PDF com camada de texto, baixado de `comissaodaverdade.mg.gov.br/bitstream/handle/123456789/2743/` — extraído em `pipeline/dados/extraido/cev-mg-covemg-anexo-justica-transicao-ufmg.jsonl` (0 páginas vazias, ~14,3 mil caracteres). Hash e proveniência de ambos em `pipeline/manifesto.json`.

📋 **Catalogação completa do DSpace (jun/2026)**: Varredura via REST API identificou 97 documentos no repositório (72 com PDF, ~595 MB total). Após exclusão de 11 capítulos já contidos no Relatório Final (handles 374, 375, 377, 410, 413, 418, 421, 424, 435, 438, 509) e 25 sem PDF, 2 com PDF possivelmente trocado no DSpace (handles 471, 472 — aguardam conferência manual), **59 novos documentos** foram catalogados em `pipeline/fontes.json` e aguardam ingestão (Fase 3: download + extração). Categorias: 34 relatórios/análises Covemg, 12 testemunhos, 11 documentos da repressão (DOPS/STM/STF/BNM), 2 imprensa histórica. Arquivos de suporte: `pipeline/dados/descoberta-covemg.md`, `pipeline/dados/fontes-covemg-pulados.md`, `pipeline/dados/correcoes-curador-covemg.md`, `pipeline/gerar_fontes_covemg.py`.
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

✅ **3º lote ingerido (jun/2026) — 8 comissões UNIVERSITÁRIAS** (todos PDF com camada de texto,
extração direta; nenhum exigiu OCR; chunkados em `pipeline/03_chunkar_estaduais.py`, **2.592 chunks
indexados no Supabase** e auditados pela curadoria; notas editoriais aplicadas via
`pipeline/aplicar_notas_universitarias.py`; UNIFESP marcada `subtipo=informe`):
- **UFBA** "Milton Santos" (BA, 2014) → `cuv-ba-ufba` — 174 p., texto nativo (~465 mil chars, 7 págs. vazias).
- **UnB** "Anísio Teixeira" (DF, 2015) → `cuv-df-unb` — 363 p., texto nativo (~1,017 milhão de chars, 0 págs. vazias). Maior do lote.
- **UFES** CVUfes (ES, 2016) → `cuv-es-ufes` — 190 p., texto nativo (~440 mil chars, 5 págs. vazias).
- **UFOP** GT UFOP / Covemg (MG, 2017) → `cuv-mg-ufop` — 258 p., texto nativo (~672 mil chars, 1 pág. vazia). Subcomissão universitária vinculada à Covemg.
- **UFCG** (PB, 2015, relatório **parcial**) → `cuv-pb-ufcg` — 30 p., texto nativo (~58 mil chars, 0 págs. vazias). Documento mais curto do lote; usar com ressalva de parcialidade.
- **Unicamp** "Octávio Ianni" (SP, 2015) → `cuv-sp-unicamp` — 61 p., texto nativo (~107 mil chars, 0 págs. vazias).
- **UNIFESP** "Marcos Lindenberg" (SP, 2015) → `cuv-sp-unifesp` — 84 p., texto nativo (~206 mil chars, 0 págs. vazias).
- **UFRN** (RN, 2015) → `cuv-rn-ufrn` — 491 p., texto nativo (~828 mil chars, 10 págs. vazias). Segundo maior do lote.

✅ **4º lote ingerido (jun/2026) — 9 comissões TEMÁTICAS/SETORIAIS** (todas PDF com camada de
texto, extração direta; nenhuma exigiu OCR; chunkadas em `pipeline/03_chunkar_estaduais.py`,
**1.937 chunks indexados no Supabase**; notas editoriais, subtipos e títulos de seção conferidos
contra os sumários e aplicados via `pipeline/aplicar_notas_tematicas.py`). Prefixo de slug `ctv-`
(comissão temática da verdade):
- **Comissão Camponesa da Verdade** (nacional, Senado/CDHLP + DEX-UnB, org. Sérgio Sauer, 1946–1988) → `ctv-camponesa` — 638 p. (maior do lote, 986 chunks). Núcleo: violações no campo (Parte III).
- **UNE** "Comissão Nacional da Verdade da UNE" (nacional, estudantes, 2015) → `ctv-une` — 136 p., 219 chunks.
- **Jornalistas/MG** (SJPMG, 2013/2014) → `ctv-mg-jornalistas` — 148 p., 313 chunks. Setorial; majoritariamente depoimentos.
- **CUT** "Comissão Nacional da Memória, Verdade e Justiça da CUT" (NACIONAL, sede SP, 2015) → `ctv-sp-cut` — 130 p., 155 chunks.
- **Jornalistas/SP** (Sindicato dos Jornalistas de SP, 2017) → `ctv-sp-jornalistas` — 92 p., 120 chunks.
- **ANDES-SN** "A ditadura empresarial-militar nas universidades públicas" (NACIONAL, docentes, 2020) → `ctv-andes` — 44 p., 89 chunks.
- **Bancários/DF** (2013–2015) → `ctv-df-bancarios` — 23 p., 22 chunks; `subtipo=relatorio_simplificado` (é a versão simplificada).
- **FENAJ** (jornalistas) → `ctv-fenaj-jornalistas` — 9 p., 13 chunks; `subtipo=anexo_parcial`: é APENAS o Anexo I do relatório da Comissão de Anistia/MJ à CNV dos Jornalistas, NÃO o relatório integral da FENAJ.
- **Jornalistas/SC** (2014) → `ctv-sc-jornalistas` — 11 p., 20 chunks; texto corrido sem subdivisões (`secao=None`).

**Catálogo DHnet — concluído:** os 4 lotes (estaduais/regional, municipais, universitárias e
temáticas/setoriais) foram ingeridos. Restam no catálogo apenas as duplicatas abaixo, que já estão
no acervo por outras vias:
- *Já no acervo por outras vias (duplicatas no DHnet, ignorar):* CNV, CEV-SP Rubens Paiva, CEV-RJ, CEV-MG/Covemg, estaduais AM, ES, PB, PE, PR, RS, SC.

✅ **5º lote ingerido (jun/2026) — REGIÃO NORTE: Pará** (PDF com camada de texto, extração direta;
nenhum exigiu OCR; chunkados em `pipeline/03_chunkar_estaduais.py`, **1.904 chunks indexados no
Supabase**; via de download: armazemmemoria.com.br, redistribuição pública do original ALEPA-PA):
- **CEV-PA** "Paulo Fonteles Filho" — Tomo I (Antecedentes históricos + Contextualização política paraense + Amazônia Paraense no Relatório Final da CNV; 562 p., mar/2023) → `cev-pa-relatorio-vol1` — **748 chunks**, 3 capítulos.
- **CEV-PA** — Tomo II (Imprensa + UFPA + Camponeses + Guerra dos Perdidos + Povo Aikewara; 434 p.) → `cev-pa-relatorio-vol2` — **532 chunks**, 5 capítulos. Capítulo 8 inclui os depoimentos do povo indígena Suruí-Aikewara sobre a Guerrilha do Araguaia (foco: impacto sobre povos indígenas, perspectiva diferente da CNV).
- **CEV-PA** — Tomo III (Ditadura e Gênero + Justiça de Transição + Recomendações; 482 p.) → `cev-pa-relatorio-vol3` — **624 chunks**, 3 capítulos. O Capítulo 9 (Ditadura e Gênero) inclui rodas de conversa e depoimentos de mulheres que vivenciaram a repressão no Pará — perspectiva regional feminista ainda ausente no acervo.

**Cobertura do Centro-Oeste e Norte — estado atual (jun/2026):**
A pesquisa de lotes 1–5 mapeou o seguinte sobre as UFs com lacunas identificadas:
- **DF**: já coberto por 4 documentos ingeridos (UnB, Bancários, UNE, FENAJ-anexo).
- **AM** e **AP**: já cobertos (Waimiri-Atroari e Chaguinha).
- **PA**: ingerido neste lote (CEV-PA, 3 tomos).
- **GO, MT, MS, AC, RO, RR, TO**: nenhum relatório de comissão da verdade estadual publicado online foi localizado em jun/2026. As portais das Assembleias Legislativas e secretarias de direitos humanos foram consultados (Memórias Reveladas, DHnet, armazemmemoria.com.br) sem resultado. A única via para essas UFs é contato direto com secretarias estaduais — ação humana externa ao pipeline automático. Registrar como lacuna documental permanente até nova evidência.

**Backlog de qualidade do 1º lote** (apontado pela curadoria, não bloqueante — tratar em ciclo
futuro): (a) reclassificar chunks de sumário/índice e o poema de abertura do Triângulo como
`tipo_chunk` não-`corpo` (ex.: `paratexto`/`indice`) — hoje todos entram como `corpo`; (b) extrair
metadado `depoente` por chunk no vol. 2 da Bahia (hoje o nome do depoente fica só no corpo do texto);
(c) duplicação de capa em chunks 0–1 do Triângulo; (d) typo de OCR "1288"→"128" em chunk do Amapá.

**Backlog de qualidade do 3º lote** (universitárias; curadoria, não bloqueante — nenhuma fonte
removida): (a) paratexto marcado como `corpo` nos 8 documentos (capas, fichas técnicas, listas de
membros, sumários) — reclassificar como `paratexto`/`indice`; casos mais ruidosos: glossário de
siglas do `cuv-df-unb` (vários chunks só de abreviaturas) e currículos dos coordenadores do
`cuv-mg-ufop`; (b) duplicação de conteúdo na junção de chunks: lista de membros repetida em
`cuv-es-ufes` (chunks 0–1) e cabeçalho de subseção repetido em `cuv-pb-ufcg` (chunks 2–3);
(c) chunk atômico sem sentido isolado em `cuv-pb-ufcg` (chunk 4, uma frase) — avaliar fusão;
(d) `secao` herdada errada em `cuv-rn-ufrn` (chunk 2 com sumário rotulado "Agradecimentos") —
deveria ser nulo/"Sumário"; (e) vazamento de nota de rodapé para o início do chunk seguinte em
`cuv-ba-ufba` e `cuv-sp-unicamp` (no Unicamp separa o nome do prof. Vargaftig de seu contexto);
(f) **LGPD** — capa do `cuv-ba-ufba` (chunk 0) reproduz e-mails pessoais de membros da comissão
(do PDF público de 2014); avaliar anonimizar/filtrar do índice vetorial ao reprocessar; (g) avaliar
sistematicamente a dimensão de gênero (perseguição a mulheres) nas notas, ainda não coberta no lote.

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
