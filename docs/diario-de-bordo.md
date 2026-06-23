# Diário de Bordo — Projeto Bacuri

Registro cronológico do desenvolvimento, para transparência do processo e
matéria-prima da dissertação.

## 2026-06-11 — Fase 0: Fundação

**O que foi feito:**
- Criado o app Next.js na raiz do projeto (App Router, TypeScript, Tailwind),
  com página inicial provisória "Memória e Verdade — em construção", em
  português e tom sóbrio (`app/page.tsx`, `app/layout.tsx` com `lang="pt-BR"`).
- `.gitignore` configurado: `node_modules`, `.env*` (exceto `.env.example`),
  `pipeline/dados/`, caches Python e arquivos temporários.
- `.env.example` criado documentando, em português, as variáveis futuras:
  Supabase (URL, chave anon, chave service_role), `LLM_PROVIDER`,
  `GROQ_API_KEY` e `OPENROUTER_API_KEY`.
- Adicionados `LICENSE` (AGPL-3.0, texto oficial da FSF) e `README.md` em
  português com os princípios do projeto.
- Primeiro commit no branch `main`; identidade do git configurada localmente.
- Repositório público criado no GitHub:
  https://github.com/yurigomesalves/memoria-e-verdade
  (via GitHub CLI `gh`, autenticado por navegador).
- Projeto importado na Vercel (plano Hobby) com deploy automático a partir
  do `main`. Site no ar e verificado pelo Yuri.

**Decisões técnicas:**
- Repositório público desde o início, coerente com o princípio de
  transparência e com a licença AGPL-3.0.
- O scaffold do Next.js foi gerado em pasta temporária e movido para a raiz,
  pois o `create-next-app` não roda em pasta com arquivos existentes.
- O kit de instalação (`kit-memoria-e-verdade.zip`) ficou fora do
  versionamento — seu conteúdo já está extraído em `docs/` e `CLAUDE.md`.

**Próximos passos (Fase 1 — Acervo piloto):**
- Criar o projeto no Supabase (free tier) e habilitar pgvector.
- Iniciar o pipeline: download do Relatório da CNV vol. I, extração de
  texto, chunking, embeddings e indexação.

## 2026-06-11 — Fase 1: Acervo piloto (CNV vol. I)

**O que foi feito:**
- Banco no Supabase (projeto `bacuri`, já criado na Fase 0): migrações
  `0001_acervo.sql` (pgvector; tabelas `fontes` e `chunks` com vocabulários
  da taxonomia; função `buscar_chunks` para busca semântica via RPC; RLS com
  leitura pública) e `0002_tipo_chunk.sql` (ver ADR-005).
- Pipeline em `pipeline/` (Python, venv local): `01_baixar.py` (download +
  proveniência em `manifesto.json` com sha256), `02_extrair.py` (PyMuPDF,
  976 páginas), `03_chunkar.py` (limpeza de cabeçalhos/hifenização, chunks
  de ~400 tokens com seção e páginas, classificação corpo/nota_rodape),
  `04_indexar.py` (embeddings multilingual-e5-small, 384d, idempotente) e
  `05_buscar.py` (teste de busca).
- Acervo indexado: 1 fonte (Relatório CNV vol. I), 2.032 chunks
  (1.846 corpo, 186 notas de rodapé).
- Auditoria curatorial em `docs/auditorias/2026-06-11-cnv-vol1.md`:
  APROVADO COM RESSALVAS; a ressalva bloqueante (notas de rodapé sem
  sinalização) foi tratada e retestada no mesmo dia.
- Buscas de teste com perguntas de sala de aula retornando trechos
  pertinentes com página e seção (ex.: definição de desaparecimento forçado,
  similaridade 0,90, p. 295 e 576).

**Decisões (ver docs/decisoes.md):**
- ADR-005 — notas de rodapé sinalizadas (`tipo_chunk`), tratadas na Fase 1.
- ADR-006 — proveniência via Internet Archive aceita (portal oficial bloqueia
  download automatizado), com confronto manual futuro possível.

**Incidentes de processo (transparência):**
- Um subagente relatou ter escrito dois scripts que não existiam no disco;
  a sessão principal os escreveu e a verificação de entrega passou a ser
  exigida nos prompts dos agentes.

**Próximos passos (Fase 2 — Análise/Contrato):**
- Fechar `docs/contrato-api.md` com arquiteto-backend e designer-frontend
  (em Plan Mode), incluindo a sinalização de `tipo_chunk` nas citações.

## 2026-06-11 — Fase 2: Análise/Contrato (contrato de API fechado)

**O que foi feito:**
- `docs/contrato-api.md` fechado como v1.0, a partir do rascunho v0.1,
  retomando o processo interrompido após a Fase 1.
- `Citacao` alinhada ao retorno real de `buscar_chunks` (migrações 0001/0002):
  ganhou `confiabilidade`, `secao` e `tipo_chunk` ("corpo" | "nota_rodape"),
  cumprindo o ADR-005.
- Tipo `Marcador` (marcador + fonte) em biografias e eventos, cumprindo o
  ADR-001 (marcador sempre com fonte, nunca por inferência).
- `eventos-geo` passou a aceitar geometria Point ou Polygon/MultiPolygon,
  com camada própria para violência contra povos indígenas (ADR-003).
- Documentado o fluxo interno do RAG no POST /api/chat: embedding da consulta
  na Edge Function (mesmo modelo da indexação), RPC `buscar_chunks`
  (limiar 0,78, até 8 trechos), LLM trocável via `LLM_PROVIDER`.
- Nova seção "Obrigações de exibição das citações (frontend)": selo de nota
  de rodapé, exibição de `nota_contexto` e fonte por marcador.

**Decisão de processo:**
- O refinamento foi feito na sessão principal, sem convocar arquiteto-backend
  e designer-frontend: edição pequena de um único documento, conforme a regra
  de economia de tokens do CLAUDE.md. Divergências de contrato serão tratadas
  na Fase 3, se surgirem na implementação.

**Próximos passos (Fase 3 — Execução do chat):**
- arquiteto-backend: Edge Function de embedding da consulta, rota
  POST /api/chat com RAG e citações, rota POST /api/feedback.
- designer-frontend: interface de chat minimalista com citações
  (incluindo selo de nota de rodapé) e formulário de feedback.

## 2026-06-11 — Fase 3: Execução do chat (RAG com citações no ar)

**O que foi feito:**
- Backend (arquiteto-backend): tipos do contrato (`lib/shared/tipos.ts`),
  abstração de provedor de LLM (`lib/server/llm.ts`, com retry em 429/5xx),
  rate limit em memória, rota POST /api/chat (RAG completo: embedding →
  `buscar_chunks` → LLM → citações na ordem dos marcadores [n]) e rota
  POST /api/feedback (fila de curadoria). Migração 0003 (`interacoes` e
  `feedbacks`, RLS sem leitura pública — LGPD) aplicada com aprovação.
- Frontend (designer-frontend): chat virou a página inicial; componentes
  `Chat`, `Citacoes` (selo de nota de rodapé, nota de contexto, trecho em
  `<details>`, âncoras dos marcadores [n]) e `Feedback` (útil/incompleta/
  incorreta + resposta alternativa). Tom sóbrio, acessível, sem rastreadores.
- Testes de ponta a ponta no build de produção: pergunta pertinente →
  8 citações com página e link; pergunta fora do acervo → resposta honesta
  sem citações; feedback gravado (201); validações de entrada (400).

**Decisões e mudanças de contrato (Fase 3):**
- ADR-007: o embedding da consulta passou do Edge Function do Supabase para
  o próprio servidor Next.js — o worker do free tier (256 MB) não comporta
  o modelo multilíngue (~112 MB; erro `WORKER_RESOURCE_LIMIT`/546). Mesmo
  modelo da indexação, com prefixo "query: " (o da indexação é "passage: ").
- Migração 0004: limiar de relevância de 0,78 → 0,82. Medições: pergunta
  fora do tema ("capital da Mongólia") atingia 0,80 de similaridade (o
  modelo e5 comprime as notas para cima); perguntas pertinentes ficam entre
  0,85 e 0,89. Com 0,82, perguntas fora do acervo recebem a resposta honesta.
- Provedor de LLM: decisão do Yuri de usar OpenRouter (não Groq). Modelo
  atual: `google/gemma-4-31b-it:free` (o `llama-3.3-70b-instruct:free`
  estava congestionado no upstream). Troca só por variável de ambiente.

**Incidente corrigido:** a promessa de carregamento do modelo de embeddings
ficava "envenenada" após falha de rede (toda requisição seguinte falhava na
hora); corrigido descartando o cache em caso de erro.

**Pendência:** cadastrar as variáveis de ambiente na Vercel (sem isso o
chat em produção não funciona) e apagar pelo painel do Supabase a Edge
Function `embed-consulta`, obsoleta pelo ADR-007.

**Próximos passos (Fase 4 — Feedback do usuário):** revisão dos textos de
interface pelo curador-historiador e painel/fluxo de curadoria dos feedbacks.

## 2026-06-12 — Fase 4: Feedback do usuário (curadoria e transparência)

**O que foi feito:**
- Contrato v1.1: três endpoints novos — GET /api/curadoria/feedbacks e
  PATCH /api/curadoria/feedbacks/[id] (protegidos por `CURADORIA_SENHA`,
  Bearer com comparação timing-safe) e GET /api/transparencia (público);
  código de erro NAO_AUTORIZADO; tipos FeedbackCuradoria e ItemTransparencia.
- Migração 0005 aplicada (com aprovação): colunas `justificativa_decisao`
  (10–2000 chars) e `decidido_em` em `feedbacks`.
- Backend (arquiteto-backend): rotas acima + `lib/server/curadoria-auth.ts`.
- Frontend (designer-frontend): página interna `/curadoria` (senha só em
  memória, abas por status, decisão com justificativa obrigatória, noindex)
  e página pública `/transparencia` (decisões publicadas com justificativa —
  princípio 1); link no rodapé.
- Revisão editorial (curador-historiador, `docs/revisao-editorial-fase4.md`):
  nota de transparência definitiva aplicada em /transparencia; correção
  bloqueante na pergunta de exemplo do chat sobre Marighella, que invertia
  vítima e perpetrador; "feedbacks" → "avaliações" na área de curadoria.

**Decisões do Yuri:** painel próprio `/curadoria` com senha (em vez de editar
o banco à mão) e página pública de transparência já nesta fase, gravando a
justificativa de toda decisão — aceite ou recusa — para publicação.

**Testes de ponta a ponta (build de produção):** 401 sem/with senha errada;
listagem de pendentes com a interação embutida; justificativa curta → 400;
decisão válida → 200; redecisão → 409 ("feedback já decidido"); item decidido
publicado em /api/transparencia; páginas /curadoria e /transparencia → 200.
O feedback de teste da Fase 3 foi recusado com justificativa registrando que
era registro interno de teste — primeira decisão pública de curadoria.

**Pendências (ação manual do Yuri):** cadastrar `CURADORIA_SENHA` na Vercel
(junto com as demais variáveis pendentes da Fase 3) e apagar a Edge Function
obsoleta `embed-consulta` no painel do Supabase.

**Próximos passos (Fase 5 — Acervo completo):** ingestão das demais fontes
prioritárias (engenheiro → cientista → curador).

## 2026-06-12 — Fase 5: Acervo completo (CNV vols. II e III)

**Escopo decidido pelo Yuri:** completar o Relatório Final da CNV (vols. II
e III), deixando CEMDP, comissões estaduais e demais fontes para depois.

**O que foi feito:**
- Pipeline generalizado para múltiplas fontes: novo catálogo
  `pipeline/fontes.json` (URLs, proveniência e metadados por slug); scripts
  01–04 agora recebem o slug como argumento. Regressão do vol. I verificada
  (chunks byte a byte idênticos, sha256 igual).
- Vols. II (416 págs.) e III (1.996 págs.) baixados via Wayback Machine
  (portal oficial bloqueia robôs), com hash e proveniência no manifesto.
- Chunking por volume (cientista-de-dados): vol. II com seções dos 9 textos
  temáticos; vol. III com seção "Perfil – Nome" para cada um dos 434 perfis
  de mortos e desaparecidos, mapeados pelo índice cronológico — base da
  Fase 6 (biografias e mapa).
- Auditoria curatorial (curador-historiador, `docs/auditorias/
  fase5-cnv-vols-2-3.md`): REPROVOU a 1ª versão do vol. III por erro
  bloqueante de atribuição de nome (errata de paginação corrigida para a
  página errada). Correção: verificação automática dos 434 perfis
  (433 confirmados; 1 variante ortográfica decidida pelo curador —
  "Goldenberg", grafia do corpo do relatório). Reauditoria: APROVADO.
