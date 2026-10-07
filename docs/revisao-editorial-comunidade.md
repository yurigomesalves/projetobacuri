# Revisão editorial — comunidade colaborativa

**Escopo.** Leitura de `CLAUDE.md`, `docs/taxonomia.md`, `docs/memoria-projeto.md`,
`docs/contrato-api.md`, `docs/comunidade.md`, `docs/operacao-comunidade.md` e dos
textos públicos novos da comunidade. Esta é uma revisão editorial; não certifica a
implementação, não autoriza publicação e não transforma proposta de interface em
decisão histórica.

## Parecer

O desenho preserva princípios decisivos: publicação depende de confirmação
explícita; o e-mail não é público; voto não pesa mais pela reputação; curadoria não
é obtida automaticamente; uma resposta ouro continua dependente de fontes; e o uso
no chat não é treinamento do modelo. A documentação também impede que uma fonte
externa sugerida seja tratada como já incorporada ao acervo.

Há um bloqueio de coerência pública: a página de transparência mantém, sem
delimitação, a explicação do fluxo legado de um único curador, embora passe a exibir
decisões do fórum colegiado. Antes de ativar a comunidade, as duas trajetórias devem
ser distinguidas na própria página. Há também ajustes importantes para não converter
classificação comunitária em selo de verdade, nem a etiqueta “ouro” em autoridade
sem fonte e sem possibilidade de revisão.

## Problemas encontrados e correções propostas

| Gravidade | Local e problema | Correção editorial concreta |
| --- | --- | --- |
| **bloqueante** | `app/transparencia/page.tsx`, texto introdutório atual: “uma pessoa responsável pela curadoria” e “o que entra ou não no acervo”. Ele descreve o fluxo legado, mas fica acima do bloco novo `DecisoesComunidade`, que é colegiado. Também sugere que uma contribuição do fórum altera o acervo documental. | Manter os feedbacks legados e acrescentar, antes de ambos os feeds, a distinção proposta em **Texto A**. Renomear os blocos visíveis para “Decisões da comunidade” e “Avaliações legadas do assistente”. A aprovação de uma proposta deve ser descrita como decisão editorial sobre uma resposta, nunca como alteração automática do acervo ou da memória do modelo. |
| **bloqueante** | `app/comunidade/regras/page.tsx`, “Respostas aprovadas tornam-se respostas ouro”. A frase é correta como nome de estado, mas isolada parece um selo definitivo de verdade. | Acrescentar que “ouro” é uma versão editorial aprovada, revisável e rastreável; não substitui fontes, não encerra controvérsias historiográficas documentadas e não habilita resposta sem citação. Usar **Texto B**. |
| **importante** | Regras e `ListaComunidade.tsx` expõem avaliações e ordenação (“mais avaliadas”) sem uma frase permanente de que apoio majoritário não comprova fato histórico. | Junto aos controles de ordenação e na página de regras: “As avaliações organizam a leitura e a fila; não verificam por si a exatidão histórica. A análise depende de fontes identificáveis, contexto e pareceres independentes.” Evitar rótulos que chamem a proposta mais votada de “melhor” ou “correta”. |
| **importante** | `CompartilharResposta.tsx` informa que “o restante da conversa fica neste dispositivo”. O componente grava um rascunho de forma local e a frase pode ser lida como promessa absoluta de privacidade. | Usar: “Somente esta pergunta, o resumo, a resposta e as citações mostradas nesta prévia serão enviados ao fórum após sua confirmação. O restante da conversa não será enviado. Se você salvar ou usar um dispositivo compartilhado, apague o rascunho ao terminar.” A prévia precisa chamar as citações de “referências do acervo” e manter o aviso sobre dados pessoais. |
| **importante** | `app/comunidade/regras/page.tsx` diz que a tag é pública, mas não torna suficientemente explícito que há perfil persistente e responsabilização mínima. | Incluir: “A tag é um pseudônimo público persistente, ligado a uma conta com e-mail confirmado. Ela não é participação anônima: cada contribuição, revisão e decisão fica atribuída à tag. O e-mail não é exibido.” Não prometer verificação da identidade civil, pois ela não existe. |
| **importante** | Regras sobre fontes externas e página ouro não explicitam a crítica documental das fontes. Título, autor e página são necessários, mas uma fonte de repressão ou imprensa censurada requerem contexto de produção. | Acrescentar ao fluxo de proposta: “Indicar uma fonte não equivale a validá-la. Documento de órgão repressivo, imprensa sob censura e testemunho respondem a perguntas distintas e devem trazer proveniência e nota de contexto.” Em respostas ouro, exibir ou vincular a `tipo_fonte`, proveniência e `nota_contexto` de cada fonte, quando disponíveis. Aplicar a taxonomia, em especial a regra da imprensa de 1964–1985 como objeto de crítica documental. |
| **importante** | `DecisoesComunidade.tsx` diz que há “fontes verificáveis”, mas o cartão público mostra apenas síntese, pareceristas e link. A regra aprovada exige que a decisão pública inclua fontes. | Cada cartão deve mostrar ao menos uma indicação inequívoca de que as fontes e a versão decidida estão no destino (“Ver versão decidida e fontes vinculadas”) e o destino deve expor autor/órgão, título, página ou trecho e link quando houver. Se não houver fonte vinculada, não apresentar a decisão como apta a ouro. |
| **importante** | `app/comunidade/ouro/page.tsx` lista uma resposta inteira e fontes em detalhe, mas não identifica, no texto, qual afirmação se apoia em qual referência. | Preservar os marcadores ou ligações entre afirmações e citações já exigidos para o chat. Caso a interface ainda não os suporte, apresentar “Resposta editorial aprovada — consulte as fontes vinculadas” e não “resposta documentada” como se a sustentação estivesse demonstrada só pela lista final. Mostrar estado ativo, suspenso ou revogado sem esconder versões e decisões públicas associadas. |
| **importante** | Termo de licença nas regras pode ser entendido como cessão de direitos sobre excertos, PDFs e demais obras de terceiros. | Substituir o parágrafo por **Texto C**. O aceite deve cobrir apenas o que a pessoa escreveu originalmente; fonte citada, transcrição, imagem e documento mantêm direitos e condições próprios. O participante não deve copiar obra integral protegida. |
| **menor** | “Popularidade organiza a fila” é uma boa síntese, mas o campo histórico é suscetível a brigadas e a maiorias sem base documental. | Preferir “As avaliações organizam a prioridade de leitura; não substituem a conferência documental nem atribuem peso extra a reputação.” Manter o limite de pontos e a impossibilidade de autovoto já previstos. |
| **menor** | “Qualquer pessoa pode ler” não esclarece o tratamento de conteúdo ocultado. | Acrescentar uma frase simples: “Conteúdo ocultado por moderação não é republicado nas áreas públicas; a medida tem justificativa e possibilidade de recurso.” Isso evita expectativa de exposição de denúncias ou dados pessoais. |
| **menor** | `docs/operacao-comunidade.md` exige revisão de regras, mas não enumera a revisão historiográfica da amostra ouro nem a mudança de vocabulário da transparência. | Incluir no checklist de pré-publicação: conferir os textos A–C, a apresentação de proveniência das fontes e uma amostra independente de decisões/versões ouro. Ativação requer dois curadores independentes disponíveis, e não apenas contas existentes. |

