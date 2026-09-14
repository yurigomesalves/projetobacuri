# Revisão técnica da continuidade de fontes

Data: 14/09/2026. Fase: análise e execução local. Estado: **implementado,
aguardando avaliação autorizada**.
Revisão do arquiteto-backend consolidada pela sessão principal a partir do contrato
v1.5, da rota de chat, dos tipos compartilhados, da interface e da migração 0027.

## Achados que impedem implementar a proposta original diretamente

| Gravidade | Achado | Consequência para o desenho |
| --- | --- | --- |
| Bloqueante | O navegador pode forjar tanto `papel = assistente` quanto `fontes_ids`. | Restringir o campo pelo papel não comprova uma citação anterior. |
| Bloqueante | A RPC textual usa `ts_rank_cd`; a vetorial usa similaridade e limiar 0,82. | Não somar os escores nem interpretar relevância textual como similaridade. |
| Bloqueante | “Prioridade suave” não define elegibilidade nem seleção dos oito trechos. | Definir e congelar a regra experimental antes de medir ganho. |
| Importante | O detector atual usa pronomes ou início “E”; a consulta inclui só a última pergunta anterior. | Três turnos com referentes encadeados e mudanças de assunto exigem casos próprios. |
| Importante | A RPC 0027 não devolve todos os metadados do contrato de citação. | Recarregar `tipo_fonte`, `confiabilidade`, `data_documento` e `nota_contexto`. |
| Importante | O coletor atual envia um histórico fixo e uma pergunta por caso. | Ele não coleta automaticamente dois turnos nem transporta a trilha documental real. |

## Transporte da trilha documental

A expressão correta é **fontes citadas anteriormente**: uma citação gerada não
significa aprovação editorial da fonte ou da afirmação. O texto anterior do
assistente continua sendo contexto de conversa, nunca evidência documental.

Há duas alternativas para uma futura decisão de contrato:

- `fontes_ids` como pistas não confiáveis: só fontes públicas existentes, limites
  estritos e nova recuperação documental. É simples, mas não comprova continuidade.
- Referência emitida pelo servidor: recuperar apenas os IDs das citações da
  interação anterior, ou transportar um token assinado com esses IDs. Esta é a
  hipótese preferida para estudar proveniência, ainda sem adoção no contrato.

Após a revisão do frontend, a recomendação conjunta é o **token opaco e assinado**.
A resposta receberia `token_continuidade?`; a requisição seguinte aceitaria
`continuidade?: { token: string }`, separado do histórico textual. O token conteria
somente versão, emissão, expiração curta, nonce e até oito IDs de fontes citadas
verificadas pelo servidor — nunca pergunta, resposta, IP ou identificador pessoal.
Ele seria emitido apenas quando houver citações e mantido no estado da última
mensagem do assistente, sem exibição nem persistência automática no navegador.

Um `interacao_id` existente prova que a interação existe, não que pertence à
conversa atual. A tabela não tem vínculo de sessão. Não expor pergunta, resposta
ou outros dados de auditoria de uma interação arbitrária. Um token assinado prova
emissão, mas também pode ser reapresentado em outra conversa: validade, expiração,
conteúdo mínimo e comportamento em caso de repetição precisam ser especificados.
Não criar identificação de usuários apenas para resolver essa conveniência.

O frontend enviaria somente o token da resposta imediatamente anterior quando a
nova mensagem aparentar continuação. Mudança explícita de assunto não o envia.
Recarregar a página encerra a continuidade: não gravar conversa ou token em
`localStorage`, pois perguntas históricas podem conter conteúdo sensível em aparelho
compartilhado. Token ausente, inválido, expirado ou incompatível cai silenciosamente
na busca geral, sem revelar detalhes internos ao usuário. Uso único exigiria guardar
hash do nonce no servidor; não há necessidade demonstrada para esse estado adicional
na primeira experiência.

## Regras mínimas da experiência futura

1. Preservar as respostas determinísticas de privacidade, referente ausente e
   fabricação antes de qualquer recuperação adicional.
