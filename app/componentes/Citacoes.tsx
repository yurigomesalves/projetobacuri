import type { Citacao } from "@/lib/shared/tipos";

type Props = {
  citacoes: Citacao[];
  /** Prefixo único para as âncoras, evita colisão entre várias respostas na mesma página. */
  idResposta: string;
};

/**
 * Bloco "Fontes" exibido sob cada resposta do assistente.
 * Cada citação cumpre o princípio 3 (referência autoral): título, autor/órgão,
 * página(s) e link para a fonte original.
 */
export default function Citacoes({ citacoes, idResposta }: Props) {
  if (citacoes.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Fontes citadas nesta resposta"
      className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800"
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Fontes
      </h3>
      <ol className="space-y-3 text-sm">
        {citacoes.map((citacao) => (
          <li
            key={citacao.n}
            id={`${idResposta}-fonte-${citacao.n}`}
            className="scroll-mt-20 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                [{citacao.n}]
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {citacao.titulo}
              </span>
              {citacao.tipo_chunk === "nota_rodape" && (
                <span className="rounded border border-neutral-400 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300">
                  nota de rodapé
                </span>
              )}
            </div>

            <p className="mt-1 text-neutral-700 dark:text-neutral-300">
              {citacao.autor_orgao}
              {citacao.data_documento && ` — ${citacao.data_documento}`}
            </p>

            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              {citacao.paginas
                ? `Página(s): ${citacao.paginas}`
                : "Página não informada"}
              {citacao.secao && ` · Seção: ${citacao.secao}`}
            </p>

            {citacao.nota_contexto && (
              <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <strong>Nota de contexto: </strong>
                {citacao.nota_contexto}
              </p>
            )}

            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-neutral-700 underline underline-offset-2 dark:text-neutral-300">
                ver trecho
              </summary>
              <blockquote className="mt-2 border-l-2 border-neutral-300 pl-3 text-sm italic text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                {citacao.trecho}
              </blockquote>
            </details>

            <p className="mt-2">
              <a
                href={citacao.url_origem}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-neutral-800 underline underline-offset-2 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
              >
                Ver fonte original
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