- Ressalva editorial do vol. II aplicada: `autor_orgao` registra que os
  textos temáticos são de autoria individual de conselheiros, não posição
  colegiada da CNV (refletirá nas citações).
- Correção técnica no 04_indexar.py: leitura do JSONL quebrava em
  separadores Unicode (U+2028) presentes no texto do vol. III.
- Indexação no Supabase (autorizada pelo Yuri): vol. II = 997 chunks,
  vol. III = 4.232 chunks (acervo total: 3 fontes, 7.261 chunks). Busca
  validada nos três volumes, incluindo o perfil que motivou a reprovação.

**Pendências:** decidir na Fase 6 se a grafia de outros nomes segue índice ou
corpo em casos novos; demais fontes prioritárias (CEMDP, estaduais, BNM…)
ficam para uma futura rodada de ingestão com este mesmo pipeline.

**Próximos passos (Fase 6 — Biografias e mapa):** curador (conteúdo) →
backend → frontend, partindo das seções "Perfil – Nome" do vol. III.

## Fase 6 — Biografias e mapa (12/06/2026)

- Contrato atualizado para v1.2 antes do código: `justica` opcional (só servido
  com `revisado_por_humano = true`, Fase 7), biografias só `publicada`, bbox
  filtrado no servidor (sem PostGIS — geometria GeoJSON em jsonb, acervo de
  dezenas de eventos).
- Migração 0006 (autorizada pelo Yuri): `biografias`, `eventos_geo` e tabelas
  de ligação que amarram cada citação e marcador à tabela `fontes`
  (princípio 3 / ADR-001 — nada de citação solta).
- Curadoria (curador-historiador): 9 biografias e 6 eventos, ~30 citações
  copiadas verbatim do texto extraído da CNV (vols. I–III), em
  `pipeline/dados/curadoria/`. Não sustentados nesta rodada: Edson Luís
  (pouca base no texto lido) e Guerrilha do Araguaia como evento com polígono
  (falta especificidade geográfica) — ficam para rodada futura.
- Decisões do Yuri (ADR-008): novo `tipo_crime` `atentado_a_populacao_civil`
  (Riocentro estava classificado como "tortura", incorreto; migração 0007) e
  marcadores 6.2 mantidos restritos à interseccionalidade (marcadores de
  profissão removidos).
- Seed idempotente: `pipeline/06_semear_curadoria.py` valida contra a
  taxonomia antes de gravar.
- Backend (arquiteto-backend): 4 rotas novas (`/api/biografias`,
  `/api/biografias/[slug]`, `/api/eventos-geo`, `/api/eventos-geo/[id]`) +
  `lib/server/citacoes.ts`; smoke test ok (busca, citações com página e link,
  camada indígena em Polygon, bbox, 404).
- Frontend (designer-frontend): `/biografias` (busca, filtro, paginação),
  `/biografias/[slug]` (markdown, marcadores com fonte, citações),
  `/mapa` (Leaflet + OSM, camada "Violência contra povos indígenas"
  ligável/desligável — ADR-003, painel de detalhe com fontes) e cabeçalho de
  navegação. Revisão editorial dos textos públicos pelo curador ao final:
  rótulos de tipo_crime corrigidos/completados conforme a taxonomia (incluindo
  o novo `atentado_a_populacao_civil`), rótulo "fantasma" removido, e nota
  fixa de precisão geográfica adicionada ao mapa (geometrias aproximadas; os
  polígonos não correspondem a limites oficiais de terras indígenas — a
  proveniência por evento está em `nota_geometria` nos JSONs curados; exibir
  a nota por evento exigiria mudança de contrato e fica como opção futura).

**Pendências:** Edson Luís e Araguaia (curadoria futura); bloco
crimes-e-justiça (Fase 7); testes automatizados das rotas novas.

## 12/06/2026 — Fase 7 redefinida: módulo jurídico adiado, manifesto criado
- Decisão do Yuri (ADR-009): o módulo "crimes e justiça" foi adiado para
  amadurecer a ideia. A infraestrutura (migração 0006, rota com salvaguarda
  `revisado_por_humano`) permanece dormente; contrato ajustado.
- Curadoria (curador-historiador): rascunho do manifesto público em
  `docs/manifesto-projeto-bacuri.md` — por que o projeto existe, o nome
  (hipótese: homenagem a Eduardo Collen Leite, "Bacuri"; AGUARDA CONFIRMAÇÃO
  do Yuri), os 7 princípios e o convite à colaboração.
- Sessão principal: página estática `/manifesto` (lê o markdown de docs/ no
  build — texto público só muda passando pelo repositório) e link minimalista
  "manifesto projeto_bacuri" no cabeçalho.
- Build de produção ok; página verificada com `next start`.
- Revisão do Yuri (12/06/2026): nome confirmado como homenagem a Eduardo
  Collen Leite ("Bacuri") e texto aprovado para publicação. Data do
  assassinato fixada em 8 de dezembro de 1970, conferida no texto extraído da
  CNV (vol. I). Comentários de rascunho removidos; manifesto publicado.
- **Pendências:** futuro do módulo crimes e justiça em aberto; Edson Luís e
  Araguaia (curadoria futura); testes automatizados das rotas.

## Fase 8 — Testes automatizados das rotas (12/06/2026)

- Vitest instalado (devDependency; FOSS, MIT). Scripts novos: `npm test` e
  `npm run test:watch`. Suíte: 69 testes em 9 arquivos, ~1s, 100% offline —
  Supabase, embeddings e LLM substituídos por dublês em `tests/apoio/`
  (cliente falso encadeável + fixtures sóbrias baseadas na CNV).
- Cobertura: as 9 rotas de API (chat, feedback, transparência, biografias,
  eventos-geo, curadoria) + unitários de `citacoes`, `limite` e
  `curadoria-auth`. Casos-chave: princípio 3 (sem base documental → resposta
  padrão SEM chamar o LLM; citações sempre com página e link), salvaguarda do
  bloco `justica` (ADR-009), rate limit 20/min, autenticação Bearer da
  curadoria (401 sempre que CURADORIA_SENHA ausente), escape de ILIKE,
  filtros bbox/tipo_crime, erros 400/404/409/429/500 sem vazar detalhes.
- Verificação por mutação: adulterar o limite de requisições fez o teste
  falhar na hora (a vistoria pega regressão); mudança revertida.
- CI: `.github/workflows/testes.yml` roda lint + testes a cada push/PR, sem
  segredos. Lint zerado: `pipeline/` ignorado pelo ESLint (varria o .venv do
  Python), supressão documentada de `react-hooks/set-state-in-effect` em
  /curadoria e limpeza de 2 avisos antigos no mapa.
- `npm run build` ok após tudo.

**Pendências:** futuro do módulo crimes e justiça em aberto; Edson Luís e
Araguaia (curadoria futura); testes de componentes React e E2E (fase futura,
se necessário).

## 12/06/2026 — Identidade visual: paleta creme/verde e ajustes de texto
- Redesenho visual aplicado a todas as páginas: paleta própria definida em
  `globals.css` (off-white quente "creme" + verde-escuro profundo, tom sóbrio
  e editorial), fonte serifada (Source Serif 4) no nome do projeto (cabeçalho
  e h1 da home), cabeçalho com nome à esquerda e links à direita, modo escuro
  em verde-quase-preto.
- Sessão anterior havia ficado sem fechar: a página /manifesto tinha ficado
  fora do redesenho — títulos ajustados para o mesmo padrão (verde-950).
- Texto público da home corrigido: o acervo inclui os volumes I, II e III do
  Relatório da CNV (estava desatualizado desde a Fase 5).
- Rodapé da home ganhou link discreto para /curadoria (acesso restrito).
- Validação: lint zerado, 69 testes passando, build de produção ok.

## 13/06/2026 — Curadoria: Edson Luís de Lima Souto publicado
- Curador-historiador pesquisou as duas pendências do lote inicial de
  curadoria. "Edson Luís / Calabouço" era um falso positivo (as 2 ocorrências
  do vol. I eram de outra pessoa, Edson Luís de Almeida Teles). A pessoa
  correta, Edson Luís de Lima Souto, tem biografia completa no vol. III, pp.
  224-228: criado `pipeline/dados/curadoria/biografias/edson-luis-de-lima-souto.json`
  (8 citações verificadas, marcadores `classe_trabalhadora` e `estudante`).
- Guerrilha do Araguaia (evento dedicado, polígono): segue sem especificidade
  geográfica/operacional suficiente — não criado, nenhuma coordenada inventada.
- ADR-010: marcador `estudante` exigiu ampliar o vocabulário de
  `biografia_marcadores`/`evento_marcadores` (migração 0008, aplicada ao
  Supabase) para os termos de "papel social" da seção 6.2 da taxonomia.
  Aproveitada a rodada para corrigir 3 marcadores antigos do lote inicial que
  estavam fora de qualquer vocabulário e bloqueavam `06_semear_curadoria.py`.
- Seed rodado com sucesso (15 biografias, 11 eventos). Edson Luís revisado e
  aprovado pelo Yuri — status alterado para "publicada" no arquivo e no banco.

**Pendências:** Guerrilha do Araguaia (evento dedicado, busca futura por
"Operação Marajoara"/"Bico do Papagaio" no vol. III); módulo crimes e justiça
(ADR-009, em aberto).

## 13/06/2026 — Fase 5: acervo ampliado com o relatório da CEMDP (2007)
- Nova fonte ingerida: "Direito à Memória e à Verdade" (CEMDP, 2007, 502 págs.,
  texto nativo, sem OCR). Cópia oficial não encontrada em gov.br; usada cópia
  da DHnet (ONG de Rede de Direitos Humanos), aprovada pelo Yuri — registrado
  como ADR-011 em `docs/decisoes.md`.
- Engenheiro-de-dados: baixou e extraiu o texto (`pipeline/dados/extraido/
  cemdp-direito-memoria-verdade.jsonl`), registrou proveniência em
  `pipeline/manifesto.json`/`fontes.json`, generalizou `01_baixar.py`.
- Cientista-de-dados: criou `pipeline/03_chunkar_cemdp.py` adaptando a
  estratégia da CNV (393 perfis de vítima detectados, capítulos, glossário e
  anexos); 1.400 chunks (mediana 373 tokens) indexados no Supabase (fonte id
  `067ba85a-8b58-4089-9c9d-2da4d100adfd`, `relatorio_oficial`/`alta`).
  Avaliação de recuperação com boa similaridade (0.87–0.92).
- Curador-historiador: auditou amostra de 24 chunks — aprovado para produção,
  com 2 ressalvas menores (subseções de "As Organizações de Esquerda" e erro
  de OCR "RevoLúcionária" no glossário, ambos não bloqueantes).

**Pendências:** corrigir as 2 ressalvas menores do CEMDP se houver
reprocessamento futuro; Guerrilha do Araguaia; módulo crimes e justiça
(ADR-009, em aberto); melhorias de design de interface (próxima frente
discutida, ainda não iniciada).

## 13/06/2026 — Melhorias de design (cabeçalho e home)
- Cabeçalho: link da página atual passa a ficar destacado (sublinhado),
  ajudando o visitante a se orientar; rótulo "manifesto projeto_bacuri"
  padronizado para "Manifesto Projeto Bacuri", consistente com os demais
  links do menu.
- Home: cabeçalho de boas-vindas reduzido no mobile (título menor, texto de
  proveniência do projeto escondido em telas pequenas) para que o campo de
  pergunta do chat apareça sem precisar rolar a tela.
- Validado com screenshots (desktop e mobile via Playwright), lint e build
  de produção.

## 14/06/2026 — Bugfix: chat fora do ar em produção (Vercel)
- Yuri reportou que toda pergunta ao chat em memoria-e-verdade.vercel.app
  retornava "Não foi possível conectar ao servidor".
- Causa raiz, encontrada nos runtime logs da Vercel: `/api/chat` falhava ao
  carregar o binário nativo `libonnxruntime.so.1`, usado pelo Transformers.js
  para gerar o embedding da pergunta (ADR-007). O rastreador de arquivos da
  Vercel não detectava esse binário como dependência da rota, então ele não
  ia para o pacote da função e o módulo quebrava antes de qualquer try/catch
  do código — gerando uma página de erro 500 em HTML (não JSON), que o
  frontend interpretava como falha de conexão.
- Correção em `next.config.ts`: `outputFileTracingIncludes` força a inclusão
  dos binários do ONNX Runtime para `/api/chat`. Primeira tentativa incluiu
  a pasta `onnxruntime-node/bin` inteira (513MB, com binários CUDA/Windows/
  macOS) e excedeu o limite de 250MB da função, causando um deploy com erro;
  corrigido restringindo a apenas os ~35MB necessários para CPU em Linux x64.