## Texto A — nota para o início de `/transparencia`

> Esta página reúne dois registros públicos, que não se confundem. As **decisões da
> comunidade** tratam de propostas abertas a partir de respostas do chat: avaliações
> de participantes ajudam a ordenar a fila, e pareceres independentes da curadoria
> decidem cada versão com base nas fontes. As **avaliações legadas do assistente**
> são contribuições enviadas pelo formulário anterior, examinadas no fluxo de
> curadoria então vigente.
>
> Nenhuma contribuição muda o acervo documental, treina o modelo ou torna uma
> afirmação verdadeira por ter recebido mais apoio. Uma decisão editorial registra
> o que foi aceito, recusado ou devolvido para ajustes, por qual razão e com quais
> fontes verificáveis. Tortura, execução, desaparecimento forçado e outras violações
> documentadas não são apresentados como opiniões equivalentes à sua negação.
>
> O projeto preserva memória, verdade e justiça ao tornar visíveis tanto as fontes
> quanto os critérios e limites de cada decisão.

O bloco legado pode conservar sua explicação histórica, precedido do subtítulo
“Avaliações legadas do assistente”. A frase sobre “uma pessoa responsável” deve ficar
restrita a esse bloco e não descrever o fórum atual.

## Texto B — complemento para “Curadoria e respostas ouro”

> “Resposta ouro” é o nome de uma versão editorial aprovada pela curadoria para uso
> controlado no projeto. Ela permanece ligada à sua discussão, versões, pareceres e
> fontes, pode ser suspensa ou revista e não substitui a consulta aos documentos.
> Apoio comunitário e aprovação editorial não autorizam o chat a afirmar algo sem
> citação histórica verificável, nem treinam o modelo.

## Texto C — licença e limites de reprodução

> Ao publicar, você licencia sob CC BY-SA 4.0 somente o texto original que escreveu
> para a comunidade. Essa licença não se estende a documentos, imagens, transcrições
> ou outros materiais de terceiros que você cite ou indique: eles conservam seus
> próprios direitos, licenças e condições de acesso. Publique apenas excertos
> necessários à discussão e a referência da fonte; não envie obra integral protegida
> sem autorização. O software do projeto é AGPL-3.0.

## Pontos que estão adequados, se a interface os mantém

- A tag pública com e-mail privado combina pseudonímia com responsabilização; ela
  não deve ser chamada de anonimato.
- A confirmação explícita antes de compartilhar pergunta, resumo, resposta e
  citações preserva a separação entre conversa privada e publicação.
