# Contrato de API — Memória e Verdade (v0.1, rascunho para a Fase 2)

> Os contratos que você trouxe eram do tutorial "EpicTodo" (projetos/PRD/tarefas) — um app de exemplo
> que não tem relação com o seu produto. Este contrato reaproveita a ESTRUTURA boa daquele exemplo
> (escopos, fonte da verdade, tipos compartilhados, processo de mudança) com os endpoints do SEU chatbot.
> Na Fase 2, arquiteto-backend e designer-frontend devem refinar e fechar este documento.

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
- Response: GeoJSON FeatureCollection; cada feature: `{ evento_id, titulo, data, municipio, uf, lat, lng, tipos_crime: [string] }`

### GET /api/eventos-geo/[id]
- Response: `EventoGeo` completo, incluindo o bloco `justica`.

## Tipos compartilhados (lib/shared/tipos.ts)
```ts
Mensagem   = { papel: "usuario" | "assistente", conteudo: string }
Citacao    = { n: number, fonte_id, titulo, autor_orgao, tipo_fonte, data_documento?,
               paginas?, trecho: string, url_origem, nota_contexto? }
BiografiaResumo = { slug, nome, tipo, resumo_1_linha, municipio?, uf? }
Biografia  = BiografiaResumo + { texto_md, fontes: Citacao[], eventos: [evento_id], status_curadoria }
EventoGeo  = { evento_id, titulo, data, municipio, uf, lat, lng, descricao_md,
               vitimas: [slug], tipos_crime: [string], fontes: Citacao[], justica: BlocoJustica }
BlocoJustica = { descricao_crimes_md, enquadramento_atual_md, punicao_ocorrida_md,
                 nota_metodologica_md, fontes: Citacao[], revisado_por_humano: boolean }
```

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