- Validado: deploy `Ready` e `curl` em `/api/chat` retornando 200 com
  resposta e citações da CNV.

**Pendências:** as de antes (CEMDP, Araguaia, módulo crimes e justiça,
demais melhorias de design).

## 14/06/2026 — Fase 5: acervo ampliado com a CEV-SP "Rubens Paiva" (Tomo I)
- Nova fonte ingerida: Relatório Final da **Comissão da Verdade do Estado de
  São Paulo "Rubens Paiva" — Tomo I** (Recomendações Gerais e Temáticas,
  março/2015, 1.912 páginas, texto nativo, sem OCR). Decisão de curadoria do
  Yuri: começar pelo Tomo I (o mais denso para o RAG); Tomo II (dossiê de
  mortos e desaparecidos) no site oficial é só uma síntese de 16 páginas —
  fica pendente de busca por versão completa; Tomos III e IV adiados.
- Engenheiro-de-dados: baixou direto do portal oficial da ALESP
  (`comissaodaverdade.al.sp.gov.br`, no ar e sem bloqueio — dispensou Wayback),
  extraiu o texto (`pipeline/dados/extraido/cev-sp-rubens-paiva-tomo1.jsonl`),
  registrou proveniência (hash SHA-256, URL, licença "documento público
  oficial") em `pipeline/manifesto.json`/`fontes.json` (slug
  `cev-sp-rubens-paiva-tomo1`).
- Cientista-de-dados: criou `pipeline/03_chunkar_cev_sp.py` adaptado à
  estrutura do tomo; 2.789 chunks gerados e indexados no Supabase
  (`relatorio_oficial`/`alta`/`pos_1985`). Avaliação de recuperação com boa
  similaridade (0,888–0,891). A indexação foi concluída na sessão principal
  após o limite de sessão ter interrompido o agente no meio da etapa.
- Curador-historiador: auditou amostra de ~25 chunks. **Aprovado para
  produção com ressalvas não-bloqueantes:**
  - [importante] Documento de inteligência em francês (lista de torturadores
    do CODI/DOI-OBAN, ~p.464) com OCR muito degradado — ilegível se recuperado.
  - [importante] Boletins de inteligência SNI/CISA (pp.~719-844) reproduzidos
    na íntegra precisam de `nota_contexto` deixando claro que são fonte
    primária de espionagem reproduzida pela CEV-SP, não posição da comissão.
  - [menor] Sobreposição de blocos entre chunks consecutivos; campo `secao`
    genérico ("Março 2015") pouco informativo.
  - Classificação confirmada conforme `docs/taxonomia.md` — sem alterações.
- Incidente de processo: ao registrar esta auditoria, o curador (sem acesso a
  git/Bash) sobrescreveu este diário com a ferramenta Write e apagou o miolo
  do arquivo. A sessão principal restaurou com `git restore` (HEAD íntegro,
  390 linhas) e reaplicou a entrada como append seguro. Lição: agentes sem
  Bash devem usar Edit/append, nunca Write, em arquivos longos existentes.

**Pendências:** tratar as 2 ressalvas "importantes" da CEV-SP (OCR francês e
`nota_contexto` dos boletins SNI/CISA) num reprocessamento futuro; Tomo II
completo da CEV-SP; Tomos III e IV; as de antes (CEMDP, Araguaia, módulo
crimes e justiça, demais melhorias de design).

## 14/06/2026 — Dívida técnica da CEV-SP quitada (notas de contexto + re-OCR)
Como o roteiro original de 7 fases já estava concluído, esta sessão atacou as 2
ressalvas "importantes" da auditoria da CEV-SP. Decisão do Yuri: fazer as duas
partes, com a nota de contexto em coluna nova (não gambiarra no texto).

- **Parte A — nota de contexto por trecho.** Migração `0009`: nova coluna
  `chunks.nota_contexto` e ajuste da função `buscar_chunks` para preferir a nota
  do trecho, com fallback para a da fonte. Descoberto que o consumo já existia:
  `app/api/chat/route.ts` e `app/componentes/Citacoes.tsx` já leem e exibem a
  nota (caixa âmbar) e a enviam ao LLM. Delimitados via SQL dois blocos de
  reprodução documental de naturezas OPOSTAS, que o curador-historiador
  distinguiu em duas notas (documentadas em `docs/notas-contexto-cev-sp.md`):
  - **Boletins do SNI/CI-SI (repressão), pp. 699–857** — espionagem da Guerra
    Fria reproduzida como prova; nota alerta que não é análise da comissão.
  - **Anexo de denúncia da resistência (pp. 460–501)** — lista francesa "Les
    tortionnaires" (DIAL, 1976) + dossiês clandestinos (caso Herzog etc.);
    nota distingue a autoria (resistência) e avisa do OCR degradado.
- **Parte B — re-OCR do anexo escaneado (pp. 460–501).** O problema era maior
  que a ressalva indicava (~40 páginas escaneadas, não só ~p.464). Engenheiro
  criou `pipeline/02b_reocr_anexo_cev_sp.py` (PyMuPDF 300 DPI + Tesseract
  `por+fra`; `pytesseract`/`Pillow` adicionados ao venv) e corrigiu só essas
  linhas no `.jsonl` extraído (backup em `.jsonl.bak`; 1912 linhas preservadas,
  0 diffs fora do intervalo). Melhora clara no corpo em português e legível no
  francês (nomes de torturadores recuperados, incl. Fleury). Re-chunkado
  (2.789 → 2.739 trechos) e re-indexado no Supabase **com autorização explícita
  do Yuri** (sobrescrita de banco de produção). As 2 notas foram reaplicadas
  após o re-index (544 trechos: 372 SNI + 172 anexo).

- **Pendências menores resolvidas (mesma sessão).** O cabeçalho/logotipo da
  CEV-SP que o re-OCR captava no topo de cada página e o ruído de aspas ("!!")
  foram limpos no chunker `03_chunkar_cev_sp.py` (função `limpar_reocr`,
  RESTRITA às pp. 460-501 para não tocar nas ~1870 páginas nativas). O
  logotipo é OCRado de formas variáveis, então casamos a frase estável do
  subtítulo ("Recomendações Gerais e Recomendações") e toleramos só ruído curto
  no fim das linhas "COMISSÃO DA"/"...Estado de São Paulo" — frases reais, que
  são longas, ficam protegidas. Validado: 0 cabeçalhos residuais e 0 "!!" no
  anexo. Re-chunkado (2.736) e re-indexado com nova autorização do Yuri; notas
  reaplicadas (541 trechos: 372 SNI + 169 anexo).

- **Auditoria de amostra (mesma sessão).** Conferidos trechos dos três tipos:
  lista francesa (legível, nomes recuperados, ex. Fleury), dossiês em português
  (caso Herzog/Shibata) e boletins do SNI — todos com a nota correta e sem
  cabeçalho ruidoso. A auditoria pegou UM erro editorial: o limite superior do
  Bloco 1 (699–857) havia capturado um chunk de transição na p.857 que já era
  texto analítico da comissão (sobre o genocídio de povos indígenas), rotulando-o
  indevidamente como boletim do SNI. Varredura do miolo 699–856 confirmou que o
  anexo é contíguo e homogêneo (0 textos de comissão infiltrados); a borda
  inferior (p.699) também está limpa. Correção: a nota foi REMOVIDA só desse
  chunk. Estado final: 540 trechos com nota (371 SNI + 169 anexo de denúncia).

**Pendências:** Tomo II completo da CEV-SP; Tomos III e IV; CEMDP/Araguaia/
CEV-Rio; módulo crimes e justiça (Fase 7); ampliar biografias e mapa.

## 15/06/2026 — Fase 5: acervo ampliado com a CEV-SP "Rubens Paiva" (Tomos III e IV)
**Escopo decidido pelo Yuri:** ingerir os Tomos III e IV, dando continuidade à
comissão estadual de SP já iniciada (Tomo I). Cadeia da fase, um agente por vez:
engenheiro → cientista → curador.

- **Engenheiro-de-dados:** baixou os dois tomos direto do portal oficial da
  ALESP (`comissaodaverdade.al.sp.gov.br/relatorio/tomo-iii|iv/`, sem Wayback),
  registrou proveniência (SHA-256, URL, licença) em `manifesto.json`/`fontes.json`
  (slugs `cev-sp-rubens-paiva-tomo3` e `-tomo4`). Tomo IV (124 MB, 1.324 págs.)
  tem camada de texto nativa. **Tomo III (184 MB, 12.225 págs.) é totalmente
  escaneado** (audiências) — exigiu OCR. Criado `pipeline/02c_ocr_tomo3_cev_sp.py`
  (Tesseract pt-BR, checkpoint a cada 100 págs., retomável); ~3h30 de OCR.
- **Cientista-de-dados:** chunkers por tomo (`03_chunkar_cev_sp_tomo3.py` e
  `_tomo4.py`). Critério de descarte: ≥60 caracteres alfabéticos e ≥50% de
  texto alfabético. Tomo III = 13.545 chunks (de 7.023/12.225 págs.; 5.121 em
  branco + 81 de baixa qualidade descartadas; `secao=null` — audiências sem
  seção confiável). Tomo IV = 1.412 chunks (de 888/1.324 págs.; 148 vazias +
  288 só rodapé; seções via heurística "ANEXO N" + caixa-alta). Indexados no
  Supabase (Tomo III fonte `c5f751ff…`, Tomo IV `de865a48…`; 384 dim). Busca de
  sanidade ok: depoimentos/tortura recuperaram trechos do III (~0,90, página
  correta) e repressão a trabalhadores rurais recuperou trechos do IV com seção.
- **Curador-historiador** (`docs/auditorias/cev-sp-tomos-3-4.md`): **apto para
  uso, sem bloqueantes.** OCR do III legível e citável; proveniência e tom ok.
  Ressalvas importantes: (1) mapear faixa de página → audiência no III; (2) a
  heurística do IV não captura o autor individual dos 19 anexos; (3) confirmar o
  log das páginas descartadas (não localizado na auditoria).
- Acervo da CEV-SP agora completo do Tomo I ao IV.

**Incidentes de processo:** o cientista-de-dados encerrou um turno ao perceber
que entrava em laço de comandos triviais (parada correta); foi retomado por
mensagem, com o contexto preservado, para indexar o Tomo IV e rodar a sanidade.

**Pendências:** mapeamentos de metadado da CEV-SP (seções por audiência no III,
por anexo/autor no IV) e log das páginas descartadas — melhorias, não
bloqueantes; Tomo II completo da CEV-SP; CEMDP/Araguaia/CEV-Rio; módulo crimes e
justiça (Fase 7); ampliar biografias e mapa.

## 15/06/2026 — Fase 5: CEV-SP Tomo II (versão de síntese) ingerido
**Decisão do Yuri:** ingerir a versão curta do Tomo II disponível no portal
oficial (o dossiê completo segue não localizado em formato digital oficial).

- Por ser documento minúsculo (16 págs.), toda a ingestão foi feita na sessão
  principal, sem convocar engenheiro/cientista (regra de economia de tokens);
  só o curador-historiador foi convocado, para a auditoria.
- Baixado direto do portal da ALESP (`.../tomo-ii/downloads/II_Tomo_Dossie-...
  1964-1985.pdf`, 839 KB, SHA-256 no manifesto; slug `cev-sp-rubens-paiva-tomo2`).
  Texto nativo (sem OCR), 16 páginas. Chunker próprio
  `03_chunkar_cev_sp_tomo2.py` (mesma lógica dos demais): 25 chunks
  (`secao=null` — texto corrido). Indexado no Supabase (fonte `efc10a75…`).
  Busca de sanidade ok (trecho do Tomo II no topo, 0,903, página correta).
- Defeito corrigido durante a sessão: o rodapé do Tomo II usa dois-pontos
  ("Relatório - Tomo II: …"), não hífen como os outros tomos; o regex inicial
  não casava e o rodapé vazou para um chunk. Corrigido, re-chunkado (26→25) e
  re-indexado limpo (0 rodapés residuais).
- Auditoria (curador-historiador, `docs/auditorias/cev-sp-tomo2.md`): **apto.**
  Tom, proveniência e ausência de negacionismo aprovados. O achado "bloqueante"
  de chunks duplicados (23/24) NÃO se confirmou na versão final de 25 chunks
  (verificação direta: 0 conteúdos idênticos) — o agente avaliou a versão antiga.
- `nota_contexto` aplicada aos 25 chunks (autorizada pelo Yuri): deixa explícito
  que é a SÍNTESE, não o dossiê completo, e que não contém a lista nominal das
  vítimas — para o chatbot não dar a entender que possui o dossiê integral.
- Incidente de processo: o curador retornou "API Error: Overloaded" e foi
  reconvocado; a 1ª convocação na verdade concluiu (notificação atrasada),
  tornando a 2ª redundante — encerrada. Lição: conferir se a 1ª terminou antes
  de reconvocar.

