# Contrato de API — Projeto Bacuri (v1.7 — recuperação rastreável experimental, ADR-031, 14/09/2026)

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
- Request: `{ "mensagem": string (3..1000 chars), "historico"?: Mensagem[] (máx. 6), "continuidade"?: { "token": string (máx. 2048 chars) } }`
- Response 200:
```json
{
  "resumo": "síntese didática de 2–3 frases, sem marcadores",
  "resposta": "texto em markdown com marcadores [1], [2]...",
  "citacoes": [Citacao],
  "sugestoes_pesquisa": ["string"],
  "interacao_id": "uuid",
  "token_continuidade": "string opcional"
}
```
- `token_continuidade`: referência opaca, assinada pelo servidor e válida por 30
  minutos. É emitida somente quando a resposta possui citações e a variável secreta
  `CONTINUIDADE_TOKEN_SECRET` está configurada. Contém versão, emissão, expiração,
  nonce e no máximo oito `fonte_id`; não contém pergunta, resposta, IP ou identidade.
  O cliente a mantém apenas em memória e a envia somente no seguimento da resposta
  imediatamente anterior. Token ausente, inválido, expirado ou adulterado é ignorado
  e a busca geral continua, sem revelar detalhes de validação. O token não autoriza
  leitura de interações e não prova aprovação editorial das fontes citadas.
- `resumo`: síntese didática (2–3 frases) exibida **antes** da resposta completa, em linguagem acessível. Gerado na mesma chamada ao LLM (economia de tokens): o modelo devolve `RESUMO\n---\nRESPOSTA`, e o servidor separa no primeiro `---`. Plano B (modelo não seguiu o formato): `resumo: ""` e a resposta completa preservada inteira. **Salvaguarda editorial (curador, Princípio 3)**: o resumo não traz marcadores `[n]` nem afirma nada além do que a resposta citada sustenta; é sempre exibido junto da resposta completa e da lista de fontes, nunca isolado. Recurso futuro de copiar/compartilhar só o resumo reabre essa análise (aí o resumo teria de levar as fontes junto).
- Se a busca não atingir o limiar de relevância: 200 com `citacoes: []`, `resumo: ""` e resposta honesta padrão (não há base documental + sugestões). **Nunca** resposta factual sem citação.
- Se a parte candidata a resumo contiver marcadores numéricos `[n]`, o formato é inválido: aplica-se o plano B (`resumo: ""`, texto integral como resposta), preservando afirmações e referências. A normalização de citações ocorre sobre esse texto integral; não se apagam marcadores para transformar o preâmbulo em resumo e não se gera outra resposta paga.
- **Fluxo interno (RAG)**: antes da busca, pedidos explícitos de contato pessoal,
  ordens para fabricar citação e referências sem antecedente no histórico recebem
  resposta segura determinística, com `citacoes: []`, sem enviar trechos ao LLM. Nas
  continuações com referente dependente do histórico, o embedding combina a última
  pergunta do usuário com a mensagem atual; respostas anteriores do assistente não
  entram na consulta de recuperação. Nos demais casos, o embedding usa apenas a
  pergunta atual. O embedding é gerado no servidor Next.js (Transformers.js em Node,
  `intfloat/multilingual-e5-small`, mesmo modelo da indexação — ADR-007) → RPC
  `buscar_chunks` (limiar 0.82; até 8 trechos) → LLM definido por `LLM_PROVIDER`.
- Quando a pergunta depende do histórico, não declara mudança explícita de assunto e
  traz token válido, o servidor também chama a RPC restrita
  `buscar_chunks_textuais_por_fontes` com até oito fontes e quatro candidatos por
  fonte. Candidatos textuais precisam conter ao menos dois termos substantivos
  distintos da consulta contextual. Os candidatos são ordenados pela relevância
  textual, deduplicados por `chunk_id` e intercalados com a lista vetorial, começando
  pela vetorial, até oito trechos; faltas de um ramo são preenchidas pelo outro.
  Escores textual e vetorial não são somados nem comparados. Os metadados completos
  dos candidatos textuais são recarregados antes do prompt. Este é um parâmetro
  experimental congelado para os casos de desenvolvimento CF01–CF06; promoção ao
  produto exige lote independente posterior.
