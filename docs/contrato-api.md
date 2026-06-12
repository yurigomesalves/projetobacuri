# Contrato de API — Memória e Verdade (v1.0 — fechado na Fase 2, 11/06/2026)

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
Códigos: ENTRADA_INVALIDA, ACERVO_SEM_RESULTADO, LIMITE_EXCEDIDO, ERRO_INTERNO.

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

### GET /api/biografias?q=&tipo=&cidade=&pagina=
- `tipo`: "vitima" | "organizacao" | "perpetrador" | "local"
- Response: `{ "itens": [BiografiaResumo], "total": number, "pagina": number }`

### GET /api/biografias/[slug]
- Response: `Biografia` completa (com fontes e eventos ligados).

### GET /api/eventos-geo?bbox=&tipo_crime=
- Response: GeoJSON FeatureCollection; `geometry` pode ser **Point** (casos individuais) ou **Polygon/MultiPolygon** (territórios — ADR-003); properties de cada feature: `{ evento_id, titulo, data, municipio, uf, tipos_crime: [string] }`
- Eventos com `tipo_crime` = `violencia_contra_povos_indigenas` formam camada própria no mapa, que o usuário liga/desliga (ADR-003); o frontend separa as camadas pelo `tipo_crime`, sem campo extra.

### GET /api/eventos-geo/[id]
- Response: `EventoGeo` completo, incluindo o bloco `justica`.

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
               marcadores: Marcador[], fontes: Citacao[], justica: BlocoJustica }
BlocoJustica = { descricao_crimes_md, enquadramento_atual_md, punicao_ocorrida_md,
                 nota_metodologica_md, fontes: Citacao[], revisado_por_humano: boolean }
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