**Pendências:** dossiê completo do Tomo II (busca futura); mapeamentos de
metadado dos Tomos III/IV; CEMDP/Araguaia/CEV-Rio; módulo crimes e justiça
(Fase 7); ampliar biografias e mapa.

## 15/06/2026 — Fase 5: dívida técnica de metadados da CEV-SP (Tomos III/IV) quitada
**Decisão do Yuri:** quitar agora os metadados pendentes em vez de ingerir nova
fonte; para o Tomo III, usar heurística CONSERVADORA (não inventar rótulos).

- **Fato técnico que barateou tudo:** o embedding usa só `"passage: " + conteudo`
  (`04_indexar.py` l. 94) — a `secao` NÃO entra no vetor. Logo, foi tudo
  reetiquetagem de `secao` (UPDATE no banco), sem recalcular embeddings nem
  reindexar. Analogia: trocamos as etiquetas das pastas, sem reescrever os papéis.
- **Cientista-de-dados** criou 3 scripts: `07_log_descartes_cev_sp.py` (lista as
  páginas descartadas com motivo) e `08_reetiquetar_secao_tomo{3,4}.py`
  (idempotentes; dry-run por padrão, `--aplicar` grava). JSONL de chunks locais
  reescritos.
- **Tomo IV:** mapa explícito dos 19 anexos (índice págs. 828-829) → `secao` no
  formato `ANEXO <romano> — <descrição> (autor: <nome>)`, com autor onde há
  pessoa (VI, XVI-XIX). Corrigidos 2 defeitos da heurística antiga. 616 chunks
  reetiquetados.
- **Tomo III:** heurística conservadora (linha "instalada a Nª audiência pública"
  + data validada 2012-2015). 72 audiências distintas; 13.241/13.545 chunks
  (97,8%) rotulados, 2,2% `null` (páginas antes da 1ª audiência).
- **Incidente:** o UPDATE do Tomo III (13.241 linhas, uma chamada por linha)
  derrubou a conexão HTTP/2 do free tier após ~10 mil streams
  (`RemoteProtocolError`). Corrigido na sessão principal: o script passou a
  recriar o cliente a cada 1000 UPDATEs e a tentar de novo em caso de queda.
  Como é idempotente, o re-run completou só os 3.256 restantes. Dry-run final: 0
  diferenças nos dois tomos.
- **Curador-historiador** (auditoria em `docs/auditorias/cev-sp-tomos-3-4.md`,
  seção "Fechamento da dívida"): os 3 itens APROVADOS sem bloqueantes. Páginas
  descartadas amostradas = só ruído de diagramação, nada relevante perdido.
- **Incidente de processo:** o curador não tem ferramenta Edit (só Read/Write/
  Grep/Glob) e Write em arquivo existente é vetado; a sessão principal aplicou a
  edição da auditoria a partir do veredito dele.

**Pendências:** Tomo III com 2,2% `secao=null` (polimento futuro); dossiê
completo do Tomo II; falta Araguaia/CEV-Rio e demais prioridades (BNM, imprensa,
documentos dos EUA, acadêmico); módulo crimes e justiça (Fase 7); ampliar
biografias e mapa.

## 15/06/2026 — Fase 5: ingestão da Comissão da Verdade em Minas Gerais (Covemg)
**Decisão do Yuri:** ampliar o acervo com a CEV estadual de Minas Gerais,
ingerindo de uma vez (sem parar a cada etapa) o relatório consolidado mais o
anexo pequeno da UFMG; checar antes se havia mais volumes.

- **Reconhecimento (engenheiro-de-dados):** fonte localizada no repositório
  DSpace oficial do governo de MG (`comissaodaverdade.mg.gov.br`), domínio
  `.mg.gov.br`, download livre, documento público redistribuível. Sondagem do
  índice na sessão principal confirmou que o **Relatório Final 2017 é volume
  único consolidado** (handle 2736, 1781 p.) — o "01. A Comissão…" (handle 199)
  é só agrupamento de capítulos já contidos no consolidado. Achado extra: um
  **anexo à parte** — "Relatório Técnico de Recomendações do Centro de Estudos
  sobre Justiça de Transição da UFMG" (handle 2743, ~271 KB), relevante para o
  futuro módulo crimes e justiça (Fase 7) — incluído na ingestão.
- **Boa notícia de custo:** ambos os PDFs têm camada de texto nativa — **nenhum
  OCR**, ao contrário do calvário do Tomo III da CEV-SP. Extração direta.
- **Engenheiro-de-dados:** baixou os dois, conferiu SHA-256 do consolidado
  contra valor conhecido (íntegro), registrou proveniência em `fontes.json` e
  `manifesto.json` (deixando explícito que é a comissão **estadual**, não a
  municipal de BH). Extração: Relatório Final = 1781 páginas (3 vazias, ~4,27 mi
  caracteres); Anexo UFMG = 5 páginas (~14,3 mil caracteres).
- **Cientista-de-dados:** novo `03_chunkar_cev_mg.py` no mesmo padrão da CEV-SP
  (~395 tokens, sobreposição ~80, sem cruzar fronteira de seção; seções = 13
  capítulos + Apresentação/Prefácio mapeados pelo Sumário, 99,4% preenchidas).
  Resultado: 3071 chunks (Relatório) + 9 (Anexo) = **3080 chunks** indexados no
  Supabase (e5-small, 384 dim). Desta vez o free tier **não caiu** (lotes de
  100, ~14 min). Buscas de sanidade OK: Krenak (p.983, cap.8), massacre de
  Ipatinga (p.845, cap.6), mina de Morro Velho (p.593, cap.6) — proveniência de
  página e seção corretas, e a busca híbrida segue cruzando com CNV/CEV-SP.
- **Curador-historiador** (auditoria em `docs/auditorias/cev-mg.md`): **APTO sem
  bloqueantes**. Fronteiras de capítulo conferem com o Sumário; nenhum chunk
  separa nome de vítima do contexto do crime; conteúdo sobre Ipatinga, Morro
  Velho e povos indígenas (Krenak/Maxakali/Xakriabá) com fontes e granularidade
  adequadas para citação responsável (perspectiva classista/interseccional).

**Pendências (melhorias futuras, não bloqueantes):** rótulo de seção dos anexos
finais do cap.13 da CEV-MG; resíduos de caracteres de controle em páginas de
rosto; `nota_contexto` no anexo UFMG esclarecendo que é texto teórico, não
levantamento de casos mineiros. Continuam pendentes: dossiê completo do Tomo II
da CEV-SP, Araguaia/CEV-Rio e demais prioridades (BNM, imprensa, documentos dos
EUA, acadêmico); módulo crimes e justiça (Fase 7); ampliar biografias e mapa.

## 15/06/2026 — Polimento das ressalvas menores da CEV-MG
**Decisão do Yuri:** quitar as três ressalvas não-bloqueantes da auditoria da
CEV-MG (`docs/auditorias/cev-mg.md`) antes de seguir.

- **Ressalva 2 (caracteres de controle) — RESOLVIDA.** Diagnóstico revelou que o
  problema era maior do que a auditoria registrou: **550 chunks** (não 3), com
  mistura de lixo invisível (soft hyphen `0xAD`, zero-width space, BEL `0x07`) e,
  mais sério, pontuação do Windows-1252 mal decodificada para a faixa de
  controle (`0x91 0x92`→aspas simples, `0x94`→aspa dupla, `0x96`→travessão,
  `0x1d`→aspa dupla de abertura, `0x1e`→travessão). Cada mapeamento foi
  conferido lendo o caractere em contexto (decisão do Yuri: limpar tudo). Limpeza
  aplicada como passo final no `03_chunkar_cev_mg.py` (sobre o texto do chunk já
  fechado, sem mexer em fronteiras nem na contagem) e replicada no Supabase via
  `translate()`+`regexp_replace` idêntico (550 chunks, `update` idempotente).
  Verificado: zero caracteres de controle no banco e no disco.
- **Ressalva 1 (apêndice do cap.13) — RESOLVIDA.** Curador-historiador leu a
  estrutura do capítulo 13 e definiu a fronteira conservadora no marcador
  estrutural "ANEXOS" (página 1578, `ordem` 2538): dali ao fim do capítulo
  (`ordem` 3070, **533 chunks**) o conteúdo é apêndice documental geral (listas
  de depoentes, quadros de cassação, relações de feridos, fichas do DOPS), não
  narrativa sobre o tema do título. `nota_contexto` redigida pelo curador
  aplicada a esses 533 chunks no Supabase e emitida pelo `03_chunkar_cev_mg.py`
  (do primeiro bloco "ANEXO C" em diante) para reprodutibilidade.
- **Ressalva 3 (anexo UFMG) — RESOLVIDA.** `nota_contexto` da fonte (curador)
  esclarecendo que é texto teórico geral sobre justiça de transição, não
  levantamento de casos mineiros — aplicada à fonte no Supabase e registrada em
  `fontes.json`.
- **Pipeline:** `04_indexar.py` passou a carregar `nota_contexto` por chunk
  (cai na nota da fonte via `coalesce` quando ausente). Disco e banco conferidos
  como idênticos em estrutura (3071+9 chunks) e na faixa das notas.

**Pendências:** as três ressalvas da CEV-MG estão quitadas. Continuam pendentes:
dossiê completo do Tomo II da CEV-SP, Araguaia/CEV-Rio e demais prioridades (BNM,
imprensa, documentos dos EUA, acadêmico); módulo crimes e justiça (Fase 7);
ampliar biografias e mapa.

## 16/06/2026 — Fase 6: quatro novas biografias e eventos de MG (Covemg)
**Retomada da fase interrompida.** O curador-historiador havia entregue
`docs/auditorias/novas-biografias-mg-covemg.md` com 4 casos da Comissão da
Verdade em Minas Gerais (fonte_id faa5ff3d…), mas eles ainda não tinham virado
JSON nem ido ao banco. Convertidos e semeados via `06_semear_curadoria.py`
(idempotente): biografias `augusto-soares-da-cunha`, `carlos-schirmer`,
`guido-leao-santos`, `lucimar-brandao-guimaraes` e os 4 eventos_geo
correspondentes, todos `publicada`.

**Decisões editoriais do Yuri (registradas antes de gravar):**
- **Augusto Soares da Cunha** — marcador `camponesado` NÃO atribuído: o relatório
  registra "Ocupação: não consta" e a classificação seria mera inferência
  contextual. Nota inserida no `texto_md`. (Caso fica sem marcador de classe.)
- **Carlos Schirmer** — marcador `estrangeiro_imigrante` suprimido: nasceu em
  Além Paraíba/MG; é descendente de imigrantes (pai austríaco, mãe portuguesa),
  não imigrante, e o vocabulário não tem essa categoria. Origem familiar fica só
  no `texto_md`. Mantido `classe_trabalhadora`.
- **Guido Leão Santos** — `tipo_evento = operacao_repressiva` (dispersão da greve
  da FIAT pela cavalaria da PM é o fato central; o atropelamento foi consequência).
- **Lucimar Brandão Guimarães** — por coerência com as duas decisões acima, o
  marcador `classe_media` (também inferência, sinalizada pelo próprio curador)
  foi omitido; mantido apenas `estudante`, este diretamente nas fontes.
- **Status** — os 4 gravados como `publicada`, igual ao Benedito Gonçalves.

**Pendências da auditoria que seguem em aberto (decisão humana):** segundo evento
ou nota para a morte do pai de Augusto (Otávio, ~4/4/1964, sem data exata); nível
de detalhe sobre perpetradores nomeados (esp. Lucimar — Covemg não os nomeia como
torturadores, só como a equipe que o retirou do presídio); e os 3–4 casos de MG
já garimpados mas não desenvolvidos (Geraldo de Assis, João de Carvalho Barros,
João Lucas Alves, Flávio Ferreira da Silva). Demais pendências antigas seguem:
Tomo II da CEV-SP (dossiê), Araguaia/CEV-Rio, BNM, módulo crimes e justiça (Fase 7).

## 16/06/2026 — Fase 6: mulheres de São Paulo (CEV-SP "Rubens Paiva")
**Convocação da equipe.** O curador-historiador garimpou os chunks da CEV-SP
(Tomos I, III e IV — o Tomo II indexado tem só a síntese introdutória do dossiê)
e entregou `docs/auditorias/novas-biografias-mulheres-sp-cevsp.md` com quatro
casos de mulheres ligadas a São Paulo. A sessão principal converteu em JSON e
semeou via `06_semear_curadoria.py` (idempotente).

