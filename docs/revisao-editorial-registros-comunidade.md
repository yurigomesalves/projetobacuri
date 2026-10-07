# Revisão editorial — discussões sobre biografias e registros do mapa

**Data:** 7 de outubro de 2026  
**Escopo:** redação pública para a comunidade, a transparência editorial e o
projeto. Esta revisão não altera a taxonomia, nem substitui o contrato de API.

## Critérios confirmados

- A participação é identificada por tag pública persistente e e-mail confirmado,
  sem verificação de identidade civil; nome real é opcional e e-mail é privado.
- Há três origens de discussão: chat, biografia e evento do mapa. A cópia do
  conteúdo e das fontes é obtida e preservada pelo servidor.
- Avaliações têm o mesmo peso. Os impedimentos, pareceres, quóruns, recursos e
  decisão pública são os mesmos para propostas sobre registros.
- A aprovação de uma proposta sobre biografia ou mapa abre uma **Atualização
  editorial pendente**; ela não cria resposta de referência nem altera o acervo
  automaticamente.
- A revisão efetiva passa pela preparação e publicação editorial do acervo. A
  curadoria registra publicamente a conclusão e o vínculo para o registro
  atualizado. O chat só se beneficia depois da indexação do acervo revisado.

## Texto recomendado — cabeçalho de Transparência editorial

Substituir os três parágrafos introdutórios de `app/transparencia/page.tsx` pelos
seguintes parágrafos:

> Esta página reúne decisões públicas sobre propostas abertas a partir de três
> origens: perguntas e respostas do chat, biografias e registros do mapa. As
> avaliações de participantes ajudam a ordenar a fila; pareceres independentes
> da curadoria decidem cada proposta à luz das fontes. As avaliações legadas do
> assistente são contribuições enviadas pelo formulário anterior, examinadas no
> fluxo de curadoria então vigente.

> Uma tag pública persistente identifica cada participação; ela está ligada a uma
> conta com e-mail confirmado, sem exigir identidade civil. Nenhuma contribuição
> muda o acervo documental, treina o modelo ou torna uma afirmação verdadeira por
> ter recebido mais apoio. Cada decisão registra resultado, justificativa e
> fontes verificáveis. Tortura, mortes, desaparecimentos forçados e outras
> violações documentadas não são apresentados como opiniões equivalentes à sua
> negação.

> A aprovação de uma proposta sobre biografia ou registro do mapa encaminha sua
> revisão pelo fluxo editorial do acervo e fica identificada como “Atualização
> editorial pendente”. Quando a revisão é concluída, a curadoria registra aqui a
> justificativa e o vínculo para o registro atualizado. O chat só pode se
> beneficiar desse conteúdo depois da indexação editorial normal do acervo.

## Texto recomendado — regras da comunidade

### Abertura da página

Manter o parágrafo atual sobre conta, tag e privacidade. Ele já expressa de modo
adequado a identificação pública sem identificação civil.

### Seção “Da resposta à proposta”

Após a lista, acrescentar:

> Uma discussão também pode partir de uma biografia ou de um registro do mapa,
> pelo botão “Discutir na comunidade”. Antes da publicação, confira o título, o
> motivo e a categoria. O projeto preserva a origem, o link e uma cópia do
> registro com suas fontes; essa cópia é obtida no servidor a partir do registro
> público, não de texto enviado pelo navegador.

### Seção “Curadoria e respostas de referência”

Depois do segundo parágrafo, acrescentar:

> Propostas sobre biografias e registros do mapa seguem as mesmas avaliações,
> impedimentos, pareceres, quóruns e recursos das demais propostas. Se aprovadas,
> não se tornam resposta de referência. Recebem o estado “Atualização editorial
> pendente” e seguem para a preparação e publicação editorial do acervo.

Depois do parágrafo sobre “Resposta de referência”, acrescentar:

> A aplicação de uma atualização aprovada ocorre no fluxo editorial do acervo.
> Depois de revisar e publicar o registro, a curadoria usa “Registrar conclusão
> editorial” para vincular a decisão pública ao registro atualizado. A aprovação
> encaminha a revisão do registro pelo fluxo editorial do acervo. A conclusão
> será registrada aqui. O chat só se beneficia do conteúdo quando o registro
> revisado e suas fontes passam pela indexação editorial normal; não há inclusão
> automática em respostas de referência.

### Origem exibida nas discussões

Usar estes rótulos, sem os apresentar como equivalentes entre si:

| Origem | Rótulo do conteúdo preservado |
| --- | --- |
| Chat | “Pergunta e resposta originais” |
| Biografia | “Biografia original” |
| Evento do mapa | “Registro original” |

Usar também os textos de estado e ação exatamente nesta forma: “Atualização
editorial pendente”, “Atualização editorial concluída” e “Registrar conclusão
editorial”.

## Problemas encontrados

- **[importante]** A abertura atual de Transparência editorial restringe as
  decisões da comunidade a propostas do chat; com as novas origens, ela fica
  incompleta.
- **[importante]** As regras atuais descrevem somente “Discutir esta resposta” e
  a resposta de referência; sem os acréscimos acima, podem sugerir indevidamente
  que uma aprovação sobre registro entra no chat.
- **[menor]** O texto de níveis da página de regras menciona uma união de níveis
  antigos e uma coluna de benefícios. Isso contraria a simplificação planejada,
  mas é uma mudança de interface e não foi reescrita nesta revisão editorial.

## Decisão humana necessária — Yuri

Confirmar se a documentação de regras de implementação (`docs/comunidade.md`)
deve registrar também os três níveis públicos consolidados. Ela ainda enumera
quatro níveis internos, enquanto a página planejada exibirá três faixas.
