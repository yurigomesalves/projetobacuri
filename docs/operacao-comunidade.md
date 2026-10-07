# Operação e publicação da comunidade

## Estado de ativação

O desenvolvimento usa migrações aditivas e dados de teste isolados. Nenhuma migração
remota, contratação de e-mail ou publicação é autorizada implicitamente por este
documento. Seguir o plano aprovado e apresentar a entrega validada antes da ativação.

`BACURI_COMUNIDADE_ATIVA` controla as APIs e o compartilhamento. Sem ativação,
o chat documental e a curadoria legada continuam funcionando. A interface deve
explicar indisponibilidade temporária, sem apresentar listas vazias como sucesso.
`BACURI_OURO_CHAT_ATIVO` é independente e começa desligada: pode haver fórum e ouro
aprovado sem usar a camada editorial na geração.

## Preparação do ambiente de publicação

1. Fazer backup e revisar as migrações com os testes SQL; comparar a lista de
   curadores preservados. Aplicação remota requer confirmação do responsável.
2. Obter domínio ou subdomínio cedido com controle DNS. O endereço `.vercel.app`
   não fornece domínio de remetente. Configurar SPF/DKIM conforme o provedor.
3. Configurar SMTP gratuito no Supabase Auth, confirmação obrigatória, URL do site
   e redirects exatos para a área de conta; validar cadastro e recuperação reais.
   Credenciais ficam no serviço/ambiente privado. Não ativar excedentes pagos.
4. Gerar segredo de compartilhamento distinto do segredo de continuidade, com no
   mínimo 32 caracteres aleatórios. Rotação invalida comprovantes antigos.
5. Conferir que convites antigos não elevam papéis sem unanimidade após ativação.
6. Revisar regras públicas, atribuição e licença. Confirmar a composição inicial:
   sem dois curadores independentes as respostas aguardam pareceres suficientes.
   Conferir a separação entre decisões do fórum e feedbacks legados, a proveniência
   das fontes e o parecer em `revisao-editorial-comunidade.md`.
7. Publicar primeiro em preview, testar o ciclo completo e somente então ativar
   o fórum no ambiente público. Não habilitar ouro no chat nesta mesma etapa.

## E-mail e custos

O envio inicial usa a cota gratuita de SMTP (Resend como primeira opção pesquisada).
Alertas de cota e erros de entrega devem ser conferidos no painel do serviço.
Ultrapassar a cota não pode confirmar contas automaticamente nem gerar cobranças.
Mensagem de reenvio informa falha recuperável; usuário pode tentar mais tarde.
Notificações de fórum ficam dentro da plataforma. Futuro upgrade ou troca de
provedor altera configuração SMTP, sem modificar os contratos da comunidade.

## Critérios para ouro no chat

Preparar amostra independente de perguntas diretas, paráfrases, perguntas semelhantes
com sentido distinto, continuidade, ausência de base e respostas suspensas/revogadas.
Comparar geração documental com e sem ouro usando o mesmo acervo e configuração.
Revisão humana confere cada atribuição e se a referência editorial é pertinente.
Registrar versões, latência e custo; uso indevido de ouro ou fonte inválida veta a
ativação. Qualquer chamada paga continua sujeita à autorização de custos existente.

## Reversão operacional

Desligar a flag de ouro interrompe sua recuperação nas novas consultas. Desligar a
comunidade interrompe publicações e operações do fórum sem apagar o histórico.
Não desfazer migrações com DROP nem restaurar backup sobre dados novos sem análise
e autorização. Manter decisões anteriores e registrar a motivação da intervenção.

## Validação local da implementação — 06/10/2026

- `npm test`: 191 testes aprovados em 24 arquivos. Inclui 28 casos com migrações
  reais em PostgreSQL/PGlite isolado: permissões, quóruns, versões, fontes alteradas,
  reputação, moderação, recursos, consentimento, destituição e limite compartilhado.
  PGlite usa uma conexão; isto não certifica concorrência entre servidores reais.
- `npx playwright test tests/e2e/comunidade.spec.ts --workers=2`: 10 testes aprovados
  (computador e celular). Autenticação e APIs simuladas; nenhum cadastro, e-mail,
  chamada paga ao LLM ou escrita no banco remoto. Confirmação antes de publicação,
  retorno após login, fontes, avaliações justificadas, conta, curadoria e decisão
  pública foram exercitados. Captura móvel inspecionada sem rolagem horizontal.
- `npm run lint` e verificação TypeScript aprovados.
- `npm run build -- --webpack`: compilação de produção aprovada. O build padrão
  com Turbopack falhou neste ambiente ao abrir uma porta interna do processamento
  CSS (`Operation not permitted`), inclusive na tentativa com permissão ampliada.
  O comando de build do projeto não foi alterado; conferir Turbopack no preview.
- Migrações 0034–0037 preparadas, **não aplicadas remotamente**. Não houve deploy
  nem provisionamento SMTP. O teste de cadastro/recuperação com entrega real de
  e-mail e o ciclo integrado no Supabase de preview permanecem requisitos de ativação.
- Integração de ouro preparada e desligada por padrão. Nenhuma melhora de resposta
  histórica foi demonstrada: exige a avaliação humana independente descrita acima.