- Histórico de versões, impedimento de autovoto, justificativa para avaliações
  negativas e recurso independente evitam que discordância fundamentada seja
  confundida com fraude ou assédio.
- A progressão automática por contribuição reconhecida, com teto e sem peso de
  voto, reduz incentivo a volume; nenhum desses níveis deve ser anunciado como
  credencial historiográfica.
- A entrada de curadores por indicação, consentimento e unanimidade, em vez de
  pontos, resguarda a responsabilidade editorial coletiva. O colegiado deve tornar
  pública a justificativa de admissão, saída, destituição, suspensão e revisão.

## Adendo — perfil e leitura da comunidade (06/10/2026)

**Auditado.** A direção proposta inclui foto opcional no perfil, miniatura para a
sessão autenticada, cartões de discussão, categorias, contadores de comentários e
propostas, e o percurso “Discuta a resposta → Proponha com fontes → Avalie →
Curadoria decide”. Ela é editorialmente adequada se o desenho conservar a ordem
entre conversa, evidência e decisão, sem converter destaque visual em selo de
verdade.

| Gravidade | Ponto | Recomendação editorial |
| --- | --- | --- |
| **importante** | Foto e miniatura podem sugerir identidade verificada. | Nomear o campo “Foto de perfil (opcional)” e informar: “A foto é pública junto à sua tag; o Bacuri não verifica identidade civil.” Oferecer iniciais como alternativa visível, sem pressão para exibir rosto. Não usar a foto como requisito, distinção de nível ou sinal de autoridade. |
| **importante** | Cartões inspirados em fóruns podem tornar avaliações sinônimo de correção. | Manter, junto à ordenação e às propostas, o lembrete: “As avaliações organizam a discussão; a validação histórica depende de fontes e curadoria.” Contadores devem descrever atividade (“12 comentários”, “3 propostas”), nunca qualidade factual. |
| **importante** | A estrutura pode nivelar resposta original, proposta e comentário. | Delimitar visual e textualmente: “Resposta original do chat”, “Propostas de revisão com fontes” e “Comentários da discussão”. A proposta não substitui a resposta nem vira ouro antes do registro público de decisão. |
| **menor** | Participantes podem não saber como iniciar o fluxo. | Exibir na área vazia e no botão de compartilhamento: “Abra uma discussão a partir de uma resposta do chat.” Explicar em uma linha que a publicação abre uma cópia selecionada para debate, não a conversa inteira. |

**Linguagem recomendada.** Preferir “proposta mais avaliada” a “melhor resposta”,
“decisão de curadoria” a “veredito final” e “perfil por tag” a “perfil anônimo”.
O estado ouro deve continuar indicado como versão editorial revisável, com vínculos
para discussão, fontes, pareceres e eventuais suspensão ou revisão.

**Prévia de compartilhamento.** A prévia em diálogo é adequada como etapa de
consentimento quando conserva o título “Prévia da publicação”, o botão “Fechar
prévia”, o fechamento por Escape e a confirmação explícita antes de publicar. A
área rolável deve conter integralmente pergunta, resposta e fontes; “Fechar” nunca
pode publicar ou descartar conteúdo. Sem sessão, o convite deve dizer “Entrar para
compartilhar”; com sessão, a ação final deve manter verbo inequívoco, como
“Confirmar e publicar discussão”.

**Menu do perfil.** Os rótulos “Meu perfil público”, “Editar perfil”,
“Notificações”, “Minha comunidade” e “Sair da conta” são claros e distinguem o que
é visível do que é pessoal. “Painel de curadoria” deve aparecer somente para
curadores autenticados, como função editorial, não como prêmio de participação. No
cabeçalho, nome público ou tag, nível ou função e pontos podem ser exibidos; o
e-mail deve permanecer ausente. A retirada do atalho isolado de curadoria do topo
evita apresentar essa função como trilha paralela de prestígio.

**Conta.** “Tag pública”, “Participação”, “Pontos de participação” e “Sua
participação” são rótulos adequados para cartões e leitura assistiva. “Curador(a)” é
adequado quando identifica uma função editorial efetivamente atribuída. Os pontos
devem continuar descritos como medida de atividade, sem sugerir conhecimento
historiográfico, autoridade sobre fontes ou acesso automático à curadoria.

## Decisões humanas necessárias — Yuri

1. Confirmar a redação pública que separa decisões colegiadas do fórum e avaliações
   legadas; sem isso, a ativação mistura dois modelos de responsabilidade editorial.
2. Definir se a tag de cada parecerista é pública por padrão e como proteger
   curadores que possam sofrer assédio, sem ocultar a rastreabilidade da decisão.
3. Confirmar a política de citação curta e moderação para material de terceiros,
   em especial quando a fonte sugerida é imprensa histórica, documento repressivo ou
   testemunho com dados de pessoas vivas.
4. Designar, antes de `BACURI_OURO_CHAT_ATIVO=true`, a dupla de revisão independente
   e a amostra de avaliação; a presente revisão não é essa avaliação nem concede
   autorização editorial a qualquer resposta ouro.