**Ingeridos como `publicada` (3 biografias + 3 eventos_geo):**
- **Heleny Telles Ferreira Guariba** (Bebedouro/SP) — diretora teatral, torturada
  na OBAN/SP (1970), desaparecida em 12/7/1971; evento da OBAN georreferenciado
  no Paraíso. Fonte: Tomo III, 21ª Audiência Pública.
- **Sônia Maria Lopes de Moraes Angel Jones** (São Vicente/SP) — militante da
  ALN, morta em 30/11/1973 pelo DOI-CODI/SP, enterrada como indigente em Perus
  com nome falso. Fonte: Tomo III, 44ª Audiência Pública.
- **Sibele Aparecida Manoel** (Leme/SP) — empregada doméstica de 17 anos, morta
  pela tropa de choque da PM-SP na greve dos canavieiros de Leme (11/7/1986).
  Fonte: Tomo IV, Anexo XIX (Parecer Jurídico).

**Decisões editoriais do Yuri (registradas antes de gravar):**
- **Ana Rosa Kucinski Silva (4º caso) — RETIDA**, não ingerida: lacuna documental
  nos chunks (sem data de desaparecimento, sem nascimento/filiação). Aguarda o
  Tomo II integral da CEV-SP. Princípio 3 (nunca inventar) acima da meta de 4.
- **Marcadores de classe por inferência omitidos** (precedente Lucimar/MG): só o
  literal — `mulher` (3), `estudante` (Sônia), `classe_trabalhadora` (Sibele).
- **Heleny — `violencia_sexual` em tipos_crime com nota de base testemunhal**
  (relato de Inês Etienne Romeu, única sobrevivente da Casa da Morte; verbo no
  condicional na fonte).
- **Sibele — nota pública sobre invisibilidade racial** nos registros oficiais
  inserida no `texto_md` (a ausência de raça/cor é dado histórico, não prova de
  branquitude).
- **Coordenadas** do DOI-CODI/SP alinhadas ao ponto da Rua Tutóia já usado no
  acervo; OBAN aproximada no Paraíso; Leme no centro do município. Todas marcadas
  como aproximadas em `nota_geometria`.

**Pendências abertas (decisão/insumo humano):** Ana Rosa (Tomo II integral);
coordenadas históricas finas (OBAN Rua Tomás Carvalhal, apartamento em São
Vicente, Bairro Bom Sucesso em Leme); casos de mulheres já garimpados e não
desenvolvidos (Rosalina Santa Cruz, Maria Auxiliadora Lara Barcelos, Ieda de
Seixas, Elza Lobo — sobreviventes/testemunhas). Pendências antigas seguem:
Araguaia/CEV-Rio, BNM, módulo crimes e justiça (Fase 7).

## 2026-06-16 — Lote SP/mulheres: ingestão de Ana Rosa Kucinski Silva

**Decisão do Yuri:** ingerir Ana Rosa com os dados disponíveis, com lacunas
documentadas na nota de transparência editorial do `texto_md`, sem aguardar o
Tomo II integral da CEV-SP. Princípio 3 respeitado: a ausência de data exata e
filiação é explicitada publicamente, não ocultada.

**O que foi inserido:**
- **Ana Rosa Kucinski Silva** (São Paulo/SP) — professora do Instituto de Química
  da USP e militante da ALN, desaparecida forçadamente em São Paulo em 1974.
  Marcadores: `mulher`, `classe_media`. Evento no mapa: desaparecimento forçado
  em São Paulo (coordenadas aproximadas da Cidade Universitária/USP); tipos de
  crime: `prisao_ilegal_arbitraria`, `desaparecimento_forcado`,
  `ocultacao_de_cadaver`.
  - `biografia_id`: d8186043-2644-4cf2-9fae-5c50df1c6265
  - `evento_id`: 5db9d57f-d9c0-4c6e-9700-1c0fc727f0ca

**Nota de transparência registrada na biografia:** data de nascimento, local de
nascimento e nome dos pais ausentes nos chunks indexados; data exata do
desaparecimento (1974) também não localizada — campo `data` do evento usa
1974-04-01 como aproximação de ano; atualização prevista com Tomo II e Dossiê
Ditadura (2009).

**Pendências que permanecem:** coordenadas históricas finas; data exata do
desaparecimento; dados biográficos completos (aguarda Tomo II); marcador
`estrangeiro_imigrante` (ascendência judia polonesa — aguarda confirmação
documental nos chunks). Pendências anteriores: Araguaia/CEV-Rio, BNM, módulo
crimes e justiça (Fase 7).

## 2026-06-17 — Lote SP/mulheres: sobreviventes e testemunhas (CEV-SP)

**Migração aplicada:** `0011_tipo_sobrevivente.sql` — adicionado o valor
`sobrevivente` ao check constraint de `biografias.tipo`.

**Decisões do Yuri:**
- Maria Auxiliadora Lara Barcelos: inserir com nota de lacuna (sem aguardar Tomo II).
- Ieda Akselrud de Seixas: não atribuir marcador de origem judaica (sem autodeclaração explícita nos chunks).
- Marcador `militante_politica` não existe na taxonomia; omitido para Rosalina.

**O que foi inserido:**
- **Rosalina Santa Cruz** (Recife/PE — `sobrevivente`) — irmã de Fernando Santa Cruz,
  presa e torturada pelo DOI-CODI/RJ, desaparecida por 45 dias, sofreu aborto na
  prisão, declarou violência sexual publicamente. Marcador: `mulher`. Evento: DOI-CODI/RJ,
  Rio de Janeiro, 1974-02-23 (data aproximada — mesma do desaparecimento do irmão).
  - `biografia_id`: 3e017152-a373-45ad-9099-a3fc00293ff3
  - `evento_id`: dc4d98c2-f035-4c25-967c-dd7c198cdf61

- **Ieda Akselrud de Seixas** (São Paulo/SP — `sobrevivente`) — presa sem ser militante,
  estuprada pelo delegado Davi dos Santos Araújo (nomeado), presenciou morte do pai
  Joaquim Alencar de Seixas e de jovem anônimo na OBAN/SP. Marcadores: `mulher`,
  `estudante`. Evento: OBAN, Rua Tomás Carvalhal, SP, 16/04/1971.
  - `biografia_id`: 197d517e-5f66-40ac-a76e-a733c26ec66f
  - `evento_id`: 11328b17-c774-464c-a1f8-a37059f8bd73

- **Maria Auxiliadora Lara Barcelos** (município desconhecido — `vitima`) — estudante
  que testemunhou e denunciou perante a Auditoria Militar o assassinato de Chael
  Schreier na OBAN/SP (1969); faleceu por suicídio como sequela da tortura. Sem
  marcadores (sem base documental nos chunks). Sem evento no mapa (dados insuficientes).
  Nota de lacuna pública no texto_md.
  - `biografia_id`: 86a91ba4-ee4c-49c7-b28d-a9293e19305c

**Correção editorial:** o lead do garimpo anterior indicava "21ª Audiência" para Rosalina
— os chunks mostram que ela depôs na 6ª Audiência (caso Fernando Santa Cruz) e no
2º Prêmio Beth Lobo. Corrigido no dossiê de auditoria.

**Próximo lote identificado (material suficiente nos chunks):** Damaris Lucena, Ilda
Martins da Silva, Elza Lobo, Joana D'Arc Gontijo — todos com depoimentos nos
Tomos III/IV da CEV-SP. → Concluído no lote seguinte.

## 2026-06-17 — Lote 3 SP/mulheres: Damaris, Ilda, Elza e Joana D'Arc (CEV-SP)

**Decisões do Yuri:**
- Ilda Martins: NÃO atribuir `classe_trabalhadora` (refere-se ao marido, não a ela).
- Virgílio Gomes da Silva: formulação "morto na OBAN (29/09/1969)".
- Joana D'Arc Gontijo: inserir identificação parcial com nota de lacuna, sem evento no mapa.

**O que foi inserido:**
- **Damaris Lucena** (Atibaia/SP — `sobrevivente`) — militante VPR, presa 20/02/1970 em
  Atibaia, marido assassinado na frente da família, filho Ariston condenado à morte,
  barbaramente torturada, libertada na troca pelo cônsul japonês Nobuo Okuchi, exílio no
  México e Cuba. Marcador: `mulher`.
  - `biografia_id`: 8675e0b1 | `evento_id`: e221c1c8 (Atibaia, 1970-02-20)

- **Ilda Martins da Silva** (São Paulo/SP — `sobrevivente`) — viúva de Virgílio Gomes da
  Silva (ALN, morto na OBAN 29/09/1969), presa com filhos (mais novo com 4 meses),
  torturada, 4 meses incomunicável, exílio no Chile e Cuba. Marcador: `mulher`.
  - `biografia_id`: 862dabf2 | `evento_id`: fff2ada1 (SP, 1969-10-01 aprox.)

- **Elza Lobo** (São Paulo/SP — `sobrevivente`) — funcionária da Secretaria da Fazenda/SP,
  presa 10/11/1969 pela equipe do cap. Maurício, torturada no DOPS, transferida ao
  Tiradentes sob exposição pública, submetida a nudez forçada e agachamentos. Conexão
  com TUCA e Heleny Guariba documentada. Marcador: `mulher`.
  - `biografia_id`: 1d0841ef | `evento_id`: b74f6bd6 (DOPS/SP, 1969-11-10)

- **Joana D'Arc Gontijo** (São Paulo/SP — `sobrevivente`) — identificação parcial; presa
  no DOI-CODI/OBAN, companheira de cela de Ieda de Seixas, testemunha de torturas e
  mortes. Sem evento (dados insuficientes). Marcador: `mulher`.
  - `biografia_id`: 1431346f

**Próximo lote possível (chunks disponíveis):** Cidinha Santos, Derlei Catarina de Luca,
Nasaindy Barret de Araujo, Izaura Coqueiro, Heleny Guariba (caso autônomo). Pendências
anteriores: Araguaia/CEV-Rio, BNM, módulo crimes e justiça (Fase 7).

## 2026-06-16 — Complemento documental: Ana Rosa e Ilda (fontes externas CEV-SP)

Baixados cinco documentos pequenos do repositório da CEV-SP
(`comissaodaverdade.al.sp.gov.br/upload/`) para completar lacunas identificadas nos lotes
anteriores. Documentos depositados em `pipeline/dados/fontes-extras/`.

**Atualizações realizadas no banco (SQL UPDATE — sem novo chunk):**

- **Ana Rosa Kucinski Silva** (`d8186043`):
  - `texto_md` reescrito com: nascimento em 12/01/1942 em SP/SP, filiação Majer e Esther
    Kucinski (certidão de óbito), data exata do desaparecimento **22/04/1974** (4º
    aniversário de casamento), Wilson Silva identificado como **físico**, origem judaica
    confirmada (Folha de S.Paulo, 18/10/2012). Nota de transparência sobre lacunas
    removida — dados agora confirmados documentalmente.
  - Evento `5db9d57f`: data corrigida de `1974-04-01` para **`1974-04-22`**.
  - Fontes: certidão de óbito (Lei 9.140/1995, lavrada em 26/02/1996); Folha de S.Paulo,
    18/10/2012; transcrição da cerimônia CNV/CEV-SP, 17/10/2012.

- **Ilda Martins da Silva** (`862dabf2`):
  - `texto_md` reescrito com: ela própria era operária da NitroQuímica, conheceu Virgílio
    na greve de 1957, casaram em 1960, filhos Vladimir/Virgílio/Gregório/Isabel (4 meses
    quando Ilda foi presa), presa em **30/09/1969** (dia seguinte ao de Virgílio),
    torturada com ameaça de tortura dos filhos na sua frente, 4 meses incomunicável, Rose
    Nogueira a ajudou a sair, 1 ano Chile + 18 anos Cuba.
  - Evento `fff2ada1`: data corrigida de `1969-10-01` para **`1969-09-30`**.
  - Marcador `classe_trabalhadora` adicionado: base documental literal da Revista ADUSP
    (out. 2011) — "operária consciente e combativa". Fonte âncora no banco: CEV-SP Tomo
    III; nota da fonte suplementar no campo `secao`.
  - Fonte: Revista ADUSP, out. 2011, "Em memória de Virgílio Gomes da Silva, cidadão
    brasileiro, operário" — **não indexada no acervo RAG** (arquivo em
    `pipeline/dados/fontes-extras/017-Materia-revista-ADUSP-Virgilio.pdf`).

**Pendência:** indexar os PDFs de `fontes-extras/` como chunks (especialmente o artigo
ADUSP e a transcrição CNV) quando houver orçamento de pipeline.

## 2026-06-16 — Dossiê Ditadura CEV-SP: ingestão e atualização em massa

Processado o livro "Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil de 1964
a 1985" (CEV-SP, 2013, 762 p., 77 MB) via pipeline Python (`pdftotext`) e auditoria do
curador-historiador.

