"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  FeedbackCuradoria,
  RespostaErro,
} from "@/lib/shared/tipos";

// Área interna de curadoria — não deve ser indexada por buscadores.
// A diretiva "noindex" é definida em app/curadoria/layout.tsx, pois
// "use client" não permite exportar `metadata` estática.

type Status = "pendente" | "aceito" | "recusado";

const ABAS: { valor: Status; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "aceito", rotulo: "Aceitos" },
  { valor: "recusado", rotulo: "Recusados" },
];

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  util: "Útil",
  incompleta: "Incompleta",
  incorreta: "Incorreta",
};

const POR_PAGINA = 20;

export default function CuradoriaPage() {
  const [senha, setSenha] = useState("");
  const [senhaValida, setSenhaValida] = useState<string | null>(null);
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const [status, setStatus] = useState<Status>("pendente");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<FeedbackCuradoria[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const carregar = useCallback(
    async (senhaAtual: string, statusAtual: Status, paginaAtual: number) => {
      setCarregando(true);
      setErroLista(null);
      try {
        const res = await fetch(
          `/api/curadoria/feedbacks?status=${statusAtual}&pagina=${paginaAtual}`,
          { headers: { Authorization: `Bearer ${senhaAtual}` } }
        );
        if (res.status === 401) {
          setSenhaValida(null);
          setErroLogin("Senha incorreta.");
          return;
        }
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          setErroLista(dados.erro?.mensagem ?? "Não foi possível carregar a fila.");
          return;
        }
        const dados: { itens: FeedbackCuradoria[]; total: number; pagina: number } =
          await res.json();
        setItens(dados.itens);
        setTotal(dados.total);
      } catch {
        setErroLista("Não foi possível carregar a fila. Verifique sua conexão.");
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErroLogin(null);
    try {
      const res = await fetch("/api/curadoria/feedbacks?status=pendente&pagina=1", {
        headers: { Authorization: `Bearer ${senha}` },
      });
      if (res.status === 401) {
        setErroLogin("Senha incorreta.");
        return;
      }
      if (!res.ok) {
        const dados: RespostaErro = await res.json();
        setErroLogin(dados.erro?.mensagem ?? "Não foi possível verificar a senha.");
        return;
      }
      const dados: { itens: FeedbackCuradoria[]; total: number; pagina: number } =
        await res.json();
      setItens(dados.itens);
      setTotal(dados.total);
      setSenhaValida(senha);
    } catch {
      setErroLogin("Não foi possível verificar a senha. Verifique sua conexão.");
    } finally {
      setEntrando(false);
    }
  }

  useEffect(() => {
    if (senhaValida) {
      carregar(senhaValida, status, pagina);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senhaValida, status, pagina]);

  function trocarStatus(novo: Status) {
    setStatus(novo);
    setPagina(1);
  }

  function atualizarItem(atualizado: FeedbackCuradoria) {
    setItens((lista) =>
      lista.map((it) => (it.feedback_id === atualizado.feedback_id ? atualizado : it))
    );
  }

  function removerDaListaPendente(id: string) {
    if (status === "pendente") {
      setItens((lista) => lista.filter((it) => it.feedback_id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 px-4 py-4 sm:px-6 dark:border-neutral-800">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-100">
            Curadoria de avaliações
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Área interna de revisão. Decisões aceitas ou recusadas, com sua
            justificativa, são publicadas em{" "}
            <a
              href="/transparencia"
              className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              /transparencia
            </a>
            .
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {!senhaValida ? (
          <form onSubmit={entrar} className="max-w-sm space-y-3">
            <label className="block text-sm text-neutral-700 dark:text-neutral-300">
              Senha de curadoria
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="off"
                required
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </label>
            <button
              type="submit"
              disabled={entrando || senha.length === 0}
              className="rounded-md border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {entrando ? "Entrando..." : "Entrar"}
            </button>
            {erroLogin && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {erroLogin}
              </p>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              A senha é mantida apenas na memória desta aba e não é salva no
              dispositivo.
            </p>
          </form>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Filtrar por status"
              className="mb-4 flex gap-2 border-b border-neutral-200 dark:border-neutral-800"
            >
              {ABAS.map((aba) => (
                <button
                  key={aba.valor}
                  role="tab"
                  aria-selected={status === aba.valor}
                  onClick={() => trocarStatus(aba.valor)}
                  className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    status === aba.valor
                      ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                      : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>

            {carregando && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Carregando...
              </p>
            )}

            {erroLista && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {erroLista}
              </p>
            )}

            {!carregando && !erroLista && itens.length === 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Nenhum feedback {status === "pendente" ? "pendente" : status} no
                momento.
              </p>
            )}

            <ul className="space-y-4">
              {itens.map((item) => (
                <li key={item.feedback_id}>
                  <ItemFeedback
                    item={item}
                    senha={senhaValida}
                    onDecidido={(atualizado) => {
                      atualizarItem(atualizado);
                      removerDaListaPendente(atualizado.feedback_id);
                    }}
                  />
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
                  className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
                >
                  Anterior
                </button>
                <span className="text-neutral-600 dark:text-neutral-400">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas || carregando}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ItemFeedback({
  item,
  senha,
  onDecidido,
}: {
  item: FeedbackCuradoria;
  senha: string;
  onDecidido: (atualizado: FeedbackCuradoria) => void;
}) {
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const justificativaValida =
    justificativa.trim().length >= 10 && justificativa.trim().length <= 2000;

  async function decidir(decisao: "aceito" | "recusado") {
    if (!justificativaValida) return;
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/curadoria/feedbacks/${item.feedback_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${senha}`,
        },
        body: JSON.stringify({ decisao, justificativa: justificativa.trim() }),
      });

      if (res.ok) {
        const atualizado: FeedbackCuradoria = await res.json();
        onDecidido(atualizado);
        return;
      }

      const dados: RespostaErro = await res.json();
      if (res.status === 409) {
        setErro("Este feedback já foi decidido por outra sessão.");
      } else if (res.status === 401) {
        setErro("Sessão expirada ou senha inválida. Recarregue a página.");
      } else {
        setErro(dados.erro?.mensagem ?? "Não foi possível registrar a decisão.");
      }
    } catch {
      setErro("Não foi possível registrar a decisão. Verifique sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Enviado em {formatarData(item.criado_em)}
      </p>

      <h3 className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Pergunta do usuário
      </h3>
      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
        {item.interacao.pergunta}
      </p>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700 underline underline-offset-2 dark:text-neutral-300">
          ver resposta do assistente
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
          {item.interacao.resposta}
        </p>
      </details>

      <p className="mt-3 text-sm text-neutral-800 dark:text-neutral-200">
        <span className="font-semibold">Classificação: </span>
        {ROTULO_CLASSIFICACAO[item.classificacao] ?? item.classificacao}
      </p>

      {item.resposta_alternativa && (
        <div className="mt-2">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Resposta alternativa proposta
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
            {item.resposta_alternativa}
          </p>
        </div>
      )}

      {item.fontes_sugeridas && (
        <div className="mt-2">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Fontes sugeridas
          </h4>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            {item.fontes_sugeridas}
          </p>
        </div>
      )}

      {item.status === "pendente" ? (
        <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Justificativa da decisão (10–2000 caracteres)
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value.slice(0, 2000))}
              rows={3}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            />
            <span className="mt-1 block text-right text-xs text-neutral-500">
              {justificativa.length}/2000
            </span>
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Esta justificativa será publicada na página de transparência, junto
            com a decisão.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => decidir("aceito")}
              disabled={enviando || !justificativaValida}
              className="rounded-md border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {enviando ? "Enviando..." : "Aceitar"}
            </button>
            <button
              type="button"
              onClick={() => decidir("recusado")}
              disabled={enviando || !justificativaValida}
              className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              {enviando ? "Enviando..." : "Recusar"}
            </button>
          </div>

          {erro && (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
              {erro}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Status:{" "}
            <span
              className={
                item.status === "aceito"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-neutral-600 dark:text-neutral-400"
              }
            >
              {item.status === "aceito" ? "Aceito" : "Recusado"}
            </span>
            {item.decidido_em && ` em ${formatarData(item.decidido_em)}`}
          </p>
          {item.justificativa_decisao && (
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold">Justificativa: </span>
              {item.justificativa_decisao}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}
