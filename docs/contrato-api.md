# Contrato de API — Memória e Verdade (v1.2 — biografias e mapa, Fase 6, 12/06/2026)

> Fechado na Fase 2 (Análise/Contrato) a partir do rascunho v0.1, incorporando as
> pendências dos ADRs 001, 003 e 005 (ver `docs/decisoes.md`) e alinhando os tipos ao
> que a função `buscar_chunks` (migrações 0001/0002) realmente devolve. Por economia de
> tokens, o refinamento foi feito na sessão principal (edição pequena de um único
> documento), e não por subagentes. Mudanças futuras: primeiro aqui, depois no código.

## Regras gerais (valem para todos os agentes)
- Carregar e seguir o CLAUDE.md do projeto.
- Este arquivo é a fonte da verdade. Mudança no contrato: primeiro aqui, depois no código.
- Escopos: frontend → `app/` (páginas, componentes), `lib/client/`; backend → `app/api/`, `lib/server/`, `supabase/`.
- Na fase de Análise, NÃO modificar código de aplicação — apenas este documento.

## Formato de erro (todas as rotas)
```json
{ "erro": { "codigo": "ACERVO_SEM_RESULTADO", "mensagem": "texto legível em pt-BR" } }
```
Códigos: ENTRADA_INVALIDA, ACERVO_SEM_RESULTADO, LIMITE_EXCEDIDO, ERRO_INTERNO, NAO_AUTORIZADO (HTTP 401, rotas de curadoria).

## Endpoints

### POST /api/chat
Pergunta do usuário → resposta com citações.
- Request: `{ "mensagem": string (3..1000 chars), "historico"?: Mensagem[] (máx. 6) }`
- Response 200:
```json
{
  "resposta": "texto em markdown com marcadores [1], [2]...",
  "citacoes": [Citacao],
  "sugestoes_pesquisa": ["string"],
  "interacao_id": "uuid"
}
```
- Se a busca não atingir o limiar de relevância: 200 com `citacoes: []` e resposta honesta padrão (não há base documental + sugestões). **Nunca** resposta factual sem citação.
- **Fluxo interno (RAG)**: embedding da pergunta gerado no próprio servidor Next.js (Transformers.js em Node, `intfloat/multilingual-e5-small`, mesmo modelo da indexação — ADR-007; a Edge Function do free tier do Supabase não comporta o modelo) → RPC `buscar_chunks` (limiar 0.82 — migração 0004; até 8 trechos — valores padrão da função; ajustes mudam primeiro a migração) → LLM de geração definido por `LLM_PROVIDER` (padrão Groq; trocável por OpenRouter/Ollama sem mudar o contrato).
- O prompt do LLM recebe `tipo_chunk`, `confiabilidade` e `nota_contexto` de cada trecho e a resposta preserva os marcadores `[n]` na ordem de `citacoes`.

### POST /api/feedback
- Request: `{ "interacao_id": uuid, "classificacao": "util" | "incompleta" | "incorreta", "resposta_alternativa"?: string (até 3000), "fontes_sugeridas"?: string }`
- Response 201: `{ "status": "recebido_para_curadoria" }`
- Feedback NUNCA altera o acervo automaticamente: entra na fila de curadoria humana (tabela `feedbacks`, status pendente/aceito/recusado — transparência editorial).

### GET /api/curadoria/feedbacks?status=&pagina= (protegida — Fase 4)
Fila de curadoria humana dos feedbacks. **Autenticação obrigatória**: header
`Authorization: Bearer <senha>`, comparada de forma timing-safe com a variável de
ambiente `CURADORIA_SENHA` (sem ela configurada, a rota responde 401 sempre). Sem o
header ou com senha errada: 401 `NAO_AUTORIZADO`.
- `status`: "pendente" (padrão) | "aceito" | "recusado"
- Response 200: `{ "itens": [FeedbackCuradoria], "total": number, "pagina": number }`
- Cada item traz a interação associada (pergunta, resposta, citações) para o curador
  julgar com contexto.

### PATCH /api/curadoria/feedbacks/[id] (protegida — Fase 4)
Decisão de curadoria sobre um feedback. Mesma autenticação acima.
- Request: `{ "decisao": "aceito" | "recusado", "justificativa": string (10..2000) }`
- A `justificativa` é **obrigatória e pública** (exibida em /api/transparencia) —
  transparência editorial também nas recusas.