- Telefones pessoais e endereços de e-mail encontrados no corpo dos documentos são
  substituídos por `[contato pessoal omitido]` antes de montar o prompt, a resposta e
  o trecho público da citação. A URL bibliográfica da fonte permanece disponível.
- O prompt do LLM recebe `tipo_chunk`, `confiabilidade` e `nota_contexto` de cada trecho e a resposta preserva os marcadores `[n]` na ordem de `citacoes`.
- A geração principal do chat tem teto de 4.096 tokens de saída; a orientação pede resumo de 2–3 frases e resposta concisa de até seis parágrafos. Esse teto não altera o prazo compartilhado de 20 segundos nem ativa etapas experimentais ou repetição de geração truncada.
- Regra editorial de escopo e atribuição: não deduzir competências ou práticas institucionais de perfis individuais, notas bibliográficas ou menções a processos; preservar sujeito e alcance do trecho. Recomendações, conclusões e ações devem identificar na mesma frase o órgão, autor ou depoente responsável, sem transferir afirmações entre instituições. Distinguir testemunho, análise e documento oficial. Alegações sensíveis por fonte intermediária exigem cadeia de atribuição e caráter indireto explícitos; omitir detalhes sem atribuição precisa. Instrução revisada pelo curador em 2026-10-05; não constitui verificação automática de sustentação histórica.
- Após a verificação opcional, o servidor mantém na lista pública apenas as citações usadas na resposta completa e renumera conjuntamente os marcadores e a lista, preservando a identidade e os metadados das fontes. Persistência e continuidade usam essa lista final. Uma geração sem marcador válido, com referência numérica desconhecida ou interrompida pelo limite de tokens (`finish_reason: length`) retorna 500 `ERRO_INTERNO`, sem registro de resposta factual; não representa lacuna do acervo. Não há repetição paga automática para completar texto truncado. Recusas determinísticas e ausência de resultados mantêm suas respostas 200 sem citações. Esta validação estrutural não comprova a sustentação histórica das afirmações.
- **Recuperação rastreável (experimental, desligada por padrão):** quando
  `RAG_RECUPERACAO_EXPERIMENTAL=1`, o servidor obtém até 50 candidatos vetoriais e
  50 textuais, preservando internamente a origem e as posições dos ramos. A fusão
  usa RRF com parâmetros configurados; até oito fontes prováveis recebem busca
  textual adicional, e o token de continuidade é apenas uma preferência. No máximo
  24 candidatos seguem para a ordenação e oito entram no prompt. Esses rastros não
  pertencem à resposta pública nem ao registro de `interacoes`.
