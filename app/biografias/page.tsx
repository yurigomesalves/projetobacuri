"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BiografiaResumo, RespostaErro } from "@/lib/shared/tipos";

const POR_PAGINA = 20;

const TIPOS: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "vitima", rotulo: "Vítimas" },
  { valor: "organizacao", rotulo: "Organizações" },
  { valor: "perpetrador", rotulo: "Perpetradores" },
  { valor: "local", rotulo: "Locais" },
];

const ROTULO_TIPO: Record<string, string> = {
  vitima: "Vítima",
  organizacao: "Organização",
  perpetrador: "Perpetrador",
  local: "Local",
};

export default function BiografiasPage() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<BiografiaResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (tipo) params.set("tipo", tipo);
        params.set("pagina", String(pagina));
        const res = await fetch(`/api/biografias?${params.toString()}`);
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          if (!cancelado) {
            if (dados.erro?.codigo === "ACERVO_SEM_RESULTADO") {
              setItens([]);
              setTotal(0);
            } else {
              setErro(dados.erro?.mensagem ?? "Não foi possível carregar a lista.");
            }
          }
          return;
        }
        const dados: { itens: BiografiaResumo[]; total: number; pagina: number } =
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
  }, [q, tipo, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-creme-200 px-4 py-4 sm:px-6 dark:border-verde-900">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-xl font-semibold tracking-tight text-verde-950 sm:text-2xl dark:text-neutral-100">
            Nomes e histórias
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Pessoas, organizações e lugares ligados à Ditadura Civil-Militar,
            com minibiografia e fontes documentais. Acervo em construção.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPagina(1);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="busca-nome"
              className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >
              Buscar por nome
            </label>
            <input
              id="busca-nome"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagina(1);
              }}
              placeholder="Ex.: Vladimir Herzog"
              className="mt-1 w-full rounded-md border border-creme-200 px-3 py-2 text-sm text-verde-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:border-verde-800 dark:bg-verde-900 dark:text-neutral-100"
            />
          </div>

          <div>
            <label
              htmlFor="filtro-tipo"
              className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >
              Tipo
            </label>
            <select
              id="filtro-tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setPagina(1);
              }}
              className="mt-1 w-full rounded-md border border-creme-200 px-3 py-2 text-sm text-verde-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:border-verde-800 dark:bg-verde-900 dark:text-neutral-100 sm:w-auto"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="mt-6">
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
              Nenhum resultado encontrado para esta busca.
            </p>
          )}

          <ul className="space-y-3">
            {itens.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/biografias/${item.slug}`}
                  className="block rounded-md border border-creme-200 bg-creme-50 p-4 hover:border-verde-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:border-verde-900 dark:bg-verde-900 dark:hover:border-neutral-600"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold text-verde-950 dark:text-neutral-100">
                      {item.nome}
                    </h2>
                    <span className="rounded border border-verde-700 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-verde-700 dark:text-neutral-300">
                      {ROTULO_TIPO[item.tipo] ?? item.tipo}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                    {item.resumo_1_linha}
                  </p>
                  {(item.municipio || item.uf) && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                      {[item.municipio, item.uf].filter(Boolean).join(" — ")}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {total > POR_PAGINA && (
          <nav
            aria-label="Paginação"
            className="mt-6 flex items-center justify-between text-sm"
          >
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || carregando}
              className="rounded-md border border-creme-200 px-3 py-1.5 disabled:opacity-50 dark:border-verde-800"
            >
              Anterior
            </button>
            <span className="text-neutral-600 dark:text-neutral-400">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || carregando}
              className="rounded-md border border-creme-200 px-3 py-1.5 disabled:opacity-50 dark:border-verde-800"
            >
              Próxima
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
