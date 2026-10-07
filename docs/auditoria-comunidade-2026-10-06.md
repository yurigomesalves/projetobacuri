# Auditoria visual e funcional da comunidade — 06/10/2026

A comunidade foi inspecionada e exercitada em `http://localhost:3002`, usando
Supabase, Auth, Storage e Mailpit locais. A rodada final confirmou os ajustes no
navegador, sem erros JavaScript ou rolagem horizontal nas telas examinadas.
Isso não equivale à aprovação editorial de respostas históricas ou à homologação
para produção.

## Ambiente e evidências

- Quatro contas existentes: `@participante_teste` e três curadores de teste.
- Uma nova conta foi cadastrada pela interface, confirmou seu e-mail, completou
  o perfil e participou dos testes de foto, recuperação e governança.
- Desktop em 1440 pixels; celular em 390 e 320 pixels; temas claro e escuro.
- Sete páginas examinadas em cinco combinações de tema/largura: fórum, conta,
  discussão, regras, respostas ouro, curadoria e perfil público.
- A verificação final de páginas/permissões gerou 37 capturas; capturas adicionais
  registram prévia, histórico, cadastro e os últimos ajustes de moderação/perfil.
- Evidências e scripts estão em `.local/comunidade/auditoria/` (ignorada pelo Git).
  `poscorrecoes.json` e `verificacao-contexto.json` não tiveram falhas nem erros
  JavaScript. `resultado.json` preserva tentativas iniciais e erros de seletores,
  posteriormente corrigidos e retestados; não apagar esse registro.
- Credenciais ficam somente nos arquivos locais privados. Não foram copiadas
  para este relatório ou para capturas públicas.

## Fluxos executados com serviços locais reais

| Funcionalidade | Resultado |
| --- | --- |
| Login e saída | Quatro logins reais; saída exercitada no fluxo de recuperação. |
| Cadastro gratuito | Conta criada na interface; confirmação exigida e recebida no Mailpit. |
| Confirmação de e-mail | Link real abriu a conta; perfil completado e salvo. |
| Recuperação de senha | E-mail recebido; link real e troca de senha concluídos; novo login confirmado. |
| Edição do perfil | Perfil principal salvo com seus valores anteriores; nenhuma substituição da foto. |
| Foto de perfil | Na nova conta: arquivo inválido recusado, PNG enviado e foto removida. |
| Compartilhar resposta | Chat real, prévia, confirmação obrigatória e discussão criada. |
| Busca e filtros | Busca por título, categoria e ordenação por avaliações exercitadas. |
| Comentários | Publicação, resposta vinculada, edição, duas versões no histórico e reconhecimento por outra conta. |
| Propostas | Publicação com fonte externa sugerida, busca sem resultados e revisão para versão 2. |
| Avaliações | Pedido de ajustes justificado, retirada e registro de apoio. |
| Acompanhamento/notificações | Acompanhamento ativado; sino indicou não lidas; avisos marcados como lidos. |
| Curadoria editorial | Encaminhamento excepcional e dois pareceres de recusa em ambiente de teste; decisão pública demonstrativa conferida. |
| Recurso editorial | Recurso apresentado; impedimento dos pareceristas anteriores mostrado na interface. |
| Denúncia/moderação | Denúncia de comentário alheio, ocultação e recurso com reversão por dois curadores independentes. |
| Localização de denúncia | Link abriu a discussão na âncora correta; denúncia demonstrativa resolvida preservando o conteúdo. |
| Admissão à curadoria | Indicação, consentimento e aprovação dos três curadores; função efetivamente concedida à nova conta. |
| Defesa e votos | Procedimento demonstrativo contra a nova conta, defesa e votos contrários registrados. |
| Saída da curadoria | Nova conta saiu voluntariamente; três curadores originais permaneceram ativos. |
| Visitantes e permissões | Curadoria ausente na navegação comum; acessos diretos de visitante/participante bloqueados. |
| Autodenúncia direta | Servidor rejeitou com 403, sem registrar a denúncia. |
| Teclado e menus | Escape devolveu foco ao gatilho; clique fora fechou os menus. |

O reconhecimento do comentário foi registrado, mas não produziu pontos: a regra
exige três contas com pelo menos sete dias de existência. Não foi alterada a idade
das contas nem fabricada reputação para aparentar uma promoção.

## Falhas corrigidas

1. **Curadoria na navegação comum:** o link agora depende da função validada;
   visitantes e participantes comuns não recebem esse acesso visual.