**Fonte registrada no banco:**
- `fonte_id`: d6f2e787 — Dossiê Ditadura CEV-SP (relatorio_oficial, confiabilidade alta)

**Novo verbete inserido:**
- **Wilson Silva** (`f49cba3b`) — físico da USP, militante ALN, codinome "Rodrigues",
  nascido 21/04/1942 em Taubaté/SP. Vinculado ao evento de Ana Rosa (evento 5db9d57f)
  via `evento_vitimas`. Verbete autônomo por decisão do Yuri.

**Biografie atualizadas com dados do Dossiê (17 registros):**
- Ana Rosa Kucinski: agente José Rodrigues Gonçalves, transferência Petrópolis, CEMDP 036/96, doutorado USP 1972
- Heleny Guariba: CEMDP 293/96; 12/07/1971 é data da 2ª prisão (Rio), não do telefonema
- Sônia Angel Jones: nasceu em Santiago do Boqueirão/RS; sepultamento Perus→Jardim da Saudade/RJ; cassetete enviado pelo general Fiúza à família
- Devanir Carvalho: nascido Muriaé/MG; irmãos Daniel e Joel também desaparecidos; CEMDP 127/96
- Iara Iavelberg: nascida SP/Ipiranga, família judaica; dois processos CEMDP; ressepultada 2006 fora do setor dos suicidas
- Vladimir Herzog: nasceu em Osijek, Iugoslávia (hoje Croácia); naturalizado; Operações Jacarta/Radar; CEMDP 210/96
- Manoel Fiel Filho: nasceu Quebrângulo/AL; sem meias (contradiz versão oficial); relatório SNI confirma estrangulamento
- Stuart Angel Jones: nasceu Salvador/BA; CISA 14/05/1971; tortura por gás de escapamento; contradição data Marinha
- Frei Tito: 40 dias de tortura; banido na troca pelo embaixador suíço (13/01/1971); Eveux; CEMDP 126/04
- Ângelo Arroyo: nasceu SP; autor do Relatório Arroyo; Chacina da Lapa 16/12/1976
- Rubens Paiva: nasceu Santos/SP; engenheiro Mackenzie; Eunice não requereu indenização; restos nunca localizados
- Mário Alves: modo de morte documentado; primeiro caso de responsabilidade civil da União reconhecida judicialmente (1987)
- Joaquim Câmara Ferreira: PCB desde 1933; vereador Jaboticabal 1946; sítio do Fleury
- Hélcio Fortes: nasceu Ouro Preto 24/01/1948; preso Rio 22/01/1972; trasladado Perus→Ouro Preto
- Eremias Delizoicov: nasceu SP 27/03/1951; enterrado sob identidade falsa (José Araújo Nóbrega)
- Devanir: dois irmãos vítimas (Daniel e Joel)
- Marighella: marcador `negro` já existia no banco — confirmado pela base literal do Dossiê (p. 160)

**Decisões registradas:**
- Wilson Silva: verbete autônomo (aprovado pelo Yuri)
- Marighella `negro`: confirmado (Dossiê p. 160: "Filho de uma negra e um imigrante italiano")
- Maria Augusta Thomaz: entra no próximo lote de ingestão
- Suely Yumiko Kanayama: fase do Araguaia/CEV-Rio

**Pendência pipeline:** chunking + embeddings do Dossiê Ditadura
(`pipeline/dados/dossie-ditadura-cevsp.txt`, 2,8 MB) — fazer quando houver orçamento.

## 2026-06-16 — Lote SP/mulheres: Maria Augusta Thomaz (Dossiê Ditadura)

- **Maria Augusta Thomaz** (`3b04e52a`) — Leme/SP, estudante da PUC/SP, militante do
  Molipo, codinome "Neuza". Desaparecida em 17/05/1973 em Rio Verde/GO junto com Márcio
  Beck Machado. Restos mortais exumados clandestinamente por agentes do CIE (1980) para
  impedir identificação.
  - Marcadores: `mulher`, `estudante` — fonte: Dossiê Ditadura CEV-SP, p. 437.
  - Evento `4bfcabb1` — Rio Verde/GO, 17/05/1973, tipos_crime:
    execucao_sumaria + desaparecimento_forcado + ocultacao_de_cadaver.
  - Fonte do evento: Dossiê Ditadura CEV-SP (d6f2e787), p. 437–438.
  - CEMDP: caso 039/96.

**Próximo lote possível:** Cidinha Santos (Maria Aparecida Santos), Derlei Catarina de
Luca, Nasaindy Barret de Araujo, Izaura Coqueiro, Heleny Guariba (aprofundamento).
Fase Araguaia/CEV-Rio e BNM também pendentes.

## 2026-06-17 — Correção do chunking do CEMDP (vazamento de seção)

Auditoria do chunk do Bacuri (anotada na memória) revelou um defeito **sistêmico**, não
pontual: no chunking do CEMDP (`pipeline/03_chunkar_cemdp.py`), dos **448** perfis de
vítimas do Capítulo 4, só **79** tinham `secao` correta — os outros 369 herdavam o nome
da vítima anterior.

**Causa:** a detecção de seção só olhava a primeira linha de cada parágrafo (bloco
separado por linha em branco). Páginas com quebra de linha simples e sem linha em branco
antes do cabeçalho deixavam o nome da próxima vítima embutido no meio do parágrafo,
invisível ao detector.

**Correção:** função `isolar_cabecalhos_de_perfil()` isola cada cabeçalho como parágrafo
próprio e remonta nomes longos quebrados em duas linhas físicas (ANTÔNIO EXPEDITO
CARVALHO PERERA; JOÃO FERREIRA DE MACEDO SOBRINHO), com exclusão de subtítulos em
caixa-alta (`SUBTITULOS_CAP4`, ex.: "ARGENTINOS DESAPARECIDOS NO BRASIL").
Resultado: **79 → 474** seções de perfil. Bacuri agora em "Perfil – EDUARDO COLLEN LEITE".

**Re-indexação no Supabase (fonte 067ba85a):** a 1ª tentativa apagou os 1400 chunks
antigos mas estourou o *statement timeout* no INSERT (free tier, erro 57014), deixando a
fonte com 0 chunks por alguns minutos. Resolvido reduzindo `LOTE_INSERCAO` de 100 para 25
em `04_indexar.py`. Reindexados **1562 chunks / 474 perfis**; busca de teste confirmou o
trecho do Forte dos Andradas (pp. 137-138) retornando sob a seção certa.

**Commit:** `a25ad15` — "Corrige vazamento de seção no chunking do CEMDP".

**Diagnóstico aberto (próxima fase — indexar o Dossiê Ditadura CEV-SP):** o chunker
`03_chunkar_dossie_ditadura.py` tem a **mesma arquitetura** (só checa a 1ª linha do
parágrafo, linhas 375-378). Impacto menor que o CEMDP — 355 seções "Perfil –" detectadas,
maioria dos conhecidos OK — mas há vazamentos reais (ex.: conteúdo de **Rubens Paiva** sob
`Perfil – Celso Gilberto de Oliveira`, pág. 210; Wilson Silva, Herzog e Frei Tito a
verificar). Plano: portar `isolar_cabecalhos_de_perfil` adaptada ao padrão de nome em
caixa mista do Dossiê, re-chunkar, indexar (fonte `d6f2e787`, com `LOTE_INSERCAO=25`).

## 2026-06-18 — Fase 5: 2º lote DHnet — 8 comissões MUNICIPAIS da verdade
**Decisão do Yuri:** dar continuidade ao catálogo DHnet ingerindo as 8 comissões
**municipais** nesta sessão (das ~24 restantes; universitárias e temáticas ficam
para lotes futuros), respeitando a regra de economia de tokens. O 1º lote DHnet
(estaduais AP/BA/SE + Triângulo) foi commitado antes (`c19f4ea`).

- **Engenheiro (feito na sessão principal — subagente em segundo plano ficou sem
  permissão de Bash):** baixados do DHnet (`/verdade/cv/`, sem bloqueio) os 8 PDFs;
  proveniência (SHA-256/URL) em `manifesto.json` e metadados em `fontes.json`
  (slugs `cmv-*`). Diagnóstico de camada de texto: **7 nativos**, **1 escaneado**.
  - Juiz de Fora/MG (272 p.), João Pessoa/PB (345 p.), Niterói/RJ (145 p.,
    *preliminar*), Petrópolis/RJ (402 p.), Volta Redonda/RJ (589 p.), Mauá/SP
    (72 p.), São Paulo/SP "Herzog" (396 p.) → extração direta (`02_extrair.py`).
  - **Osasco/SP (117 p.) é 100% escaneado** → OCR (Tesseract `por`, 300 DPI) via
    novo `pipeline/02d_ocr_osasco.py` (~257 s, ~190 mil chars legíveis).
- **Cientista (subagente, com permissão de terminal, só chunking):** estendeu
  `03_chunkar_estaduais.py` com os 8 slugs (limpeza de cabeçalho/rodapé + mapas de
  seção por sumário). **3.283 chunks**, mediana ~375 tokens, 0 acima de 512.
  Seções mapeadas em 6 docs (97–100%); Mauá e Osasco com `secao=null` (sem
  capítulos formais — registro de audiências / dossiê documental).
- **Indexação no Supabase (autorizada pelo Yuri):** 8 fontes novas + 3.283 chunks
  (e5-small, `LOTE_INSERCAO=25`, sem incidente de timeout). Busca de sanidade OK
  (greve da CSN/Volta Redonda 0,90; cruzamento com audiências da CEV-SP — a busca
  híbrida integra o acervo novo ao existente).
