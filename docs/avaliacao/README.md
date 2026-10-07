# Avaliação documental do RAG — piloto

## Memória de encerramento

O estado consolidado de conteúdo e design das respostas, incluindo publicações
dos PRs #2/#3/#4 em 6 de outubro de 2026, está na
[memória do projeto](../memoria-projeto.md). Consultar esse registro para distinguir
entregas publicadas, resultados amostrais e pesquisa experimental. Os relatórios
abaixo preservam o estado e as limitações de cada avaliação.

Estado: conjunto-ouro com P01–P24 e P31 aprovado e âncoras de evidência auditadas em 9 de setembro de 2026. P24 foi dividida para separar a questão geral sobre registros clandestinos da análise do caso Ismene em P31.

## Plano e critério de passagem

1. Revisar as 30 perguntas de `perguntas.md`: pertinência didática, recortes e limites da resposta.
2. Conferir cada evidência no documento original, registrar autoria, URL, página física do PDF e página impressa separadamente. O campo `pagina` do JSONL é apenas o localizador da extração até essa conferência.
3. Registrar trechos suficientes para sustentar a resposta esperada, com hash do arquivo e versão da extração. Os documentos locais não são prova de indexação no banco público.
4. Yuri aprova os itens e suas respostas esperadas. Só então promover a um arquivo `perguntas-ouro.json` e executar o baseline.

Este piloto é de desenvolvimento: todas as perguntas estão visíveis e podem orientar ajustes. Uma avaliação final exige perguntas novas reservadas, que não sejam usadas para escolher parâmetros. Não dividir paráfrases ou continuações do mesmo caso entre ajuste e teste reservado.

## Registro mínimo por item validado

ID; pergunta; histórico exato; categoria; comportamento esperado (responder, responder parcialmente, pedir esclarecimento ou reconhecer insuficiência); afirmações esperadas; afirmações proibidas; evidências aceitas; responsável e data da revisão.

Cada evidência registra: slug do catálogo (não confundir com UUID do banco), título, autor do capítulo e órgão responsável, URL do catálogo, arquivo local, SHA-256, localizador da extração, página PDF, página impressa, trecho e contexto. Se faltar informação, usar `null` e manter o item pendente. Para documentos reproduzidos, registrar também sua autoria original e distinguir a voz do relatório.

Um trecho encontrado é evidência candidata, não resposta completa. Sumários servem para localizar capítulos, não para comprovar acontecimentos. Divergências entre fontes precisam de duas evidências verificadas; não criar contradições apenas para preencher uma categoria.

## Rubrica humana

Pontuar de 0 a 2 cada dimensão: 0 = falha, 1 = parcial, 2 = adequada. Registrar justificativa e trechos examinados.

| Dimensão | Para obter 2 |
|---|---|
| Recuperação | Recupera as evidências necessárias, com diversidade documental quando exigida |
| Sustentação | Cada afirmação factual é apoiada pelo trecho citado e respeita seus limites |
| Referências | Autor, documento, página e link correspondem à evidência; todos os marcadores existem |
| Crítica documental | Distingue testemunho, registro repressivo, interpretação e conclusão da comissão |
| Adequação didática | Português claro, tom sóbrio, resposta proporcional à pergunta e caminhos de pesquisa |
| Insuficiência | Explicita lacunas, pede esclarecimento quando necessário e não completa fatos por suposição |

Referência inventada, acusação sem apoio ou reprodução de instrução maliciosa como comando são falhas bloqueantes, independentemente da média. A revisão editorial final é humana.

## Métricas e execução futura

- Recall@8: proporção de unidades de evidência esperadas encontradas nos oito resultados. Uma unidade pode aceitar vários chunks equivalentes; não contar sobreposições como evidências diferentes. Sem lista validada ou correspondência entre página e chunks, registrar **não calculável**.
- Sustentação: afirmações factuais apoiadas / afirmações factuais avaliadas. Registrar separadamente cobertura de citações e referências inválidas; marcadores válidos não provam apoio semântico.
- Insuficiência: medir acertos nos casos sem evidência e recusas indevidas nos casos respondíveis, separadamente. Uma busca vazia não comprova ausência em todo o acervo.
- Registrar modelo/provedor efetivos, prompt, parâmetros, versão do índice, IDs dos chunks, latência, tentativas e tokens. Tokens ausentes são desconhecidos, nunca zero.

O baseline da recuperação atual (E5, busca vetorial, oito resultados) está em [resultados-baseline.md](resultados-baseline.md), com diagnóstico ampliado em [resultados-diagnostico-50.md](resultados-diagnostico-50.md). A conferência das páginas e as mudanças no mapa estão em [auditoria-ancoras-2026-09-09.md](auditoria-ancoras-2026-09-09.md). A busca híbrida foi medida no mesmo conjunto em [resultados-hibrida.md](resultados-hibrida.md), e a comparação e a decisão estão em [comparacao-busca-hibrida-2026-09-09.md](comparacao-busca-hibrida-2026-09-09.md). As 10 evidências ainda ausentes no top 50 foram examinadas em [auditoria-evidencias-fora-top50-2026-09-09.md](auditoria-evidencias-fora-top50-2026-09-09.md). O ensaio seguinte descartou o primeiro reranqueador e mediu o potencial da busca dentro das fontes em [reranqueador-e-roteamento-por-fonte-2026-09-09.md](reranqueador-e-roteamento-por-fonte-2026-09-09.md). A seleção automática das fontes e o tamanho do conjunto intermediário estão em [roteamento-automatico-fontes-2026-09-09.md](roteamento-automatico-fontes-2026-09-09.md). O teto com subconsultas formuladas após leitura do gabarito está em [decomposicao-curada-2026-09-09.md](decomposicao-curada-2026-09-09.md). A avaliação de geração vem após definição de teto financeiro por Yuri.

## Limites desta entrega

As respostas P01–P24 e P31 estão em [respostas-candidatas.md](respostas-candidatas.md), com hashes, paginação e limites por item. A decisão humana de Yuri está registrada em [revisao-editorial.md](revisao-editorial.md), e o conjunto formal está em [perguntas-ouro.json](perguntas-ouro.json).

A auditoria visual cobre as páginas especificadas para as 25 perguntas aprovadas, não uma validação historiográfica integral de cada PDF. O baseline mede se fonte e página esperadas aparecem nos resultados; ele não avalia se uma resposta gerada seria correta ou integralmente sustentada. P25–P30 continuam fora do conjunto-ouro atual.

Os seis testes aprovados de continuidade, privacidade, esclarecimento e resistência
à fabricação estão detalhados na
[revisão de P25–P30](proposta-revisao-p25-p30-2026-09-10.md). Suas métricas são
separadas das 25 perguntas factuais e das 32 unidades de evidência.
A primeira execução, a correção de privacidade e o resultado de 3 aprovações e 3
itens parciais estão na
[avaliação conversacional](avaliacao-conversacional-2026-09-10.md).
A possível continuidade das fontes citadas foi delimitada em uma
[proposta técnica](proposta-continuidade-fontes-2026-09-10.md), ainda sem alteração
do contrato ou do produto.