2. **Autodenúncia pela API:** ocultar o botão não bastava. A API agora confere a
   autoria do alvo e bloqueia denúncia do próprio conteúdo/perfil; alvo inexistente
   ou consulta indisponível também não geram registros.
3. **Menus que permaneciam abertos:** os três pontos usam um componente compartilhado
   com fechamento por clique/foco fora e Escape, preservando navegação por teclado.
4. **Nomes acessíveis dos seletores:** categoria, ordenação, avaliações e controles
   curatoriais têm rótulos explícitos, sem agregar o texto de todas as opções.
5. **Formulário vazio antes do perfil carregar:** a conta mostra carregamento e só
   libera a edição após receber os dados, evitando confundir um perfil existente
   com um novo cadastro.
6. **Excesso de formulários de parecer:** passam a abrir somente em “Emitir parecer”.
   O painel ganhou melhor hierarquia, campos maiores e estado vazio para ouro.
7. **Impedimento no recurso pouco claro:** pareceristas de rodadas anteriores recebem
   explicação, em vez de um formulário que só seria recusado ao enviar.
8. **Denúncias sem acesso ao contexto:** comentários/propostas denunciados recebem
   um link validado pelo servidor para sua discussão e âncora.
9. **Perfil público comprimido no celular:** foto e identificação ficam empilhadas,
   dando espaço à tag em 320 pixels.
10. **Votação para pessoa que saiu da curadoria:** procedimentos contra pessoas fora
    do colegiado deixam de aparecer na fila de votação. Os registros permanecem
    no banco; não foi inventado um resultado de governança.
11. **Estado do papel após ações curatoriais:** as ações disparam atualização da
    referência ao perfil, incluindo a saída voluntária.
12. **Teste unitário dependente de credenciais:** a heurística de continuidade do
    chat deixou de carregar autenticação real através do componente de publicação.

## Verificação automatizada

- `npm test`: **214 testes aprovados em 27 arquivos**, incluindo PostgreSQL/PGlite
  isolado para operações e regras da comunidade, segurança das rotas e fotos.
- `npx playwright test tests/e2e/comunidade.spec.ts --workers=2`: **22 testes
  aprovados**, divididos entre desktop e celular. Nesta suíte Auth/APIs são
  simulados; os fluxos da tabela acima foram executados separadamente no localhost
  com serviços reais.
- `npm run lint` e `npx tsc --noEmit`: aprovados.
- Não houve publicação, migração remota, contratação ou alteração de `.env.local`.

## Rótulos públicos revisados

Os rótulos “Carregando seu perfil…”, “Emitir parecer”, “Nenhuma resposta ouro
nesta página.” e “Consultar conteúdo denunciado” são claros e não antecipam um
resultado editorial. “Você participou de uma rodada anterior. Este recurso exige
pareceristas independentes.” explica impedimento sem imputar conduta. A resposta de
API “Você não pode denunciar seu próprio conteúdo ou perfil.” é adequada porque
declara o limite da ação sem expor dados de terceiros. Esses textos foram conferidos
na interface local; não constituem aprovação de conteúdo histórico.

## Limites e próximos trabalhos recomendados

| Prioridade | Trabalho | Justificativa |
| --- | --- | --- |
| Antes de ativar ouro no chat | Validar aprovação, indexação e uso editorial com acervo histórico conferido por pessoas independentes. | O banco local não contém esse acervo; não houve aprovação histórica. Regras de ouro, fontes alteradas/suspensas/revogadas foram cobertas por testes isolados, não por uma homologação documental no navegador. A integração continua desligada. |
| Alta | Exercitar o indicador de quórum sob carga e composição curatorial variada. | A interface já informa votos ou pareceres válidos, exigência, faltantes e insuficiência de elegíveis, sem decidir pelo usuário. O teste local de recurso confirmou um único revisor independente; faltam cenários concorrentes e composições maiores. |
| Média | Criar projeção agregada de não lidas para históricos grandes. | As notificações já são paginadas em grupos de 20 e o filtro deixa claro que opera na página exibida. Uma projeção agregada evitaria leituras repetidas do sino em históricos muito extensos. |
| Média | Encerrar formalmente procedimentos de destituição recusados ou sem alvo ativo. | Votos contrários foram registrados; o procedimento de teste continuou pendente no banco, mesmo após a pessoa sair voluntariamente. O filtro visual corrige a ação inválida, mas o encerramento formal exige definir regra e migrar a operação de governança. |
| Média | Expor confirmação e estado do reconhecimento de comentários. | A operação é idempotente e funciona, mas o botão não informa claramente que a pessoa já reconheceu o comentário nem explica o limiar para pontos. |