- **Curador (`docs/auditorias/dhnet-municipais.md`): APTO COM RESSALVAS, nada
  bloqueante.** Todos os mapas de seção consistentes com os sumários (nenhuma parte
  pulada). Achado estrutural: nenhuma das 8 fontes tinha `nota_contexto` — redigiu
  as 8. Decisões do Yuri aplicadas (UPDATE em `fontes.json` + tabela `fontes` via
  `aplicar_notas_municipais.py`, idempotente): (a) **8 `nota_contexto`**;
  (b) **Osasco `confiabilidade` alta→media** (OCR degradado); (c) **título de SP**
  para o nome legal ("Comissão da Memória e Verdade da Prefeitura do Município de
  São Paulo"), epíteto "Vladimir Herzog" só na nota; (d) **Niterói** mantida "alta"
  + nota de alerta de versão preliminar (decisão editorial do Yuri).

**Pendências (backlog não-bloqueante apontado pela curadoria):** filtro de
`tipo_chunk` para pré-texto (créditos, listas de siglas) nas buscas; granularidade
do decreto do Diário Oficial nos anexos de Petrópolis; verificar se a CEV-Rio traz
relatório final de Niterói. **Lotes DHnet futuros:** 8 universitárias, 9 temáticas.
Pendências antigas seguem: Dossiê Ditadura (vazamento de seção — `b69f9a9`),
Araguaia, BNM, módulo crimes e justiça (Fase 7).

## 2026-06-18 — Fase 5: 3º lote DHnet — 8 comissões UNIVERSITÁRIAS da verdade
**Decisão do Yuri:** seguir o catálogo DHnet ingerindo as 8 comissões
**universitárias** nesta sessão (das temáticas restantes para um 4º lote),
respeitando a economia de tokens. Sequência rodada com **subagentes em segundo
plano, um por vez, com `mode: bypassPermissions`** (a 1ª tentativa do engenheiro
travou por falta de permissão de Bash — gotcha já conhecido, corrigido relançando).

- **Engenheiro-de-dados (subagente):** baixou do DHnet (`/verdade/cv/`, assinatura
  `%PDF` conferida via GET ranged) os 8 PDFs; proveniência (SHA-256/URL) em
  `manifesto.json`, metadados em `fontes.json` (slugs `cuv-*`). **Os 8 são texto
  nativo — nenhum exigiu OCR.** UFBA 174 p., UnB 363 p. (maior), UFES 190 p.,
  UFOP 258 p., UFCG 30 p. (*parcial*), Unicamp 61 p., UNIFESP 84 p., UFRN 491 p.
- **Cientista-de-dados (subagente):** estendeu `03_chunkar_estaduais.py` com os 8
  slugs (limpeza + mapas de seção por sumário). **2.592 chunks**, mediana ~375
  tokens, 0 acima de 512. Conferência sumário×mapa em todos: detectou e corrigiu um
  bug do tipo CEV-SE em `cuv-df-unb` (entrada de seção fora de ordem silenciava a
  "Apresentação") **antes** de indexar. Indexação no Supabase OK, sem timeout.
- **Curador-historiador (subagente):** APTO, nada bloqueante. Redigiu as **8
  `nota_contexto`** definitivas (fundamentadas na leitura dos documentos), auditou
  amostra de chunks e confirmou que nenhuma das 8 é duplicata do acervo.
- **Aplicado na sessão principal** (`pipeline/aplicar_notas_universitarias.py`,
  idempotente — UPDATE em `fontes.json` + tabela `fontes`): 8 notas + **UNIFESP
  `subtipo=informe`** (o arquivo do DHnet é o informe ao Consu, não o relatório
  integral — decisão do Yuri). E-mails na capa da UFBA → backlog (decisão do Yuri).

**Pendências (backlog não-bloqueante, em `fontes-prioritarias.md`):** paratexto
marcado como `corpo` nos 8 (siglas da UnB, currículos da UFOP); duplicação de
conteúdo (UFES, UFCG); chunk atômico na UFCG; `secao` errada na UFRN (chunk 2);
vazamento de rodapé (UFBA, Unicamp); **LGPD** — e-mails na capa da UFBA;
dimensão de gênero a avaliar. **Lote DHnet restante:** 9 temáticas/setoriais.

## 2026-06-18 — Fase 6: 1º lote de biografias do SUL — 5 vítimas do Paraná (CEV-PR)
**Decisão do Yuri:** começar a curadoria de biografias do Sul **um estado por vez**
(Paraná primeiro, acervo mais rico), **vítimas antes de perpetradores**, **lote
pequeno (4–6)**. As 5 fontes do Sul já estavam baixadas, extraídas, chunkadas e
**indexadas no Supabase** (CEV-PR vol1 615 + vol2 674, CEV-SC 375, CEV-RS 180,
CTV-SC jornalistas 20 chunks) — só faltava a curadoria editorial; até aqui não havia
nenhuma biografia de pessoa do Sul.

- **Sessão principal:** minerou os chunks do CEV-PR (vols. 1 e 2) via MCP Supabase;
  o sumário do vol. 2 deu a lista de vítimas com subseção própria. Caso central do
  PR: **Chacina do Parque Nacional do Iguaçu (1974)** — extermínio de militantes da
  VPR na Estrada do Colono (Foz do Iguaçu), no marco da Operação Condor.
- **Curador-historiador (subagente, `mode: acceptEdits`):** redigiu **5 biografias
  de vítimas** (`tipo=vitima`, `publicada`), cada afirmação com citação (página +
  trecho literal): Onofre Pinto (10 cit.), Daniel e Joel José de Carvalho (8 e 6),
  Enrique Ernesto Ruggia (7, único estrangeiro), Clarice Valença (10). Criou também
  o evento georreferenciado **chacina-parque-nacional-iguacu-1974** ligando as 4
  vítimas da chacina (ponto em Foz do Iguaçu).
- **Revisão na sessão principal (gotchas corrigidos antes de ingerir):** 3 JSONs
  vinham com **aspas não escapadas no `texto_md`** (JSON inválido) → escapadas; o
  evento usava `tipo_evento: "caso_coletivo"` (inexistente no vocabulário) → trocado
  por `operacao_repressiva`; **Enrique** nasceu em Corrientes (Argentina) e o schema
  só aceita UF brasileira → `municipio_natal/uf_natal` nulos (origem registrada no
  `texto_md`). Municípios de naturalidade conferidos em `municipios_ibge`.
- **Ingestão (sessão principal, autorizada pelo Yuri):** `06_semear_curadoria.py`
  (upsert idempotente) OK; `10_preencher_naturalidades.py` preencheu coordenadas de
  Onofre (Jacupiranga/SP), Daniel e Joel (Muriaé/MG). As 5 confirmadas como
  `publicada` no banco.

**Pendências (backlog não-bloqueante):** **Jane Argolo/Perpétua Janeti Batista dos
Santos** (CEV-PR vol2, pp. 202–219) **sumiu dos chunks** — provável falha de
chunking (tipo CEV-SE); investigar com o cientista-de-dados. **José Lavéchia** e
**Vitor Carlos Ramos** (as outras 2 vítimas da chacina) têm material suficiente →
2º lote PR. Schema sem campo para naturalidade estrangeira (`pais_natal`) — decisão
futura. **Próximos lotes do Sul:** completar PR, depois SC e RS, depois
perpetradores (DOPS/DOI-CODI regionais, entram como `rascunho` — ADR-013).

## 2026-06-18 — Fase 6: 2º lote PR — fecha a chacina (Lavéchia, Vitor) e cura Jane Argolo
Fechamento do lote do Paraná, resolvendo as duas pendências do 1º lote.

- **Investigação da "sumiço" da Jane Argolo (cientista-de-dados / sessão):** a
  pendência registrada estava **errada**. Jane **está integralmente indexada** no
  Supabase (CEV-PR vol2, fonte `ac92ca87…`, pp. 203–220) e recuperável por busca
  textual. O que ocorreu foi **rotulagem grossa de seção**: `03_chunkar_estaduais.py`
  só captura os capítulos de 1º nível (1. Operação Condor / 2. Outras Graves
  Violações / 3. Partidos… / 4. Textos Temáticos) e colapsa as subseções nominais —
  por isso a busca pelo mapa de seções não a achava, embora não houvesse perda de
  conteúdo. **Decisão do Yuri:** curar a partir dos chunks existentes, sem re-chunkar;
  a granularidade de subseção do chunker estaduais fica como melhoria futura.
- **Curador-historiador (subagente):** redigiu **3 biografias** (`tipo=vitima`,
  `publicada`), cada afirmação com página + trecho literal: **José Lavéchia**
  (sapateiro paulistano, VPR, 9 cit.) e **Vitor Carlos Ramos** (escultor santista,
  VPR, 9 cit.) — as duas vítimas restantes da Chacina do Parque Nacional do Iguaçu;
  e **Jane Argolo** / Perpétua Janete (Janeti) Batista dos Santos (14 cit.),
  sobrevivente de prisão e tortura em Curitiba (DOPS-PR / Presídio do Ahú / Cenimar),
  caso distinto da chacina (cap. 2). O evento `chacina-parque-nacional-iguacu-1974`
  passa a vincular as **6** vítimas.
- **Gotcha corrigido antes de ingerir:** o `06_semear_curadoria.py` validava
  `sobrevivente` como marcador, mas a decisão editorial da **migração 0012** unificou
  sobreviventes no `tipo=vitima` e **não criou** marcador `sobrevivente` (constraint
  `biografia_marcadores_marcador_check` tem 13 valores fixos). Jane ficou com
  marcadores `mulher` + `estudante`; a sobrevivência é declarada no `texto_md`.
  Naturalidades: Lavéchia (São Paulo/SP), Vitor (Santos/SP), Jane (Santa Rosa/RS).
- **Ingestão (autorizada pelo Yuri):** `06_semear` (upsert idempotente) OK; as 3
  confirmadas `publicada` no banco e o evento com as 6 vítimas vinculadas.

**Pendência aberta:** melhorar a granularidade de subseções no `03_chunkar_estaduais.py`
(capturar 2.x nominais e re-indexar) — fora do escopo deste lote.

## 2026-06-21 — Fase 6: lote Santa Catarina (14 biografias) + naturalidades no mapa
Sequência do Sul (PR→SC→RS): fechado o lote de **SC**, em duas fases sem paralelizar agentes.

- **Fase A — biografias de SC (curador-historiador):** 14 fichas `tipo=vitima`,
  `publicada`, a partir do texto extraído da **CEV-SC** (`4d2e8758…`, 375 chunks) e da
  **CTV-SC Jornalistas** (`7884150d…`): higino-joao-pio, paulo-stuart-wright, arno-preis,
  divo-fernandes-doliveira, frederico-eduardo-mayr, hamilton-fernando-cunha,
  joao-batista-rita, luiz-eurico-tejeda-lisboa, rui-osvaldo-pfutzenreuter,
  wanio-jose-de-mattos, derlei-catarina-de-luca, marlene-de-souza-soccas, salim-miguel
  e **egle-malheiros** (curada por decisão do Yuri, mesmo com documentação subsidiária ao
  depoimento conjunto com Salim Miguel).
- **Decisões editoriais do Yuri:** removido `estrangeiro_imigrante` de Paulo Stuart Wright
  (nascido em Joaçaba/SC, brasileiro); Rui Pfützenreuter ficou só com `jornalista`
  (classe_trabalhadora era inferência frágil).
- **Validação antes de ingerir (sessão principal):** auditoria automática de **111
  fragmentos de citação** conferidos página a página contra o JSONL-fonte (normalizando
  aspas curvas/acentos). Pegou 2 defeitos nas fichas de depoimento (transcrição ruidosa):
  Eglê dizia "Hospital **da Polícia** Militar" (fonte: "Hospital Militar") — corrigido
  trecho + texto_md; e páginas deslocadas (Eglê 105→101, Salim 101→103) e um "ouço"/"ouso"
  (erro de OCR) alinhado ao verbatim. Lote reauditado: 100% limpo.
- **Ingestão:** `06_semear_curadoria.py` (upsert idempotente) — 14 confirmadas `publicada`.
  Trema preservado no banco (UTF-8). Errata registrada: o PDF da CEV-SC traz "12 ou
  13/01/1074" (p.30) para João Batista Rita — é 1974.
- **Fase B — naturalidades no mapa:** as 11 cidades natais novas de SC geocodificadas via
  IBGE (`10_preencher_naturalidades.py`, sede do município). Curador recuperou a
  naturalidade de 26 vítimas antigas sem ponto natal a partir do **cabeçalho "Data e local
  de nascimento" do CNV vol III** (e CEMDP): **6 preenchíveis** — ana-rosa-kucinski-silva
  (SP), joao-alfredo-dias (Sapé/PB), maria-augusta-thomaz (Leme/SP),
  maria-auxiliadora-lara-barcelos (Antônio Dias/MG), pedro-inacio-de-araujo (Itabaiana/PB),
  wilson-silva (SP). As 2 com JSON foram editadas (fonte-da-verdade) e re-gravadas; as 4
  sem arquivo JSON (semeadas a partir de `docs/auditorias/*.md`) receberam `UPDATE` direto
  no banco. Todas as 6 geocodificadas (0 sem correspondência IBGE).
- **Resultado no mapa:** vítimas 90→**104**; com ponto de cidade natal 46→**63**;
  nenhuma naturalidade ficou sem coordenada.

**Pendências:** 20 vítimas não-indígenas seguem sem ponto natal — **4 estrangeiras**
(Vladimir Herzog/Osijek-Iugoslávia, Pauline Reichstul/Praga-Tchecoslováquia, Enrique
Ruggia/Corrientes-Argentina, Salim Miguel/Líbano: schema sem campo `pais_natal`); **1 só
com UF** (Sebastião Gomes dos Santos, RN, sem município — sem coordenada possível); e **15
sem registro de nascimento** no corpus atual (a maioria sobreviventes: cipriana, clarice,
damaris, delsy, derlei, eglê, elza-lobo, guido-leão [só ano "1956"], ieda, ilda, joana-d'arc,
maria-da-cruz-vieira, maria-rita, rosalina, sibele). Possível enriquecimento futuro via
fontes externas (ex.: livros de memória de Eglê e Derlei) — decisão do engenheiro-de-dados.
As 22 vítimas Waimiri-Atroari ficam fora por princípio: naturalidade é o Território, não
município IBGE. **Próximo lote do Sul: RS** (CEV-RS `98a23e6e…`, 180 chunks, já indexado).

---

## 2026-06-22 — Promoção dos perpetradores da Seção A para publicada

Os 26 perpetradores da Seção A do Cap. 16 da CNV (registrados nos 4 sublotes
desta sessão) foram promovidos de `rascunho` para `publicada` após revisão
editorial do Yuri. Os 10 perpetradores anteriores (CEV-RS e SP) já estavam
como `publicada`. Total de perpetradores públicos no banco: **36**.

Mecanismo: atualização de `status_curadoria` nos JSONs locais +
`06_semear_curadoria.py` (upsert idempotente).

---

## 2026-06-22 — Lote Dirigentes do Regime: Seção B (1º sublote — itens 54–63)

Curadoria a partir do Capítulo 16, Seção B do Relatório da CNV, vol. I
(`fonte_id cc230d2d-c6b6-42bf-8c94-ef2d92194990`), pp. 856–858
("Responsabilidade pela gestão de estruturas e condução de procedimentos
destinados à prática de graves violações de direitos humanos").

- **10 figuras** (itens 54–63, alfabético A): adolpho-correa-de-sa-e-benevides,
  alcides-cintra-bueno-filho, amadeu-martire, amaury-kruel, antonio-bandeira,
  antonio-carlos-da-silva-muricy, antonio-ferreira-marques, antonio-jorge-correa,
  argus-lima, armando-patricio.
- **Não duplicados**: Adyr Fiuza de Castro (item 30 da Seção A, já no banco).
- **Diferença editorial vs. Seção A**: §17 (p.855) como fonte definitória;
  fatos específicos e ressalvas epistêmicas da CNV reproduzidos no texto_md;
  vítimas/operações nomeadas quando o item as menciona. Alcides Cintra Bueno
  Filho e Antônio Bandeira receberam remissão à Seção C para registro futuro.
- **2 fontes por ficha**: §17 (p.855) + item numerado (pp. 856–858).
- **Ingestão**: `06_semear_curadoria.py`, exit 0. Todos como **`rascunho`**.
  Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 36 → **46**.
- **Próximo sublote Seção B**: itens 64–70 (Arnaldo a Breno).

## 2026-06-22 — Lote Dirigentes do Regime: Seção B (2º sublote — itens 64–70)

Curadoria a partir do Cap. 16, Seção B, pp. 858–859.

- **6 figuras novas** (item 66/Audir Santos Maciel já no banco):
  arnaldo-siqueira, ary-casaes-bezerra-cavalcanti, augusto-fernandes-maia,
  aylton-siano-baeta, bento-jose-bandeira-de-mello, breno-borges-fortes.
- Vítimas nomeadas onde o item as menciona: Stuart Angel Jones (Ary Casaes),
  Ruy Frazão Soares (Augusto Fernandes Maia), Mónica Susana Pinus de Binstock
  e Horacio Domingo Campiglia (Aylton Siano Baeta).
- Augusto Fernandes Maia recebeu remissão à Seção C (também indicado lá).
- **Ingestão**: exit 0. Todos `rascunho`. Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 46 → **52**.

## 2026-06-23 — Lote Dirigentes do Regime: Seção B (3º sublote — itens 72–75)

Curadoria a partir do Cap. 16, Seção B, pp. 859–860.
Item 71 (Carlos Alberto Brilhante Ustra) já estava no banco.

- **4 figuras novas**: carlos-alberto-cabral-ribeiro, carlos-alberto-ponzi,
  carlos-sergio-torres, carlos-xavier-de-miranda.
- Fatos específicos registrados: massacre da Chácara São Bento/Recife (Cabral
  Ribeiro, 1973); Operação Pajussara e sequestro de Lorenzo Ismael Viñas em
  Uruguaiana/RS (Ponzi, 1971/1980); Operação Sucuri e ligação com a Operação
  Marajoara — ao menos 49 desaparecimentos forçados na Guerrilha do Araguaia
  (Torres, 1973); Chacina da Lapa/SP — execução de dirigentes do PCdoB em
  16/12/1976 (Xavier de Miranda).
- Carlos Sergio Torres recebeu remissão à Seção C (também indicado lá).
- **Ingestão**: exit 0. Todos `rascunho`. Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 52 → **56**.

---

## 2026-06-22 — Lote Dirigentes do Regime: presidentes/junta (1º sublote)

Curadoria a partir do Capítulo 16, Seção A do Relatório da CNV, vol. I
(`fonte_id cc230d2d-c6b6-42bf-8c94-ef2d92194990`): "Responsabilidade
político-institucional pela instituição e manutenção de estruturas e
procedimentos destinados à prática de graves violações de direitos humanos".

- **8 figuras** (presidentes da República + membros da Junta Militar de 1969,
  itens 1–8 da lista numerada da Seção A):
  humberto-de-alencar-castello-branco, arthur-da-costa-e-silva,
  aurelio-de-lyra-tavares, augusto-hamann-rademaker-grunewald,
  marcio-de-souza-e-mello, emilio-garrastazu-medici, ernesto-beckmann-geisel,
  joao-baptista-de-oliveira-figueiredo.
- **Escopo intencional**: somente o que a lista numerada da Seção A documenta.
  Ministros civis da Justiça (Gama e Silva, Buzaid) ficam fora — a própria CNV
  (§8) registra que "não tinham controle efetivo e operacional sobre a estrutura
  repressiva" e não os inclui na lista de autores.
- **Fundamentação**: estrita ao Cap. 16 / Vol. III da CNV. Dados biográficos
  externos (nascimento/morte) entram só na prosa, nunca como `trecho` de fonte
  (ADR-013). Vínculo institucional em prosa; array `organizacoes` omitido
  (sem fichas de Presidência/ministérios neste sublote — padrão do lote RS).
- **Distinção editorial** (ADR-018): estas figuras são classificadas no plano da
  responsabilidade político-institucional, distinta da autoria direta. A linguagem
  das fichas reflete o que a CNV afirma, sem atribuir autoria direta não documentada.
- **Ingestão**: `06_semear_curadoria.py`, exit 0. Todos como **`rascunho`**
  (aguardam revisão do Yuri para promover a `publicada`). Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 10 → **18** (todos como `rascunho`).
- **Próximos sublotes**: ministros da Guerra/Exército (6), Marinha (7),
  Aeronáutica (5) — totalizando 26 nomes da Seção A.

## 2026-06-22 — Lote Dirigentes do Regime: ministros do Exército (2º sublote)

Curadoria a partir do Capítulo 16, Seção A do Relatório da CNV, vol. I
(`fonte_id cc230d2d-c6b6-42bf-8c94-ef2d92194990`), pp. 848–849 (Ministros da
Guerra/do Exército, itens 9–14).

- **6 figuras** (ministros que não constavam do 1º sublote; os itens (2) Costa e
  Silva e (3) Lyra Tavares já estavam registrados como presidente/junta):
  adhemar-de-queiros, orlando-beckmann-geisel, vicente-de-paulo-dale-coutinho,
  sylvio-couto-coelho-da-frota, fernando-belfort-bethlem,
  walter-pires-de-carvalho-e-albuquerque.
- **Fundamentação e distinção editorial**: idêntica ao 1º sublote (ADR-018).
  Frota recebeu dado biográfico específico (criação do CIE em 1967, comando do
  I Exército 1972–1974), conforme item 12 da Seção A.
- **4 fontes por ficha**: §8 (p.844), §15 (p.846 — inclusão explícita dos
  ministérios militares), item numerado (pp. 848–849) e §14-15 (p.846 —
  cadeia de comando). Diferença do 1º sublote: inclui §15 como fonte separada
  para explicitar o enquadramento dos ministros.
- **Ingestão**: `06_semear_curadoria.py`, exit 0. Todos como **`rascunho`**.
  Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 18 → **24** (todos como `rascunho`).
- **Próximos sublotes**: Marinha (7) e Aeronáutica (5).

## 2026-06-22 — Lote Dirigentes do Regime: ministros da Marinha (3º sublote)

Curadoria a partir do Capítulo 16, Seção A do Relatório da CNV, vol. I
(`fonte_id cc230d2d-c6b6-42bf-8c94-ef2d92194990`), pp. 849–850 (Ministros da
Marinha, itens 15–21).

- **7 figuras** (o item (4) Rademaker já estava no banco como membro da junta):
  ernesto-de-melo-batista, paulo-bosisio, zilmar-campos-de-araripe-macedo,
  adalberto-de-barros-nunes, geraldo-azevedo-henning,
  maximiano-eduardo-da-silva-fonseca, alfredo-karam.
- **Fundamentação e distinção editorial**: idêntica ao 1º e 2º sublotes (ADR-018).
  Alfredo Karam (1924–) é o único desta série sem ano de morte registrado; grafia
  "1924–" no texto_md. Maximiano com "1919–1998" no texto_md (trecho-fonte
  preserva abreviação "1919-98" da CNV).
- **4 fontes por ficha**: §8 (p.844), §15 (p.846), item numerado (pp. 849–850)
  e §14-15 (p.846).
- **Ingestão**: `06_semear_curadoria.py`, exit 0. Todos como **`rascunho`**.
  Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 24 → **31** (todos como `rascunho`).
- **Próximo sublote**: Aeronáutica (5).

## 2026-06-22 — Lote Dirigentes do Regime: ministros da Aeronáutica (4º sublote)

Curadoria a partir do Capítulo 16, Seção A do Relatório da CNV, vol. I
(`fonte_id cc230d2d-c6b6-42bf-8c94-ef2d92194990`), p. 850 (Ministros da
Aeronáutica, itens 22–26).

- **5 figuras** (o item (5) Márcio de Souza e Mello já estava no banco como
  membro da junta):
  francisco-de-assis-correa-de-mello, nelson-freire-lavenere-wanderley,
  eduardo-gomes, joelmir-campos-de-araripe-macedo, delio-jardim-de-mattos.
- **Fundamentação e distinção editorial**: idêntica aos sublotes anteriores
  (ADR-018). Francisco de Assis Corrêa de Mello recebeu dado biográfico
  específico (ministro também no governo JK, 1957–1961), apenas como
  contextualização, não como enquadramento de responsabilidade.
- **4 fontes por ficha**: §8 (p.844), §15 (p.846), item numerado (p.850)
  e §14-15 (p.846).
- **Ingestão**: `06_semear_curadoria.py`, exit 0. Todos como **`rascunho`**.
  Marcadores: `[]`.
- **Resultado**: perpetradores no banco: 31 → **36** (todos como `rascunho`).
- **Seção A completa**: 26 figuras registradas (8 presidentes/junta + 6
  ministros do Exército + 7 ministros da Marinha + 5 ministros da Aeronáutica).

---

## 2026-06-22 — Lote Rio Grande do Sul (CEV-RS, 1º lote)

Curadoria a partir do Relatório Final da Subcomissão da Memória, Verdade e Justiça da
AL-RS (2017, `fonte_id 98a23e6e-9cf1-428b-9f40-4ac89eb76859`). Auditoria completa em
`docs/auditorias/novas-biografias-rs-cevrs.md`.

- **14 vítimas** (Anexo II): edmur-pericles-camargo, onofre-ilha-dornelles, edu-barreto-leite,
  manoel-custodio-martins, darcy-jose-dos-santos-mariante, leopoldo-chiapetti,
  elvaristo-alves-da-silva, avelmar-moreira-de-barros, angelo-cardoso-da-silva,
  ari-de-abreu-lima-da-rosa, joaquim-alencar-de-seixas, cilon-da-cunha-brum, e os
  argentinos jorge-oscar-adur e lorenzo-ismael-vinas (Operação Condor, desaparecidos a
  partir de Uruguaiana/RS).
- **2 perpetradores** (Anexo IV / Cap. I): attila-rohrsetzer (major, 1º diretor da DCI/RS) e
  pedro-seelig (delegado do DOPS/RS). Sem ficha de organização do RS no banco → vínculo
  descrito em prosa, array `organizacoes` omitido.
- **1 evento georreferenciado:** "DOPS/RS e o sistema de tortura em Porto Alegre nos anos de
  chumbo" (operacao_repressiva, Point em PoA), vinculando 3 vítimas (angelo, avelmar, ari).
  Como `data` é NOT NULL, usou-se o marco do AI-5 (13/12/1968) com ressalva na nota.
- **Execução por sessão:** o agente curador-historiador redigiu 9 vítimas antes de ser
  cortado pelo limite de sessão; as 5 vítimas restantes + 2 perpetradores + evento foram
  redigidos na sessão principal a partir do mesmo extrato-fonte (páginas 119–145 e contexto
  44–105). Tudo conferido página a página.
- **Correções:** 1 JSON do curador (cilon) com aspas internas não escapadas; 1 citação de
  Seelig com página errada (144→24, Cap. I).
- **Ingestão:** `06_semear_curadoria.py` (upsert idempotente), exit 0, sem erros — tudo como
  **`rascunho`** (aguarda revisão do Yuri para promover a `publicada`).
- **Naturalidades no mapa** (`10_preencher_naturalidades.py`): inicialmente 10
  geocodificadas. Não geocodificavam: 2 estrangeiros (sem `pais_natal`), **Itapuã/RS**
  (distrito de Viamão, sem código IBGE) e **Ibirama "(RS)"** (a fonte grafa RS, mas Ibirama
  é de SC).
- **Resultado no banco:** vítimas 104→**118**; perpetradores 8→**10**; com ponto de cidade
  natal 63→**73**; +1 evento no RS.

**Atualização 2026-06-22 (revisão e fechamento do lote):**
- **Ibirama "(RS)" → Ibarama/RS (decidido pelo Yuri):** existe o município gaúcho de
  **Ibarama** (RS), grafia que difere de "Ibirama" por uma letra. Tratado como erro de
  digitação no nome; preservada a UF da fonte (RS); naturalidade corrigida para
  **Ibarama/RS** com nota de transparência. Elvaristo passa a geocodificar → **11/14**
  vítimas com ponto natal.
- **Promoção a `publicada`:** lote RS (16 fichas + evento) promovido após revisão de
  conformidade.
- **Fichas de organização DOPS/RS e DCI** criadas com `tipo=organizacao` e vínculos
  `pessoa_organizacoes` (Seelig→DOPS/RS, Rohrsetzer→DCI).
