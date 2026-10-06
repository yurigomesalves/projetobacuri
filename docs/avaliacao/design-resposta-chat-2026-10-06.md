# Apresentação das respostas — 6 de outubro de 2026

O resumo e o desenvolvimento tinham pouca diferenciação visual, e os cartões de fontes dominavam a altura da conversa. A implementação usa a paleta e tipografia existentes: painel “Em síntese”, desenvolvimento aberto com título e divisor, e referências compactas em lista. Notas de contexto, título integral, autoria, data, páginas, seção e link original permanecem visíveis; apenas o trecho documental usa expansão nativa.

O curador revisou os rótulos e recomendou duas correções, aplicadas: “Fontes citadas”, porque a lista contém referências usadas, e “Resposta” quando não há citações. O resumo vazio não cria uma síntese artificial. Os marcadores mantêm identificadores por interação; ativá-los rola e focaliza a referência correspondente, com destaque do destino.

## Verificação

- 152 testes existentes passaram; lint, checagem de tipos e build webpack passaram.
- Nove cenários Playwright passaram no build de produção local: seis combinações de 390/768/1440px com temas claro/escuro; resumo vazio; resposta sem fontes; duas mensagens com destinos próprios para seus marcadores.
- Foram conferidos foco nas referências, expansão por Enter, contexto visível, link original, feedback e ausência de overflow horizontal.
- Seis capturas com resposta extensa e oito referências foram registradas. A revisão visual cobriu os layouts de celular e desktop nos dois temas.

Os dados de demonstração foram interceptados no navegador; não houve chamada ao LLM ou ao banco nesta avaliação. As capturas não avaliam a qualidade histórica da geração. Redução de movimento foi ativada nos cenários para inspecionar conteúdo completo; o comportamento de digitação existente foi preservado. A avaliação não equivale a uma auditoria completa por leitor de tela.

## Ambiente e entrega

Implementação isolada em `/tmp/bacuri-design-resposta-20261006`, branch `melhoria/design-resposta-chat-20261006`, baseada no main `545e375`. A configuração pessoal e a pesquisa da pasta principal foram preservadas. O servidor local usa webpack porque as dependências compartilhadas por link simbólico não são aceitas pelo Turbopack neste isolamento. O build foi realizado com as variáveis simuladas já usadas no CI; nenhum segredo foi necessário.

A entrega segue para PR em rascunho e preview. A publicação no domínio público depende da aprovação desse resultado visual, conforme o plano aprovado.