2. Considerar apenas a resposta do assistente imediatamente anterior, com citações
   verificadas. Referência ausente, inválida, expirada, sem citações ou com falha
   de leitura desativa a continuidade e conserva a busca geral. Não retroceder
   silenciosamente até encontrar uma fonte antiga.
3. Uma mudança explícita de assunto desativa a prioridade anterior. Um referente
   ambíguo requer esclarecimento; apenas conter “E” não comprova continuidade.
4. Manter o ramo vetorial atual e seu limiar. No ramo textual, usar termos de
   assunto da pergunta anterior e do seguimento, sem copiar afirmações do assistente
   para a consulta. Palavras genéricas isoladas não bastam para elegibilidade.
5. Limitar a oito fontes anteriores; fixar previamente o número de candidatos
   textuais por fonte e o prazo de consulta. Os tetos da RPC (20 fontes e 100
   resultados por fonte) são limites técnicos, não valores recomendados ao chat.
6. Deduplicar por `chunk_id`, recarregar metadados e aplicar a omissão de contatos
   antes de prompt, citações e artefatos de avaliação. Manter no máximo oito trechos
   finais e marcadores coerentes; registrar se cada candidato veio da busca geral,
   da continuidade ou de ambas.
7. Definir a regra de elegibilidade textual e de fusão em desenvolvimento. Comparar
   ordenações, e não escores de escalas distintas, é uma possibilidade a estudar.
   Ainda não há justificativa empírica para um peso ou uma quota específica.
   Se nenhum ramo fornecer evidência elegível, conservar a resposta sem base.

O ramo textual ainda não pode substituir a regra de ausência documental do contrato
v1.5. Sua elegibilidade, o transporte e a seleção final permanecem decisões abertas;
esta revisão não promove a busca híbrida nem muda parâmetros públicos.

## Protocolo de validação

- Primeiro revisar editorialmente os
  [seis roteiros candidatos](casos-continuidade-fontes-2026-09-14.json): dois de
  mesma fonte, dois de mudança de documento no tema e dois de mudança de assunto.
  Formulações novas sobre âncoras já vistas são desenvolvimento, não teste cego.
- Para cada roteiro, obter um primeiro turno real ou uma fixture documental
  validada, com fonte e página conferidas. Não fornecer IDs do gabarito ao buscador.
  Se o primeiro turno falhar, registrar a falha em vez de corrigi-lo silenciosamente.
- Comparar o seguimento com e sem continuidade a partir do **mesmo** primeiro turno,
  modelo, acervo e parâmetros. Avaliar separadamente a recuperação dos candidatos,
  os oito trechos finais e a sustentação das afirmações geradas.
- Rubrica por caso: aprovado, parcial ou falhou; conferir referente, documento,
  página, atribuição de autoria, suficiência das evidências, reaproveitamento
  indevido, quantidade de citações e latência. Citação presente não implica acerto.
- Manter P25–P27 parciais como regressão separada. Preservar P28–P30 e acrescentar
  testes técnicos sem LLM para referência adulterada/inexistente, fonte sem acesso,
  resposta sem citações, falha de consulta, duplicatas e três turnos encadeados.
- Após congelar transporte, limites, elegibilidade e fusão, reservar outro lote
  independente antes de promover ao público. Exigir melhora na continuidade sem
  regressão observada nas mudanças de fonte/assunto e sem violações documentais ou
  de privacidade; um lote pequeno não demonstra generalização estatística.

## Próxima etapa e autorização

Yuri aprovou o desenho e os seis casos em 14/09/2026. O contrato v1.6, backend,
frontend e coletor pareado foram implementados localmente. O coletor prevê até 18
chamadas (primeiro turno, seguimento sem token e seguimento com token para cada
caso), não persiste o token e exige autorização explícita por variável de ambiente.
Ele foi executado apenas em modo simulado nesta fase. Uma avaliação paga requer
estimativa e nova autorização. Nenhuma chamada ao LLM, migração, commit ou deploy
foi realizada na implementação.
