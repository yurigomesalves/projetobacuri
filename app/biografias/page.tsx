"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BiografiaResumo, Facetas, RespostaErro } from "@/lib/shared/tipos";

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

// Extrai o ano (YYYY) de uma data ISO "YYYY-MM-DD" das facetas; null se ausente.
function anoDe(iso: string | null): number | null {
  if (!iso) return null;
  const ano = Number(iso.slice(0, 4));
  return Number.isNaN(ano) ? null : ano;
}

const classeCampo =
  "mt-1 w-full rounded-md border border-papel-200 px-3 py-2 text-sm text-tinta-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100";

const classeRotulo =
  "block text-sm font-medium text-neutral-800 dark:text-neutral-200";

export default function BiografiasPage() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [ufNatal, setUfNatal] = useState("");
  const [organizacao, setOrganizacao] = useState("");
  const [periodoDe, setPeriodoDe] = useState("");
  const [periodoAte, setPeriodoAte] = useState("");
  const [pagina, setPagina] = useState(1);

  const [itens, setItens] = useState<BiografiaResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [facetas, setFacetas] = useState<Facetas | null>(null);

  // Facetas: opções de UF natal, organização e faixa de período. O backend
  // refina ufs/organizações/período conforme o `tipo`, então recarregamos
  // quando o tipo muda. As contagens de `tipo` cobrem todo o acervo.
  useEffect(() => {
    let cancelado = false;
    async function carregarFacetas() {
      try {
        const params = new URLSearchParams();
        if (tipo) params.set("tipo", tipo);
        const res = await fetch(`/api/biografias/facetas?${params.toString()}`);
        if (!res.ok) return;
        const dados: Facetas = await res.json();
        if (!cancelado) setFacetas(dados);
      } catch {
        // Sem facetas a interface ainda funciona (filtros ficam vazios);
        // não bloqueamos a listagem por causa disso.
      }
    }
    carregarFacetas();
    return () => {
      cancelado = true;
    };
  }, [tipo]);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (tipo) params.set("tipo", tipo);
        if (ufNatal) params.set("uf_natal", ufNatal);
        if (organizacao) params.set("organizacao", organizacao);
        if (periodoDe.trim()) params.set("periodo_de", periodoDe.trim());
        if (periodoAte.trim()) params.set("periodo_ate", periodoAte.trim());
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
  }, [q, tipo, ufNatal, organizacao, periodoDe, periodoAte, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const anoMin = anoDe(facetas?.periodo.min ?? null);
  const anoMax = anoDe(facetas?.periodo.max ?? null);

  const filtrosAtivos =
    Boolean(tipo) ||
    Boolean(ufNatal) ||
    Boolean(organizacao) ||
    Boolean(periodoDe) ||
    Boolean(periodoAte);

  function limparFiltros() {
    setTipo("");
    setUfNatal("");
    setOrganizacao("");
    setPeriodoDe("");
    setPeriodoAte("");
    setPagina(1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-papel-200 px-4 py-6 sm:px-6 dark:border-tinta-900">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-tinta-950 sm:text-3xl dark:text-papel-50">
            Nomes e histórias
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Pessoas, organizações e lugares ligados à Ditadura Militar-Empresarial,
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
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="busca-nome" className={classeRotulo}>
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
                className={classeCampo}
              />
            </div>

            <div>
              <label htmlFor="filtro-tipo" className={classeRotulo}>
                Tipo
              </label>
              <select
                id="filtro-tipo"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setPagina(1);
                }}
                className={`${classeCampo} sm:w-auto`}
              >
                {TIPOS.map((t) => {
                  const total = facetas?.tipos.find((f) => f.valor === t.valor)?.total;
                  return (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                      {t.valor && total !== undefined ? ` (${total})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="filtro-uf-natal" className={classeRotulo}>
                UF natal
              </label>
              <select
                id="filtro-uf-natal"
                value={ufNatal}
                onChange={(e) => {
                  setUfNatal(e.target.value);
                  setPagina(1);
                }}
                className={classeCampo}
              >
                <option value="">Todas</option>
                {(facetas?.ufs_natais ?? []).map((u) => (
                  <option key={u.uf} value={u.uf}>
                    {u.uf} ({u.total})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filtro-organizacao" className={classeRotulo}>
                Organização
              </label>
              <select
                id="filtro-organizacao"
                value={organizacao}
                onChange={(e) => {
                  setOrganizacao(e.target.value);
                  setPagina(1);
                }}
                className={classeCampo}
              >
                <option value="">Todas</option>
                {(facetas?.organizacoes ?? []).map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.nome} ({o.total})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="rounded-md border border-papel-200 p-3 dark:border-tinta-900">
            <legend className="px-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Período de atuação / perseguição
            </legend>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="periodo-de" className={classeRotulo}>
                  De (ano)
                </label>
                <input
                  id="periodo-de"
                  type="number"
                  inputMode="numeric"
                  min={anoMin ?? undefined}
                  max={anoMax ?? undefined}
                  value={periodoDe}
                  onChange={(e) => {
                    setPeriodoDe(e.target.value);
                    setPagina(1);
                  }}
                  placeholder={anoMin !== null ? String(anoMin) : "Ex.: 1964"}
                  className={classeCampo}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="periodo-ate" className={classeRotulo}>
                  Até (ano)
                </label>
                <input
                  id="periodo-ate"
                  type="number"
                  inputMode="numeric"
                  min={anoMin ?? undefined}
                  max={anoMax ?? undefined}
                  value={periodoAte}
                  onChange={(e) => {
                    setPeriodoAte(e.target.value);
                    setPagina(1);
                  }}
                  placeholder={anoMax !== null ? String(anoMax) : "Ex.: 1985"}
                  className={classeCampo}
                />
              </div>
            </div>
          </fieldset>

          {filtrosAtivos && (
            <div>
              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-md border border-papel-200 px-3 py-1.5 text-sm text-neutral-700 hover:border-tinta-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:border-tinta-800 dark:text-neutral-300"
              >
                Limpar filtros
              </button>
            </div>
          )}
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
                  className="block rounded-md border border-papel-200 bg-papel-50 p-4 hover:border-tinta-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:border-tinta-900 dark:bg-tinta-900 dark:hover:border-neutral-600"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold text-tinta-950 dark:text-neutral-100">
                      {item.nome}
                    </h2>
                    <span className="rounded border border-tinta-700 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-tinta-700 dark:text-neutral-300">
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
