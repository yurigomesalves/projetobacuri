"use client";

import { useEffect, useState } from "react";
import type { CuradorPublico, ItemTransparencia, RespostaErro } from "@/lib/shared/tipos";
import AcervoDocumental from "@/app/componentes/AcervoDocumental";

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  util: "Útil",
  incompleta: "Incompleta",
  incorreta: "Incorreta",
};

const POR_PAGINA = 20;

export default function TransparenciaPage() {
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<ItemTransparencia[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [curadores, setCuradores] = useState<CuradorPublico[]>([]);
  const [carregandoCuradores, setCarregandoCuradores] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function carregarCuradores() {
      try {
        const res = await fetch("/api/transparencia/curadores");
        if (!res.ok) return;
        const dados: { itens: CuradorPublico[] } = await res.json();
        if (!cancelado) setCuradores(dados.itens);
      } catch {
        // seção é omitida em caso de erro; não bloqueia o resto da página
      } finally {
        if (!cancelado) setCarregandoCuradores(false);
      }
    }
    carregarCuradores();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const res = await fetch(`/api/transparencia?pagina=${pagina}`);
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          if (!cancelado) {
            setErro(dados.erro?.mensagem ?? "Não foi possível carregar a lista.");
          }
          return;
        }
        const dados: { itens: ItemTransparencia[]; total: number; pagina: number } =
          await res.json();
        if (!cancelado) {
          setItens(dados.itens);
          setTotal(dados.total);
        }
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar a lista. Verifique sua conexão.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-papel-200 px-4 py-6 sm:px-6 dark:border-tinta-900">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-tinta-950 sm:text-3xl dark:text-papel-50">
            Transparência editorial
          </h1>
          {/* Texto definitivo aprovado em docs/revisao-editorial-fase4.md */}
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <p>
              Esta página mostra como o Projeto Bacuri lida com as
              avaliações enviadas por quem usa o assistente. Quando alguém marca
              uma resposta como incompleta ou incorreta e propõe um texto
              alternativo ou novas fontes, essa contribuição{" "}
              <strong>não muda o acervo automaticamente</strong>. Ela entra em uma
              fila e é lida, uma a uma, por uma pessoa responsável pela curadoria
              histórica do projeto.
            </p>
            <p>
              Cada contribuição é avaliada por três critérios. Primeiro,
              fidelidade às fontes documentais: a proposta precisa se basear em
              documentos reais — como o Relatório da Comissão Nacional da Verdade,
              pesquisas acadêmicas ou depoimentos — e não em opinião pessoal.
              Segundo, citação verificável: é preciso indicar de onde a informação
              vem, com autor, documento e, quando possível, página, para que
              qualquer pessoa possa checar. Terceiro, recusa de negacionismo:
              propostas que tentem minimizar, justificar ou colocar em dúvida
              crimes documentados da ditadura — como tortura, mortes e
              desaparecimentos forçados — são recusadas. Esses fatos não são
              tratados como uma opinião entre outras: eles estão registrados em
              documentos oficiais, com nomes, datas e responsáveis, e é assim que
              o projeto os apresenta.
            </p>
            <p>
              Toda decisão — aceitar ou recusar — é publicada nesta página, junto
              com a justificativa de quem decidiu. Isso vale tanto para quem
              concorda quanto para quem discorda do projeto: nada é decidido
              &quot;por trás das cortinas&quot;.
            </p>
            <p>
              Este trabalho existe para ajudar a preservar a memória das pessoas
              atingidas pela ditadura, contar a história com base em provas e
              documentos, e contribuir para que o Brasil enfrente esse período com
              verdade e justiça.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {!carregandoCuradores && curadores.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold tracking-tight text-tinta-950 dark:text-papel-50">
              Quem faz a curadoria
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              As pessoas listadas abaixo avaliam, à luz das fontes documentais,
              as contribuições enviadas ao projeto e decidem, com
              justificativa pública, o que entra ou não no acervo. A curadoria
              reúne pesquisadoras e pesquisadores, professoras e professores e
              integrantes de movimentos sociais e de memória — uma
              pluralidade que reflete o compromisso do projeto com a
              colaboração e com a transparência sobre quem participa dessa
              avaliação.
            </p>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {curadores.map((c, i) => (
                <li
                  key={i}
                  className="rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900"
                >
                  <div className="flex items-center gap-3">
                    {c.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.foto_url}
                        alt={`Foto de ${c.nome}`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-papel-100 text-sm font-semibold text-tinta-950 dark:bg-tinta-800 dark:text-neutral-100"
                      >
                        {c.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
                        {c.nome}
                      </p>
                      {c.organizacao && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          {c.organizacao}
                        </p>
                      )}
                    </div>
                  </div>
                  {c.sobre && (
                    <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                      {c.sobre}
                    </p>
                  )}
                  {c.lattes_url && (
                    <a
                      href={c.lattes_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      Currículo Lattes
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Acervo documental */}
        <section className="mt-8">
          <h2 className="font-sans text-base font-semibold uppercase tracking-wide text-tinta-950 dark:text-neutral-100">
            O acervo do projeto
          </h2>
          <AcervoDocumental />
        </section>

        {carregando && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Carregando...
          </p>
        )}

        {erro && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {erro}
          </p>
        )}

        {!carregando && !erro && itens.length === 0 && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Nenhuma decisão de curadoria publicada até o momento.
          </p>
        )}

        <ul className="space-y-4">
          {itens.map((item) => (
            <li
              key={item.feedback_id}
              className="rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Enviado em {formatarData(item.criado_em)} · decidido em{" "}
                {formatarData(item.decidido_em)}
              </p>

              <h3 className="mt-1 text-sm font-semibold text-tinta-950 dark:text-neutral-100">
                Pergunta original
              </h3>
              <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {item.pergunta}
              </p>

              <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">
                <span className="font-semibold">Classificação: </span>
                {ROTULO_CLASSIFICACAO[item.classificacao] ?? item.classificacao}
              </p>

              {item.resposta_alternativa && (
                <div className="mt-2">
                  <h4 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
                    Resposta alternativa proposta
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                    {item.resposta_alternativa}
                  </p>
                </div>
              )}

              {item.fontes_sugeridas && (
                <div className="mt-2">
                  <h4 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
                    Fontes sugeridas
                  </h4>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                    {item.fontes_sugeridas}
                  </p>
                </div>
              )}

              <div className="mt-3 border-t border-papel-200 pt-3 dark:border-tinta-900">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Decisão:{" "}
                  <span
                    className={
                      item.status === "aceito"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-neutral-600 dark:text-neutral-400"
                    }
                  >
                    {item.status === "aceito" ? "Aceita" : "Recusada"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold">Justificativa: </span>
                  {item.justificativa_decisao}
                </p>
                {item.decidido_por_nome && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                    Decisão por {item.decidido_por_nome}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {total > POR_PAGINA && (
          <nav
            aria-label="Paginação"
            className="mt-6 flex items-center justify-between text-sm"
          >
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || carregando}
              className="rounded-md border border-papel-200 px-3 py-1.5 disabled:opacity-50 dark:border-tinta-800"
            >
              Anterior
            </button>
            <span className="text-neutral-600 dark:text-neutral-400">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || carregando}
              className="rounded-md border border-papel-200 px-3 py-1.5 disabled:opacity-50 dark:border-tinta-800"
            >
              Próxima
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}
