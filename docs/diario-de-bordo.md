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
