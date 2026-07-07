# Revisão editorial — Fase 4

Revisão dos textos de interface em pt-BR (`app/page.tsx`, `app/layout.tsx`,
`app/componentes/Chat.tsx`, `Citacoes.tsx`, `Feedback.tsx`,
`app/transparencia/page.tsx`, `app/curadoria/page.tsx`) frente aos 7
princípios do `CLAUDE.md`.

## 1. Nota de transparência definitiva (para /transparencia)

> Esta página mostra como o projeto Memória e Verdade lida com as avaliações
> enviadas por quem usa o assistente. Quando alguém marca uma resposta como
> incompleta ou incorreta e propõe um texto alternativo ou novas fontes, essa
> contribuição **não muda o acervo automaticamente**. Ela entra em uma fila e
> é lida, uma a uma, por uma pessoa responsável pela curadoria histórica do
> projeto.
>
> Cada contribuição é avaliada por três critérios. Primeiro, fidelidade às
> fontes documentais: a proposta precisa se basear em documentos reais — como
> o Relatório da Comissão Nacional da Verdade, pesquisas acadêmicas ou
> depoimentos — e não em opinião pessoal. Segundo, citação verificável: é
> preciso indicar de onde a informação vem, com autor, documento e, quando
> possível, página, para que qualquer pessoa possa checar. Terceiro, recusa de
> negacionismo: propostas que tentem minimizar, justificar ou colocar em
> dúvida crimes documentados da ditadura — como tortura, mortes e
> desaparecimentos forçados — são recusadas. Esses fatos não são tratados como
> uma opinião entre outras: eles estão registrados em documentos oficiais,
> com nomes, datas e responsáveis, e é assim que o projeto os apresenta.
>
> Toda decisão — aceitar ou recusar — é publicada nesta página, junto com a
> justificativa de quem decidiu. Isso vale tanto para quem concorda quanto
> para quem discorda do projeto: nada é decidido "por trás das cortinas".
>
> Este trabalho existe para ajudar a preservar a memória das pessoas atingidas
> pela ditadura, contar a história com base em provas e documentos, e
> contribuir para que o Brasil enfrente esse período com verdade e justiça.

## 2. Tabela de ajustes

| Arquivo | Texto atual | Texto proposto | Justificativa |
|---|---|---|---|
| `app/transparencia/page.tsx` | (cabeçalho provisório, linhas 68-81) | Substituir pela "Nota de transparência definitiva" acima (item 1) | Cumpre o que o comentário no código já pede — versão definitiva, mais explícita sobre negacionismo (princípio 5) e sobre verdade/memória/justiça (princípio 7), acessível ao ensino básico. |
| `app/page.tsx` | "Assistente educativo sobre a Ditadura Civil-Militar no Brasil (1964–1985), que responde apenas com base em documentos históricos, citando as fontes utilizadas." | Manter — está claro, sóbrio e correto. | (sem mudança) |
| `app/curadoria/page.tsx` | "Curadoria de feedbacks" | "Curadoria de avaliações" | "Feedback" é termo técnico em inglês numa área que trata de decisões sobre memória e verdade; "avaliações" é mais acessível e mantém o tom sóbrio, sem perda de sentido (importante: menor). |
| `app/componentes/Feedback.tsx` | "Esta resposta foi útil?" | Manter — pergunta neutra e funcional. | (sem mudança) |
| `app/componentes/Chat.tsx` | "Quem foram as vítimas de Marighella e como ele morreu?" | "O que o relatório da CNV documenta sobre a morte de Carlos Marighella?" | A formulação atual trata Marighella (perseguido e morto pela repressão) implicitamente como agressor ("vítimas de Marighella"), invertendo o quadro da Ditadura Civil-Militar: Marighella foi assassinado pelo DOPS-SP em 1969. A nova formulação é factualmente correta e direciona para a fonte documental (bloqueante). |
| `app/componentes/Chat.tsx` | "Consultando o acervo e redigindo a resposta — pode levar alguns segundos." | Manter — tom adequado, sóbrio. | (sem mudança) |
| `app/componentes/Citacoes.tsx` | "ver trecho" / "Ver fonte original" | Manter — funcional e claro. | (sem mudança) |

## 3. Parecer final

Os textos revisados aderem, em geral, aos princípios do CLAUDE.md: a
transparência editorial fica explícita, o combate ao negacionismo é afirmado
sem relativização, e a citação de fontes é reforçada na interface. O ponto
**bloqueante** é a pergunta de exemplo sobre Marighella, que inverte o papel
de vítima e perpetrador e deve ser corrigida antes do deploy. Pendência para
decisão do Yuri: confirmar a nova redação da pergunta de exemplo e revisar,
quando o acervo crescer, se outras perguntas de exemplo seguem o mesmo
cuidado ao mencionar nomes de vítimas/perpetradores.
