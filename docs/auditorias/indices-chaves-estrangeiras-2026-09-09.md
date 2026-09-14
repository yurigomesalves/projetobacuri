# Auditoria de índices das chaves estrangeiras

Data: 09/09/2026.

## Achado

O advisor de desempenho do Supabase encontrou 12 chaves estrangeiras sem índice de
cobertura. Elas aparecem em tabelas de citações, marcadores, feedbacks, convites,
territórios indígenas e vínculos entre pessoas e organizações.

As tabelas ainda são pequenas: entre 0 e aproximadamente 1.604 registros nos alvos
medidos. Portanto, esta é uma correção preventiva. Os índices evitam varreduras
completas quando o acervo crescer e ajudam o Postgres a verificar atualizações e
exclusões nas tabelas referenciadas.

## Correção aplicada

A migração `0026_indices_chaves_estrangeiras.sql` cria os 12 índices indicados. É
uma operação aditiva: não altera dados e não remove índices existentes. O custo é
um pequeno aumento de armazenamento e de trabalho em futuras inserções e
atualizações.

Dois índices compostos de `pessoa_organizacoes` começam pelas mesmas colunas de
índices simples já existentes. Os simples não serão removidos nesta fase; uma
remoção exige observar uso real por mais tempo e seria uma decisão destrutiva.

## Verificação

- Os 12 índices constam no catálogo do Postgres.
- O advisor deixou de apontar chaves estrangeiras sem cobertura.
- As contagens permaneceram idênticas: 883 biografias, 1.604 fontes de biografia,
  157 marcadores de biografia, 388 fontes de eventos, 28 marcadores de eventos,
  4 feedbacks e 5 vínculos entre pessoas e organizações. As tabelas vazias
  `convites` e `evento_justica_fontes` continuaram vazias.
- Os 49 testes diretamente relacionados passaram antes da aplicação; a suíte
  completa foi executada no fechamento da fase.

O advisor passou a listar os índices novos como ainda não usados. Isso é esperado
logo após a criação e não constitui motivo para removê-los. O uso deve ser observado
durante o crescimento do acervo e a operação normal do produto.
