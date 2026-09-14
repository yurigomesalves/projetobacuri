# Proposta técnica — continuidade de fontes em perguntas de seguimento

Data: 10 de setembro de 2026. Estado: **proposta, sem implementação**.

> Revisão de 14/09/2026: a proposta original abaixo foi preservada como histórico.
> O campo `fontes_ids` não está aprovado para implementação. Os bloqueios e o
> protocolo de validação estão em
> [revisao-tecnica-continuidade-2026-09-14.md](revisao-tecnica-continuidade-2026-09-14.md).

## Problema observado

A interface mantém as citações para exibição, mas envia ao servidor somente `papel`
e `conteudo` das mensagens anteriores. Em P25–P27, concatenar a última pergunta do
usuário melhorou a compreensão do referente, porém não garantiu a recuperação das
fontes aprovadas. O texto da conversa preserva o assunto, mas perde a trilha
documental da resposta anterior.

## Mudança de contrato proposta

Permitir em mensagens do assistente um campo opcional:

```ts
fontes_ids?: string[] // UUIDs únicos, no máximo 8
```

O frontend preencheria o campo a partir das citações já exibidas. O servidor só o
usaria quando a nova mensagem dependesse explicitamente do histórico. Mensagens do
usuário não poderiam declarar fontes anteriores, evitando que esse campo se torne um
atalho para injetar documentos arbitrários.

## Estratégia de recuperação proposta

1. Gerar a busca vetorial contextual já existente com a última pergunta do usuário
   e a continuação atual.
2. Executar uma busca textual restrita às fontes citadas na última resposta do
   assistente, usando a RPC experimental da migração 0027.
3. Recarregar os metadados completos dos chunks encontrados e aplicar a redação de
   contatos pessoais antes do prompt.
4. Mesclar os candidatos por `chunk_id`, preservar diversidade de documentos e
   limitar o contexto final a oito trechos.
5. Tratar as fontes anteriores como prioridade suave: a busca geral permanece
   disponível para mudanças reais de assunto e para corrigir uma resposta anterior.

## Salvaguardas

- não reutilizar texto gerado pelo assistente como evidência;
- não aceitar UUIDs de fonte em mensagens com `papel = usuario`;
- não restringir toda continuação às fontes anteriores;
- manter telefone e e-mail omitidos em todas as etapas;
- registrar separadamente quais chunks vieram da busca geral e da continuidade;
- não promover pesos ou quantidades com base somente em P25–P27.

## Critério de passagem

Antes da implementação pública, criar perguntas conversacionais inéditas com três
situações: continuidade na mesma fonte, mudança de fonte dentro do mesmo tema e
mudança completa de assunto. A solução deve melhorar a primeira sem prejudicar as
duas últimas e deve manter no máximo oito citações válidas.

## Dependências e impacto

A mudança afeta `docs/contrato-api.md`, `lib/shared/tipos.ts`,
`app/componentes/Chat.tsx`, `app/api/chat/route.ts` e testes. A migração 0027 já
fornece a busca textual por fontes; não há necessidade demonstrada de nova migração.
Esta proposta não foi implementada porque os três itens que a motivaram já foram
vistos durante o ajuste e não podem validar sozinhos o ganho.