As recomendações editoriais sobre transparência, pseudonímia, proveniência, licença
restrita aos textos originais e caráter revisável de ouro foram incorporadas às
interfaces. A revisão não equivale à aprovação de nenhuma resposta histórica.

## Ambiente local isolado

O teste usa o projeto Docker `bacuri-comunidade-local`, com todas as migrações
copiadas para `.local/comunidade/supabase`. Essa pasta é ignorada pelo Git.
A aplicação inicia em `http://localhost:3002` com `npm run dev:comunidade`,
usando exclusivamente as credenciais locais em `.local/comunidade/status.json`.
A configuração `.env.local` existente permanece preservada. O cache de compilação
local fica separado em `.next/comunidade-local`. Ouro no chat permanece desligado;
o gerador aponta apenas para Ollama local, sem chamadas a provedores pagos.
A confirmação de cadastro e recuperação é recebida na caixa local em
`http://localhost:55324`; essas mensagens não são enviadas à internet.

As contas demonstrativas (um participante e três curadores) e senhas aleatórias
estão em `.local/comunidade/contas.json`, com permissões restritas e fora do Git.
Para recriar apenas contas ausentes: `node scripts/preparar-contas-comunidade-local.mjs`.
Não há fontes históricas copiadas da produção. A discussão demonstrativa usa uma
resposta real de ausência de base e propostas de teste inelegíveis para ouro.

Verificação integrada local: login pelo navegador, compartilhamento com recibo do
chat, comentário, proposta, cadastro com confirmação obrigatória, recebimento da
mensagem na caixa local, abertura do link e login após confirmação aprovados.
A solicitação de recuperação de senha foi aceita. Lint e TypeScript aprovados.
Os serviços Docker locais usam chaves demonstrativas e portas acessíveis na rede
do computador; este ambiente é exclusivo de testes, sem dados pessoais reais.

## Perfil com foto e atualização visual — 06/10/2026

Foto opcional: envio, troca e remoção pela conta; miniatura no cabeçalho,
perfil público e autoria de discussões/comentários/propostas. Imagens passam
pelo servidor, com autenticação confirmada, limite de 2 MiB, validação real do
formato, limite de pixels e conversão a WebP de 256 px sem metadados EXIF.
O bucket `fotos-comunidade` é privado, sem políticas de acesso direto.
A primeira publicação cria o bucket com a chave de serviço. Ativar Storage
antes de testar; o Supabase local já está com esse serviço habilitado.
Encerramento torna a foto imediatamente inacessível; a remoção física é tentada
após remover as credenciais. Se o serviço estiver indisponível, conferir os logs
e concluir a limpeza dos arquivos de contas encerradas pela administração.

A comunidade usa a paleta e tipografia existentes: capa sóbria, cartões de
discussão, filtros, guia lateral e âncoras para resposta original, propostas
e comentários. Curadoria, ouro, regras, publicação e perfis compartilham a
navegação e os tratamentos de formulários/cartões. Referência de organização:
[filtros e ordenação do Reddit](https://support.reddithelp.com/hc/en-us/articles/19695706914196-What-filters-and-sorts-are-available).
As avaliações não representam validação histórica. Revisão editorial registrada.

Verificação: 207 testes unitários/integrados e 10 testes de navegador aprovados.
Teste real local confirmou envio e remoção via interface, miniatura, WebP
normalizado e bloqueio de acesso direto ao bucket. Fórum, discussão, perfil,
ouro e regras conferidos em desktop/celular/tema escuro sem rolagem horizontal
ou erros JavaScript. Imagem demonstrativa removida após o teste.
Pastas `.local/` e cache anterior ignoradas pelo Git, lint e TypeScript.

Lint, TypeScript, `git diff --check` e compilação de produção com
`npm run build -- --webpack` aprovados após a revisão.

Correção do compartilhamento: prévia em diálogo modal com altura limitada e
rolagem própria, foco e fechamento por Escape. O estilo sticky do chat aplica-se
somente ao formulário de envio. O acesso à conta respeita a sessão atual; login
não aparece para quem já está autenticado. A confirmação permanece obrigatória.

Correção validada em 12 testes de navegador (desktop/celular), incluindo
prévia longa, tamanho da janela, ausência de crescimento da página, Escape,
retorno do foco e sessão. Capturas reais no Supabase local em tema escuro
inspecionadas. Lint, TypeScript e verificação de diff aprovados.

Por decisão do Yuri, a avaliação rápida “Útil / Incompleta / Incorreta” foi
retirada das respostas do chat. Divergências e propostas devem ser apresentadas
na comunidade pelo botão “Discutir esta resposta”. Registros legados permanecem
na transparência editorial.

O topo exibe apenas os controles de tema e acesso à conta. Usuários autenticados
abrem um menu pela foto/tag: perfil público, edição, notificações, comunidade e
saída. O painel de curadoria aparece no menu somente para curadores. O menu fecha
por Escape, clique fora, mudança de foco ou navegação; e-mail permanece privado.

Menu validado em quatro testes de navegador no desktop/celular: ausência do
atalho isolado, links conforme função, privacidade do e-mail, Escape e saída.
Captura real local inspecionada; lint, TypeScript e diff aprovados.
