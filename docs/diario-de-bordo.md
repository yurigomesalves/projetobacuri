# Diário de Bordo — Memória e Verdade

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
