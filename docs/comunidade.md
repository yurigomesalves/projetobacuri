# Comunidade BACURI — contrato e regras de implementação

Plano aprovado em 06/10/2026. Cadastro gratuito com e-mail verificado, perfil por
@tag e nome civil opcional. Identidade civil não é verificada. Chat/leitura públicos.
Reutilizar Supabase Auth (login/cadastro/recuperação no cliente). Cadastro público
depende de SMTP e domínio remetente; sem contratação nem publicação automáticas.

## Referências de desenho

Consulta às documentações oficiais em 06/10/2026:

- [Reddit: karma](https://support.reddithelp.com/hc/en-us/articles/204511829-What-is-karma):
  votos influenciam visibilidade e reputação. No BACURI, incorporar ordenação e
  reconhecimento, mas pontuar contribuições verificadas, sem peso adicional de voto.
- [Reddit: manipulação de comunidades](https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities):
  múltiplas contas e automação podem manipular avaliações. Incorporar limites,
  ausência de autovoto e reversão justificada; e-mail confirmado não prova unicidade.
- [Wikipédia: páginas de discussão](https://en.wikipedia.org/wiki/Wikipedia:Talk_page_guidelines):
  discussão focada na melhoria do conteúdo, propostas fundamentadas, autoria e
  preservação de comentários. No BACURI, a unidade é uma resposta do chat, com
  versões imutáveis, sugestões atribuídas e perfil obrigatório.
- [Wikipédia: consenso](https://en.wikipedia.org/wiki/Wikipedia:Consensus):
  argumentos e fontes fundamentam a deliberação. O BACURI usa classificação como
  prioridade de leitura e um colegiado editorial explícito para o veredito;
  os quóruns são decisões próprias do projeto, não regras da Wikipédia.

## API e privacidade

`GET /api/comunidade?recurso=...` e `POST /api/comunidade {acao,dados}`.
GETs: discussoes (q/categoria/ordem/pagina), discussao (id, inclui propostas e
versões, comentários e avaliações agregadas), perfil (tag), eu (perfil, papel,
extrato), notificacoes, curadoria, transparencia, ouro, fontes (q, trechos do acervo).
Somente eu/notificacoes/curadoria exigem login; curadoria exige papel. GET discussao
autenticado pode incluir avaliação própria/assinatura. Listas são paginadas.

Ações: salvar_perfil; encerrar_conta; compartilhar; comentar; editar_comentario;
reconhecer_comentario; propor; revisar_proposta; avaliar; acompanhar;
ler_notificacoes; denunciar; moderar; recorrer; parecer; encaminhar;
candidatar; consentir_candidatura; votar_candidatura; sair_curadoria;
propor_destituicao; votar_destituicao; suspender_ouro; revisar_ouro; organizar.
Complementos: parecer_recurso (moderação com revisores independentes),
defender_destituicao (defesa antes do voto ou após prazo de 7 dias), indexar_ouro
(retentativa de embedding local por curador quando a indexação não concluiu).
Schemas explícitos no servidor, IDs UUID, textos com limites. 400 entrada inválida,
401 sessão inválida, 403 permissão, 404 ausente/oculto, 409 conflito, 429 limite,
503 indisponível. Dados sensíveis e mensagens SQL não retornam ao navegador.

Compartilhar recebe interacao_id/token_compartilhamento/titulo/motivo/categoria e
confirmacao_publicacao=true; o servidor lê pergunta/resumo/resposta/citações.
Comprovante HMAC específico com validade de sete dias e domínio separado da
continuidade; sem conteúdo nem identidade no token. Uma discussão por interação.
Novas interações guardam resumo e proveniência; legadas não recebem token retroativo.
Rascunho só é persistido no dispositivo após ação explícita, com expiração/remoção.

## Discussões e reputação

Categorias: erro_factual, omissao, fontes, interpretacao, clareza. Comentários em
árvore rasa; revisões preservadas. Proposta: texto completo, justificativa,
referências documentais (chunk_ids do acervo) e proposta_origem_id opcional.
Fontes novas podem ser indicadas em `fontes_sugeridas` antes da indexação. Propostas
com fontes externas ficam discutíveis, mas aprovação como ouro exige conferir e
vincular os trechos ao acervo; não fabricar IDs ou ingerir URLs automaticamente.
Sugestões de revisão são comentários; incorporação registra seu ID e autoria.
Somente autor revisa sua proposta; qualquer pessoa pode publicar alternativa.
Nova versão zera a rodada de avaliações; história anterior permanece legível.

Avaliações por versão: apoio, ajustes, sem_fundamento; últimas duas justificadas.
Uma por pessoa, atualizável/removível; sem autovoto. Encaminhamento após 72h,
5 avaliadores e 60% apoio; saldo apoio menos demais ordena, antiguidade desempata.
Curadoria pode antecipar com justificativa. Denúncia sozinha não bloqueia o tópico.

Pontos: +2 por comentário útil reconhecido por 3 terceiros com contas de 7 dias;
+10 por sugestão incorporada por terceiro (uma por proposta); +30 por proposta
aprovada (uma por proposta). Pontos comunitários limitados a 10/dia; eventos únicos,
reversíveis por fraude. Sem pontos por volume/votar/login/concordância com curador.
Níveis: participante; colaborador (20 pontos/7 dias/3 dias de participação);
revisor (100/30/10); referência (300/90/20). Recalcular em atividade/consulta própria;
sem redução por inatividade. Níveis superiores podem organizar etiquetas/relações
com histórico, nunca moderar ou aprovar conteúdo. Sem peso extra de voto.

## Governança

Preservar curadores atuais. Dois pareceres independentes concordantes decidem a
mesma versão. Autor/coautor impedido. Divergência: maioria absoluta dos elegíveis,
no mínimo dois votos concordantes; ausência/empate mantêm pendente. Ajustes exigem
nova versão e novos pareceres. Estado decidido é imutável; recurso gera novo ciclo.
Mudança do colegiado exige recalcular habilitados, não aproveitar voto de removido.

Entrada: indicação de curador, anuência do candidato e aprovação expressa de TODOS
os curadores atuais. Convites antigos não podem mais conferir papel unilateralmente
quando a comunidade estiver ativada. Candidatura permanece pendente sem unanimidade.
Saída voluntária ou destituição por ceil(2/3 dos demais), com defesa e justificativa.
Não destituir/retirar o último curador por comando comum; recuperar administração
exige procedimento manual documentado. Não expirar mandatos automaticamente.

Decisão pública: resultado, síntese sucinta, versão, fontes, data e pareceristas.
Moderação: ocultar/restaurar conteúdo, suspender/restaurar membro, invalidar pontos
fraudulentos, com justificativa e recurso; nunca revelar o conteúdo oculto nas APIs
públicas, notificações ou histórico. Recursos exigem revisores independentes dos
decisores originais; sem revisores, aguardam composição. Não punir divergência histórica
documentada. Não aceitar assédio, dados pessoais indevidos ou falsificação de fontes.

## Ouro e chat

Versão aprovada cria ouro com referências a trechos verificáveis do acervo. Falta
de fonte impede ativação. Somente ouro ativo pode ser recuperado; no máximo dois,
vetor 384 do mesmo modelo do chat e limiar conservador configurável, inicial 0,90.
Conteúdo editorial nunca substitui evidência documental; checar integridade e
disponibilidade dos trechos, delimitar como dados (não instruções), exigir citações.
Não recuperar propostas ou comentários. Proveniência no retorno e na interface.
Respeitar prazo e limite existentes; erro/timeout da camada ouro faz fallback ao
fluxo atual. Flag BACURI_OURO_CHAT_ATIVO=false por padrão até avaliação independente.
Suspensão preventiva por um curador retira imediatamente da busca; reativação e
revogação definitivas exigem novo ciclo com dois pareceres/maioria em divergência.

## Entrega e operação

Fases sequenciais: fundação → comunidade → governança → ouro → avaliação do chat.
Migrações aditivas preparadas localmente; não aplicar em produção sem confirmação.
BACURI_COMUNIDADE_ATIVA=false por padrão até migrações 0034–0037, SMTP e revisão de publicação.
Envio SMTP gratuito (Resend inicialmente), remetente de domínio/subdomínio cedido;
sem domínio hoje. Não habilitar excedentes pagos; facilitar futura troca por SMTP.
Notificações do fórum internas. Contribuições: aceitar licença CC BY-SA 4.0 para
texto original (fontes citadas mantêm seus próprios direitos); código AGPL-3.0.
Não exigir que o participante possua direitos sobre documentos que apenas cita.

Verificações: testes reais das transações SQL, permissões/concorrência, tokens,
privacidade de leituras/histórico, conta e reentrada após login, moderação e recursos,
quóruns, reputação e revogação; lint/tipos/build, fluxo navegador móvel/teclado.
Antes de ouro em produção, avaliar perguntas independentes e registrar evidência,
latência/custo/atribuição e falsos positivos. Nunca alegar melhora sem avaliação.

## Discussões sobre registros (0038)

A API também recebe `compartilhar_registro` e `concluir_editorial`, conforme o
contrato principal. Biografias e eventos publicados preservam cópia pública e
fontes obtidas pelo servidor. Aprovação registra atualização editorial pendente,
sem criar resposta ouro. Conclusão exige publicação prévia no acervo e registra
cópia, link, justificativa e responsável; recursos preservam o histórico.

A interface apresenta três níveis: Participante, Colaborador e Colaborador
experiente. Os critérios internos acima permanecem intactos; `revisor` e
`referencia` usam o mesmo rótulo público “Colaborador experiente”. Essa correspondência
é documentação interna, não uma explicação exibida nos perfis.
