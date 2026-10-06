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
      className="bk-chat-sources"
    >
      <h3 className="bk-chat-sources-heading">
        Fontes citadas <span>({citacoes.length})</span>
      </h3>
      <ol className="bk-chat-source-list">
        {citacoes.map((citacao) => (
          <li
            key={citacao.n}
            id={`${idResposta}-fonte-${citacao.n}`}
            tabIndex={-1}
            className="bk-chat-source scroll-mt-20"
          >
            <div className="bk-chat-source-title">
              <span aria-label={`Fonte ${citacao.n}`} className="bk-chat-source-number">
                [{citacao.n}]
              </span>
              <span className="bk-chat-source-name">{citacao.titulo}</span>
              {citacao.tipo_chunk === "nota_rodape" && (
                <span className="bk-chat-source-badge">
                  nota de rodapé
                </span>
              )}
            </div>

            <p className="bk-chat-source-meta">
              {citacao.autor_orgao}
              {citacao.data_documento && ` — ${citacao.data_documento}`}
              {" · "}
              {citacao.paginas
                ? `p. ${citacao.paginas}`
                : "página não informada"}
              {citacao.secao && ` · ${citacao.secao}`}
            </p>

            {citacao.nota_contexto && (
              <p className="bk-chat-source-context">
                <strong>Contexto da fonte: </strong>
                {citacao.nota_contexto}
              </p>
            )}

            <div className="bk-chat-source-actions">
              <details>
                <summary>
                  Ver trecho citado
                </summary>
                <blockquote className="bk-chat-source-excerpt">
                  {citacao.trecho}
                </blockquote>
              </details>
              <a
                href={citacao.url_origem}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver fonte original
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