- Response 200: `FeedbackCuradoria` atualizado (status, justificativa, decidido_em).
- Feedback já decidido não pode ser redecidido: 409 `ENTRADA_INVALIDA` ("feedback já
  decidido"). Correção de decisão errada: só direto no banco, com registro no diário.

### GET /api/transparencia?pagina= (pública — Fase 4)
Lista os feedbacks **já decididos** (aceitos e recusados), do mais recente ao mais
antigo. Feedbacks pendentes NUNCA aparecem — publicação só após revisão humana, que
também confere se o conteúdo enviado não contém dados pessoais (LGPD; o formulário não
coleta nenhum, mas o usuário pode digitá-los livremente).
- Response 200: `{ "itens": [ItemTransparencia], "total": number, "pagina": number }`

### GET /api/biografias?q=&tipo=&cidade=&pagina= (Fase 6)
- `tipo`: "vitima" | "organizacao" | "perpetrador" | "local"
- `q`: busca por nome (sem distinção de maiúsculas/acentos quando possível).
- Response: `{ "itens": [BiografiaResumo], "total": number, "pagina": number }`
- Serve **apenas** biografias com `status_curadoria = "publicada"` — conteúdo em
  rascunho nunca aparece na API (transparência: publicação só após revisão humana).

### GET /api/biografias/[slug] (Fase 6)
- Response: `Biografia` completa (com fontes e eventos ligados). Mesma regra:
  só `status_curadoria = "publicada"`; caso contrário 404 `ACERVO_SEM_RESULTADO`.

### GET /api/eventos-geo?bbox=&tipo_crime= (Fase 6)
- Response: GeoJSON FeatureCollection; `geometry` pode ser **Point** (casos individuais) ou **Polygon/MultiPolygon** (territórios — ADR-003); properties de cada feature: `{ evento_id, titulo, data, municipio, uf, tipos_crime: [string] }`
- Eventos com `tipo_crime` = `violencia_contra_povos_indigenas` formam camada própria no mapa, que o usuário liga/desliga (ADR-003); o frontend separa as camadas pelo `tipo_crime`, sem campo extra.
- `bbox` = `oeste,sul,leste,norte` (graus decimais). O filtro é aplicado **no
  servidor Next.js**, sem PostGIS: a geometria fica em coluna jsonb e o acervo é
  pequeno (dezenas de eventos) — decisão registrada na Fase 6; migrar para
  PostGIS só se o volume justificar.

### GET /api/eventos-geo/[id] (Fase 6)
- Response: `EventoGeo` completo. O bloco `justica` é **opcional**: só é servido
  quando `revisado_por_humano = true` (salvaguarda do módulo crimes e justiça,
  abaixo); até a Fase 7, vem omitido.

## Tipos compartilhados (lib/shared/tipos.ts)
```ts
Mensagem   = { papel: "usuario" | "assistente", conteudo: string }
Citacao    = { n: number, fonte_id, titulo, autor_orgao, tipo_fonte, confiabilidade,
               data_documento?, paginas?, secao?, trecho: string, url_origem,
               nota_contexto?, tipo_chunk: "corpo" | "nota_rodape" }
Marcador   = { marcador: string, fonte: Citacao }   // ADR-001: marcador sempre com fonte, nunca por inferência
BiografiaResumo = { slug, nome, tipo, resumo_1_linha, municipio?, uf? }
Biografia  = BiografiaResumo + { texto_md, marcadores: Marcador[], fontes: Citacao[],
               eventos: [evento_id], status_curadoria }
EventoGeo  = { evento_id, titulo, data, municipio, uf,
               geometria: GeoJSON.Point | GeoJSON.Polygon | GeoJSON.MultiPolygon, // ADR-003
               descricao_md, vitimas: [slug], tipos_crime: [string],
               marcadores: Marcador[], fontes: Citacao[], justica?: BlocoJustica }
               // justica omitido até revisado_por_humano = true (Fase 7)
BlocoJustica = { descricao_crimes_md, enquadramento_atual_md, punicao_ocorrida_md,
                 nota_metodologica_md, fontes: Citacao[], revisado_por_humano: boolean }
// Fase 4 — curadoria e transparência
FeedbackCuradoria = { feedback_id, classificacao, resposta_alternativa?, fontes_sugeridas?,
                      status: "pendente" | "aceito" | "recusado", justificativa_decisao?,
                      criado_em, decidido_em?,
                      interacao: { interacao_id, pergunta, resposta, citacoes: Citacao[] } }
ItemTransparencia = { feedback_id, pergunta, classificacao, resposta_alternativa?,
                      fontes_sugeridas?, status: "aceito" | "recusado",
                      justificativa_decisao, criado_em, decidido_em }
```

## Obrigações de exibição das citações (frontend)
Toda `Citacao` renderizada deve mostrar: título, autor/órgão, página(s) e link (`url_origem`) — princípio 3. Além disso:
- `tipo_chunk = "nota_rodape"` → selo visível "nota de rodapé" junto à citação (ADR-005).
- `nota_contexto` presente → exibida junto à citação (obrigatória no banco para imprensa da época e documentos da repressão — o leitor precisa do aviso de contexto).
- `marcadores` de biografias/eventos → cada marcador exibido com sua fonte (ADR-001).

## ⚠️ Módulo "crimes e justiça" — salvaguarda obrigatória
A comparação entre os crimes da ditadura e o direito brasileiro atual (tipificação no Código Penal vigente, imprescritibilidade de crimes contra a humanidade, Lei da Anistia e a ADPF 153, decisões da Corte Interamericana como o caso Gomes Lund) é conteúdo **jurídico sensível**:
1. TODO `BlocoJustica` é redigido/revisado por humano (você, idealmente com apoio de pesquisador do Direito da UFU) antes de publicar — o campo `revisado_por_humano` deve ser `true` para a API servir o bloco; conteúdo gerado por IA não publicado direto, nunca.
2. Cada afirmação jurídica cita a norma (artigo de lei) ou a decisão exata.
3. `nota_metodologica_md` fixa em toda página: trata-se de material educativo de análise histórica comparada, não de parecer jurídico nem acusação formal; menções a perpetradores seguem estritamente o Relatório da CNV e decisões judiciais citadas.
Isso protege o projeto (e você) juridicamente e é coerente com o princípio 1 (transparência).

## Convenções
- JSON em snake_case; datas ISO 8601; idioma pt-BR.
- Paginação: `pagina` (1-based), 20 itens por página.
- Rotas públicas com rate limit (sugestão inicial: 20 req/min/IP no chat).