Paginação com grande volume, progressão por idade/atividade e todos os estados de
ouro não foram reproduzidos com grande massa de dados no navegador. A suíte SQL
cobre regras e limites em cenários isolados; recomenda-se carga e concorrência
antes de ativação pública. Não se alteraram datas de contas para simular tempo real.

Encerramento de conta, destituição efetiva dos curadores originais e invalidação de
seus pontos não foram executados no ambiente compartilhado. São ações destrutivas;
a auditoria preservou a composição original, a foto e os dados do perfil principal.
As telas e regras pertinentes foram examinadas, sem declarar esses efeitos
irreversíveis como homologados pelo navegador.

## Dados de teste preservados

A discussão “Auditoria visual local — fluxo colaborativo”, sua decisão de recusa,
recurso e operações demonstrativas ficam no banco local como evidência. A nova
conta está fora da curadoria. Nenhum dado remoto foi usado ou alterado; a decisão
demonstrativa não valida nem invalida conteúdo histórico do projeto.

## Implementação posterior: quórum e notificações antigas

As duas melhorias foram implementadas após a solicitação do Yuri:

- O painel calcula no servidor progresso de propostas, candidaturas, recursos de
  moderação e destituições. Mostra votos/pareceres válidos, exigência vigente,
  faltantes e insuficiência de curadores elegíveis. Preserva unanimidade de
  admissão, dois terços de destituição e as condições de maioria dos pareceres.
  Autoria, contribuições incorporadas em versões anteriores, suspensão,
  encerramento, impedimento em recursos e alteração de fontes são conferidos.
  As regras de decisão SQL não foram modificadas; o indicador não registra uma
  decisão nem substitui a revalidação transacional.
- Notificações têm páginas de 20 itens, controles “Mais antigas” e “Mais recentes”,
  título da discussão e filtro explícito de não lidas **na página exibida**.
  Marcar como lidas continua abrangendo todos os avisos da pessoa. O componente
  recebe seus próprios dados, preservando o rascunho do formulário de perfil
  enquanto a pessoa navega entre páginas.
- Os rótulos do quórum são adequados por informar contagem, elegibilidade e falta
  sem antecipar decisão; “Mais antigas”, “Mais recentes” e “Não lidas desta página”
  deixam explícito o recorte temporal e de paginação das notificações.
- Teste real: 28 notificações demonstrativas somente na conta temporária, divisão
  20/8, título, filtro, marcação de leitura e rascunho preservado. O recurso editorial
  com apenas um revisor independente mostrou a falta de um segundo elegível.
  Capturas desktop/celular e resultado em
  `.local/comunidade/auditoria/quorum-notificacoes.json`.
- Validação automatizada: 223 testes em 28 arquivos e 26 testes de navegador
  passaram; lint, verificação de tipos e conferência de espaços do diff passaram.
- Não houve migração de banco, alteração de fontes históricas, edição de papéis ou
  publicação remota. O encerramento formal de destituições e a projeção agregada
  de não lidas para históricos muito grandes continuam sendo trabalhos distintos.

## Preparação do PR e revisão automática

Credenciais, contas, capturas e ambiente local ficaram fora dos commits. PR #5
organizado em backend, interface e testes/documentação. A configuração pessoal
do Codex foi preservada fora do PR. A prévia do commit inicial passou em 12
verificações de páginas desktop/celular, sem erros JavaScript ou overflow; a API
retornou 503 de preparação. Supabase Preview foi ignorado pela integração: não há
banco remoto isolado para certificar o ciclo completo.

A revisão automática identificou atalhos de estados editoriais: agora pareceres
só aceitam versões encaminhadas/recorridas; encaminhamento manual não altera
recursos nem reencaminha versões com pedido editorial de ajustes. O encaminhamento
automático também exige nova versão após ajustes. Testes PostgreSQL cobrem esses
casos. O menu recupera a curadoria legada quando a comunidade está desativada.
As alterações SQL são somente nos arquivos de migração preparados; nenhuma
migração foi aplicada ao banco local persistente ou remoto nesta etapa.

Após correções: 224 testes em 28 arquivos e 28 casos de navegador aprovados
(26 da suíte e dois de fallback legado); lint, tipos e diff aprovados.
