# Decisão pendente — experiência de continuidade documental

Data: 14/09/2026. Estado: **aprovada por Yuri Gomes Alves**.

> Aprovada integralmente em 14/09/2026. O contrato v1.6 e o ADR-030 consolidam a
> decisão. O nome deste arquivo foi preservado para manter os links históricos.

## Proposta para aprovação

1. Aprovar editorialmente CF01–CF06 como **casos de desenvolvimento**, preservando
   P25–P27 como resultados parciais e mantendo o lote factual separado.
2. Adotar como desenho experimental um `token_continuidade` opaco, assinado e com
   expiração curta, emitido pelo servidor somente quando a resposta tiver citações.
3. O token transporta no máximo oito IDs das fontes citadas, além de versão, emissão,
   expiração e nonce. Não transporta texto da conversa, IP ou identificação pessoal.
4. O navegador guarda o token apenas na memória e o envia somente no seguimento da
   resposta imediatamente anterior. Recarregar a página encerra essa continuidade.
5. Token inválido ou expirado não causa erro visível: o chat usa a busca geral.
6. A busca textual nas fontes anteriores é um ramo adicional. A busca vetorial e
   seu limiar 0,82 permanecem; escores textual e vetorial não são somados.
7. Antes de qualquer rodada paga: atualizar contrato, tipos, frontend, backend,
   coletor e testes locais; congelar limites e regra de fusão; então apresentar
   custo e pedir autorização específica para a execução.

## Por que esta opção

`fontes_ids` livres podem ser adulterados. `interacao_id` aponta para um registro,
mas não comprova que ele pertence à conversa atual. O token comprova que a trilha
foi emitida pelo servidor sem criar contas, cookies de identificação ou banco de
sessões. A expiração limita reapresentações; dados sensíveis não ficam persistidos
no aparelho.

## Limites aceitos nesta etapa

- Os seis casos reutilizam evidências conhecidas e não validam generalização.
- A regra exata de fusão será definida como parâmetro experimental antes da medição.
- Um lote independente será necessário após o congelamento para eventual promoção.
- Nenhuma migração é prevista; a RPC 0027 já existe e permanece restrita ao servidor.
- A aprovação desta decisão autoriza preparar e testar localmente a experiência;
  não autoriza chamada paga ao LLM, migração, commit ou deploy.