- Decomposição, reranqueamento e verificação semântica são etapas experimentais
  opcionais no provedor já configurado. Quando a decomposição estiver ativa,
  os resultados da pergunta original e de até duas subconsultas são intercalados
  por posição, começando pela pergunta original, com deduplicação por `chunk_id`,
  até oito trechos. Listas vazias ou duplicadas não ocupam vagas; a ordem interna
  de cada lista é preservada. Com uma consulta, a seleção permanece igual.
  A verificação opcional avalia conjuntamente resumo e resposta completa contra
  os textos integrais recuperados, com a mesma numeração das citações públicas.
  Reprovação de qualquer parte remove ambas e as citações, retornando a lacuna
  documental prevista; falha operacional do verificador continua retornando
  `null`, sem conferir aprovação semântica. As citações públicas seguem abreviadas.
  Após validar a entrada, o processamento
  compartilha um prazo de 20 segundos entre embedding, recuperação, geração,
  verificação e registro da interação. Esgotamento do prazo retorna 500 com
  `ERRO_INTERNO`, nunca uma declaração de lacuna documental. Operações de rede
  recebem cancelamento; o cálculo compartilhado do embedding pode terminar em
  segundo plano, mas a requisição vencida não inicia geração nem registro.
  Execução local síncrona não é interrompível: se bloquear o event loop,
  o erro só poderá ser enviado ao devolver o controle, com nova conferência
  do relógio antes de aceitar o resultado. Cancelamento de uma gravação já
  enviada não garante desfazer uma transação confirmada pelo banco.
  Diagnóstico opcional `RAG_METRICAS_TEMPO=1` registra somente etapa, duração,
  sucesso/falha, identificador aleatório da instância e ordem da requisição
  naquela instância. Não registra pergunta, resposta, fontes ou credenciais,
  não altera o JSON público e não amplia o prazo. A duração no servidor começa
  após validação; a medição externa inclui inicialização e transporte.
  No build Vercel, o modelo `Xenova/multilingual-e5-small` é preparado na revisão
  `761b726dd34fb83930e26aab4e9ac3899aa1fa78` e incluído somente na função de chat.
  A consulta usa CPU/fp32, os mesmos prefixo `query:`, pooling mean e normalização;
  muda apenas a origem dos arquivos, eliminando download no primeiro pedido.
  Na Vercel, arquivos ausentes causam erro técnico, sem fallback para download.
  Os pesos gerados ficam fora do Git. Preparação local: `npm run preparar:embedding`.
  Falha de etapa opcional retorna à ordenação determinística, sem repetição automática.
- Falha da RPC RRF experimental retorna à busca vetorial de controle, preservando
  as regras de continuidade e o prazo restante. O diagnóstico interno registra
  a falha e a estratégia efetivamente utilizada; se o controle também falhar,
  a rota retorna o erro temporário existente. O contrato público não muda.

### POST /api/feedback
- Request: `{ "interacao_id": uuid, "classificacao": "util" | "incompleta" | "incorreta", "resposta_alternativa"?: string (até 3000), "fontes_sugeridas"?: string }`
- Response 201: `{ "status": "recebido_para_curadoria" }`
- Feedback NUNCA altera o acervo automaticamente: entra na fila de curadoria humana (tabela `feedbacks`, status pendente/aceito/recusado — transparência editorial).

## Autenticação da curadoria (Fase 7 — contas individuais)
A senha única compartilhada (`CURADORIA_SENHA`) foi **removida**. O acesso é por **conta
individual** via Supabase Auth (e-mail + senha), criada **somente por convite** (não há
cadastro aberto). As rotas protegidas exigem o header `Authorization: Bearer <access_token>`
(JWT do Supabase Auth, obtido pelo login no navegador). O servidor valida o JWT
(`supabase.auth.getUser`) e confere o papel na tabela `curadores`. Sem token válido ou
sem linha em `curadores`: 401 `NAO_AUTORIZADO`. Rotas marcadas **(admin)** exigem
`papel = 'admin'`; caso contrário 401.

### GET /api/curadoria/eu (protegida)
Identidade do curador autenticado, usada pelo frontend após o login (nome no
cabeçalho; `papel` decide se o painel de convites aparece).
- Response 200: `Curador` (`{ user_id, nome, email, papel }`). Sem token válido: 401.

### GET /api/curadoria/perfil (protegida) · PATCH /api/curadoria/perfil (protegida, multipart)
Perfil público do próprio curador logado (inclui o admin), para completar/editar o
que aparece na Transparência.
- GET → `CuradorPublico` (`{ nome, foto_url?, lattes_url?, organizacao?, sobre? }`).
- PATCH (multipart/form-data): `nome` (2..120), `foto` (File opcional, jpeg/png/webp ≤2 MB),
  `remover_foto` ("1" limpa a foto), `lattes_url` (vazio ou http/https), `organizacao`
  (≤200), `sobre` (≤2000). Campos de texto vazios limpam o valor. Response 200:
  `CuradorPublico` atualizado.

### GET /api/curadoria/feedbacks?status=&pagina= (protegida)
Fila de curadoria humana dos feedbacks. Autenticação acima (qualquer curador).
- `status`: "pendente" (padrão) | "aceito" | "recusado"
- Response 200: `{ "itens": [FeedbackCuradoria], "total": number, "pagina": number }`
- Cada item traz a interação associada (pergunta, resposta, citações) para o curador
  julgar com contexto.

### PATCH /api/curadoria/feedbacks/[id] (protegida)
Decisão de curadoria sobre um feedback. Autenticação acima (qualquer curador).
- Request: `{ "decisao": "aceito" | "recusado", "justificativa": string (10..2000) }`
- A `justificativa` é **obrigatória e pública** (exibida em /api/transparencia) —
  transparência editorial também nas recusas. A autoria (`decidido_por`) é registrada e
  o nome do curador é exibido na transparência.
- Response 200: `FeedbackCuradoria` atualizado (status, justificativa, decidido_em).
- Feedback já decidido não pode ser redecidido: 409 `ENTRADA_INVALIDA` ("feedback já
  decidido"). Correção de decisão errada: só direto no banco, com registro no diário.

### POST /api/curadoria/convites (admin)
Cria um convite e devolve o link a ser enviado manualmente pelo admin (não há envio de
e-mail automático — decisão de projeto).
- Request: `{ "email": string }`
- Response 201: `{ "convite_id", "email", "link", "expira_em" }` (link = `/curadoria/cadastro?token=…`).
- Convite expira em 7 dias. E-mail já cadastrado como curador: 400 `ENTRADA_INVALIDA`.

### GET /api/curadoria/convites (admin)
Lista convites **pendentes** (não usados e não expirados).
- Response 200: `{ "itens": [ConvitePendente] }`

### DELETE /api/curadoria/convites/[id] (admin)
Revoga um convite pendente. Response 200: `{ "status": "revogado" }`.

### GET /api/curadoria/convites/validar?token= (pública)
Valida um token de convite para abrir a tela de cadastro.
- Response 200: `{ "email": string }` se válido (não usado e não expirado).
- Token inexistente/usado/expirado: 404 `ACERVO_SEM_RESULTADO`.

### POST /api/curadoria/cadastro (pública, multipart/form-data)
Conclui o convite: cria a conta no Supabase Auth e o perfil do curador. Campos:
`token` (obrigatório), `nome` (obrigatório), `senha` (obrigatória, mín. 8), `foto`
(arquivo opcional: jpeg/png/webp, ≤ 2 MB), `lattes_url`, `organizacao`, `sobre`
(opcionais). O perfil é **público** (exibido na transparência) — o formulário avisa.
- Response 201: `{ "status": "cadastrado" }`. Token inválido: 404. Validação: 400.

### GET /api/curadoria/curadores (admin)
Lista os curadores cadastrados (para o painel do admin).
- Response 200: `{ "itens": [CuradorPublico & { email, papel }] }`

### GET /api/transparencia?pagina= (pública)
Lista os feedbacks **já decididos** (aceitos e recusados), do mais recente ao mais
antigo. Feedbacks pendentes NUNCA aparecem — publicação só após revisão humana, que
também confere se o conteúdo enviado não contém dados pessoais (LGPD; o formulário não
coleta nenhum, mas o usuário pode digitá-los livremente). Cada item traz o nome do
curador que decidiu (`decidido_por_nome`), quando disponível.
- Response 200: `{ "itens": [ItemTransparencia], "total": number, "pagina": number }`

### GET /api/transparencia/curadores (pública)
Perfis públicos dos curadores para o bloco "Quem faz a curadoria".
- Response 200: `{ "itens": [CuradorPublico] }`

### GET /api/biografias?q=&tipo=&cidade=&uf_natal=&periodo_de=&periodo_ate=&organizacao=&pagina= (Fase 6 · filtros ADR-016)
- `tipo`: "vitima" | "organizacao" | "perpetrador" | "local"
- `q`: busca por nome (sem distinção de maiúsculas/acentos quando possível).
- `cidade`: filtra por `municipio` (local do crime/atuação — campo já existente).
- `uf_natal`: filtra pela UF de **naturalidade** (município de nascimento — ADR-016,
  decisão 1), distinta de `cidade`/`municipio`. Biografias sem naturalidade conhecida
  (`uf_natal = NULL`) ficam fora quando o filtro é aplicado.
- `periodo_de` / `periodo_ate`: recorte pelo **período de atuação/perseguição
  documentado** (`data_inicio`/`data_fim` — ADR-016, decisão 2; rótulo de interface
  "Período de atuação / perseguição"). Aceitam ano (`YYYY`) ou data ISO (`YYYY-MM-DD`);
  ano vira `YYYY-01-01` (em `periodo_de`) e `YYYY-12-31` (em `periodo_ate`). O filtro é
  por **interseção de intervalos**: inclui a biografia cujo período se sobrepõe à janela
  pedida, tratando extremos `NULL` como "sem limite nesse extremo". Não confundir com
  datas de nascimento/morte.
- `organizacao`: `slug` de uma biografia com `tipo = "organizacao"`; devolve as pessoas
  com **vínculo documentado** a ela (`pessoa_organizacoes` — ADR-016, decisão 3).
- Todos os filtros são **opcionais e aditivos** (combináveis por E lógico); sem nenhum, a
  lista abre com tudo. Valores possíveis e contagens vêm de `GET /api/biografias/facetas`.
- Response: `{ "itens": [BiografiaResumo], "total": number, "pagina": number }`
- Serve **apenas** biografias com `status_curadoria = "publicada"` — conteúdo em
  rascunho nunca aparece na API (transparência: publicação só após revisão humana).

### GET /api/biografias/facetas?tipo= (Fase 6 · ADR-016)
Opções e contagens para montar os filtros de "Nomes e Histórias", calculadas **somente
sobre biografias publicadas**. `tipo` (opcional) restringe as facetas a um tipo.
- Response 200:
```json
{
  "tipos":        [{ "valor": "vitima", "total": 0 }],
  "ufs_natais":   [{ "uf": "PE", "total": 0 }],
  "organizacoes": [{ "slug": "ap-acao-popular", "nome": "Ação Popular", "total": 0 }],
  "periodo":      { "min": "1964-01-01", "max": "1985-12-31" }
}
```
- `total` em cada faceta = nº de biografias publicadas que casam aquele valor (para a UI
  exibir contagens e ocultar opções vazias). `periodo.min`/`max` delimitam a régua do
  filtro de período; ambos podem ser `null` se nenhuma ficha tiver período preenchido.
- `organizacoes` lista apenas organizações que têm ao menos um vínculo publicado.

### GET /api/biografias/[slug] (Fase 6)
- Response: `Biografia` completa (com fontes e eventos ligados). Mesma regra:
  só `status_curadoria = "publicada"`; caso contrário 404 `ACERVO_SEM_RESULTADO`.

### GET /api/eventos-geo?bbox=&tipo_crime=&periodo_de=&periodo_ate= (Fase 6 · período ADR-016)
- Response: GeoJSON FeatureCollection; `geometry` pode ser **Point** (casos individuais) ou **Polygon/MultiPolygon** (territórios — ADR-003); properties de cada feature: `{ evento_id, titulo, data, municipio, uf, tipos_crime: [string] }`
- Eventos com `tipo_crime` = `violencia_contra_povos_indigenas` formam camada própria no mapa, que o usuário liga/desliga (ADR-003); o frontend separa as camadas pelo `tipo_crime`, sem campo extra.
- `periodo_de` / `periodo_ate`: recorte temporal pela `data` do evento (ano `YYYY` ou data
  ISO; ano vira início/fim do ano como em `/api/biografias`). Opcionais e aditivos.
- `bbox` = `oeste,sul,leste,norte` (graus decimais). O filtro é aplicado **no
  servidor Next.js**, sem PostGIS: a geometria fica em coluna jsonb e o acervo é
  pequeno (dezenas de eventos) — decisão registrada na Fase 6; migrar para
  PostGIS só se o volume justificar.

### GET /api/naturalidades?bbox= (Fase 6 · camada de origem, ADR-016 decisão 4)
Camada cartográfica **separada** da de eventos: a cidade **natal** das vítimas com ficha
publicada e naturalidade conhecida. **Desligada por padrão** no mapa (que abre nos locais
de repressão, informação primária); o usuário a ativa por escolha.
- Response: GeoJSON FeatureCollection de **Point** (sede do município natal, nunca endereço
  preciso); properties: `{ slug, nome, municipio_natal, uf_natal }`.
- Só vítimas (`tipo = "vitima"`) publicadas com `lat_natal`/`lng_natal` preenchidos;
  fichas sem naturalidade documentada não entram (ADR-016: não inferir).
- `bbox` opcional, mesma semântica de `/api/eventos-geo`.
- O frontend identifica cada ponto como "cidade natal de [nome] — origem da vítima, não o
  local do crime" (tooltip definido na ADR-016).

### GET /api/territorios-origem?bbox= (ADR-019 · camada de território de origem)
Camada cartográfica **separada** das demais: o **território do povo indígena** ao qual
a vítima pertence, segundo fonte documental. **Desligada por padrão** no mapa.
- Response: GeoJSON FeatureCollection de **Polygon ou MultiPolygon**; properties de
  cada feature: `{ slug, nome, povo_origem, terra_indigena_nome, aproximado: true }`.
- Só vítimas (`tipo = "vitima"`) publicadas com `povo_origem IS NOT NULL`.
- **Via A** (TI oficial): `terra_indigena_codigo` preenchido → geometria vem de
  `terras_indigenas.geometria` (JOIN). Properties incluem `terra_indigena_nome`.
- **Via B** (fallback circular): `geometria_origem_ponto` + `geometria_origem_raio_km`
  → o servidor gera um polígono circular (64 vértices) a partir do ponto [lng, lat]
  e do raio em km.
- Vítimas com `povo_origem` mas sem área em nenhuma via (só povo, sem TI/fallback)
  **não entram** na FeatureCollection (não há geometria para plotar).
- `bbox` opcional, mesma semântica de `/api/eventos-geo` (filtro no servidor Next.js,
  aplicado sobre o centróide aproximado do polígono).
- **Ressalva obrigatória no tooltip** (ADR-019): "Território de origem do povo [povo]
  — referência geográfica aproximada e contemporânea (limites da Terra Indígena hoje),
  não o local exato de nascimento nem o limite oficial do território em 1964–1985."

### GET /api/eventos-geo/[id] (Fase 6)
- Response: `EventoGeo` completo. O bloco `justica` é **opcional**: só é servido
  quando `revisado_por_humano = true` (salvaguarda do módulo crimes e justiça,
  abaixo); o módulo foi adiado por decisão editorial (ADR-009), então o bloco
  vem omitido até decisão futura.

## Tipos compartilhados (lib/shared/tipos.ts)
`tipo_fonte` segue o vocabulário de `docs/taxonomia.md`, incluindo
`compilacao_documental` (05/10/2026): obra com responsabilidade editorial
identificada que reúne e contextualiza registros de proveniências diversas.
O campo permanece uma string; o novo valor não altera o formato das respostas.
Essa categoria exige nota de contexto e crítica da autoria e do alcance de cada
trecho, sem transformar as peças reunidas em relatório oficial.

```ts
Mensagem   = { papel: "usuario" | "assistente", conteudo: string }
Citacao    = { n: number, fonte_id, titulo, autor_orgao, tipo_fonte, confiabilidade,
               data_documento?, paginas?, secao?, trecho: string, url_origem,
               nota_contexto?, tipo_chunk: "corpo" | "nota_rodape" }
Marcador   = { marcador: string, fonte: Citacao }   // ADR-001: marcador sempre com fonte, nunca por inferência
BiografiaResumo = { slug, nome, tipo, resumo_1_linha, municipio?, uf?,
               // ADR-016: naturalidade (município de nascimento) e período de
               // atuação/perseguição documentado — distintos de municipio/uf (local
               // do crime) e de datas de nascimento/morte. Ausentes → omitidos.
               municipio_natal?, uf_natal?, data_inicio?, data_fim? }
Biografia  = BiografiaResumo + { texto_md, marcadores: Marcador[], fontes: Citacao[],
               eventos: [evento_id], status_curadoria,
               lat_natal?, lng_natal?,           // sede do município natal (ADR-016)
               organizacoes: VinculoOrganizacao[] }  // vínculos documentados (ADR-016)
// ADR-016 decisão 3: vínculo só com fonte identificada e independente do aparato
// repressivo (ou, se de doc. de inteligência, corroborada). fonte_id sempre presente.
VinculoOrganizacao = { organizacao_slug, organizacao_nome, nota_vinculo?, fonte: Citacao }
// nota_vinculo obrigatória quando a pessoa é perpetrador (vínculo a órgão repressivo)
// Entrada de curadoria (ADR-017): bloco opcional "organizacoes" na biografia JSON —
//   [{ slug (de uma biografia tipo=organizacao), fonte_id, paginas, trecho, secao?,
//      nota_vinculo? }] — lido pelo pipeline/06_semear_curadoria.py e gravado em
//   pessoa_organizacoes. A atuação em mais de um estado é representada por vínculos a
//   organizações de UFs distintas (a UF vem da organização).
Faceta     = { valor: string, total: number }
Facetas    = { tipos: Faceta[],
               ufs_natais: { uf: string, total: number }[],
               organizacoes: { slug, nome, total: number }[],
               periodo: { min: string | null, max: string | null } }
EventoGeo  = { evento_id, titulo, data, municipio, uf,
               geometria: GeoJSON.Point | GeoJSON.Polygon | GeoJSON.MultiPolygon, // ADR-003
               descricao_md, vitimas: [slug], tipos_crime: [string],
               marcadores: Marcador[], fontes: Citacao[], justica?: BlocoJustica }
               // justica omitido até revisado_por_humano = true (módulo adiado — ADR-009)
BlocoJustica = { descricao_crimes_md, enquadramento_atual_md, punicao_ocorrida_md,
                 nota_metodologica_md, fontes: Citacao[], revisado_por_humano: boolean }
// Fase 4 — curadoria e transparência
FeedbackCuradoria = { feedback_id, classificacao, resposta_alternativa?, fontes_sugeridas?,
                      status: "pendente" | "aceito" | "recusado", justificativa_decisao?,
                      criado_em, decidido_em?,
                      interacao: { interacao_id, pergunta, resposta, citacoes: Citacao[] } }
ItemTransparencia = { feedback_id, pergunta, classificacao, resposta_alternativa?,
                      fontes_sugeridas?, status: "aceito" | "recusado",
                      justificativa_decisao, criado_em, decidido_em, decidido_por_nome? }
// Fase 7 — contas de curadoria
PapelCurador    = "admin" | "curador"
Curador         = { user_id, nome, email, papel: PapelCurador }   // uso interno (sessão)
CuradorPublico  = { nome, foto_url?, lattes_url?, organizacao?, sobre? }  // vitrine pública
ConvitePendente = { convite_id, email, link, expira_em, criado_em }
RequisicaoConvite = { email }
RespostaConvite   = { convite_id, email, link, expira_em }
ConviteValido     = { email }
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
