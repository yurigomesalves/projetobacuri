"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import GlossarioFontes from "./GlossarioFontes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { RespostaAcervo, ItemAcervo } from "@/lib/shared/tipos";
const tipos: Record<string, string> = {
  relatorio_oficial: "Relatório oficial",
  documento_repressao: "Documento da repressão",
  documento_inteligencia_estrangeira: "Inteligência estrangeira",
  imprensa_epoca: "Imprensa da época",
  producao_academica: "Pesquisa acadêmica",
  testemunho: "Testemunho",
  legislacao_decisao_judicial: "Lei ou decisão judicial",
  material_didatico_educativo: "Material educativo",
};
const Catalogo = createContext<{
  dados: RespostaAcervo | null;
  erro: boolean;
  carregando: boolean;
  carregar: () => void;
}>({ dados: null, erro: false, carregando: false, carregar: () => {} });
export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<RespostaAcervo | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const cache = useRef<RespostaAcervo | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const carregar = useCallback(() => {
    if (pending.current) return;
    if (cache.current) {
      setDados(cache.current);
      return;
    }
    setCarregando(true);
    setErro(false);
    pending.current = fetch("/api/transparencia/acervo")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d: RespostaAcervo) => {
        cache.current = d;
        setDados(d);
      })
      .catch(() => setErro(true))
      .finally(() => {
        pending.current = null;
        setCarregando(false);
      });
  }, []);
  return (
    <Catalogo.Provider value={{ dados, erro, carregando, carregar }}>
      {children}
    </Catalogo.Provider>
  );
}
function useCatalogo() {
  const c = useContext(Catalogo);
  const { carregar } = c;
  useEffect(() => {
    carregar();
  }, [carregar]);
  return c;
}
function Estado({ children }: { children: React.ReactNode }) {
  const c = useContext(Catalogo);
  if (c.erro)
    return (
      <div className="bk-card" role="alert">
        <p>Não foi possível carregar o catálogo.</p>
        <button className="bk-button" onClick={c.carregar}>
          Tentar novamente
        </button>
      </div>
    );
  if (!c.dados || c.carregando)
    return (
      <p role="status" className="bk-card">
        Carregando catálogo…
      </p>
    );
  if (!c.dados.total)
    return <p className="bk-card">Ainda não há documentos no catálogo.</p>;
  return children;
}
function Tabela({ itens }: { itens: ItemAcervo[] }) {
  return (
    <div className="bk-table-scroll">
      <table className="bk-table">
        <caption className="sr-only">
          Documentos do catálogo e suas referências
        </caption>
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Tipo documental</th>
            <th scope="col">Ano</th>
            <th scope="col">Referência</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.fonte_id}>
              <td>
                <strong>{i.titulo}</strong>
                <small>{i.autor_orgao}</small>
                <details>
                  <summary>Proveniência e contexto</summary>
                  <p>Classificação: {i.confiabilidade.replaceAll("_", " ")}.</p>
                  {i.nota_contexto && <p>{i.nota_contexto}</p>}
                  <p>Período: {i.periodo || "Não informado"}</p>
                </details>
              </td>
              <td data-label="Tipo">{tipos[i.tipo_fonte] || i.tipo_fonte}</td>
              <td data-label="Ano">
                {i.data_documento?.slice(0, 4) || "Não informado"}
              </td>
              <td>
                <a
                  href={i.url_origem}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fonte original ↗<span className="sr-only"> (nova aba)</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GraficoBarras({ itens }: { itens: Array<[string, number]> }) {
  const maximo = Math.max(1, ...itens.map(([, quantidade]) => quantidade));
  return (
    <ul className="bk-chart">
      {itens.map(([rotulo, quantidade]) => (
        <li key={rotulo}>
          <span>{rotulo}</span>
          <svg
            viewBox="0 0 200 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect width="200" height="12" rx="3" fill="var(--bk-border)" />
            <rect
              width={(quantidade / maximo) * 200}
              height="12"
              rx="3"
              fill="currentColor"
            />
          </svg>
          <strong>{quantidade}</strong>
        </li>
      ))}
    </ul>
  );
}

export function Acervo() {
  const { dados } = useCatalogo();
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "";
  const tipo = params.get("tipo") || "";
  const requested = Math.max(1, Number(params.get("pagina")) || 1);
  const catalogo = useMemo(
    () =>
      [...(dados?.itens || [])].sort((a, b) =>
        a.titulo.localeCompare(b.titulo, "pt-BR"),
      ),
    [dados],
  );
  const itens = useMemo(
    () =>
      catalogo.filter(
        (i) =>
          (!tipo || i.tipo_fonte === tipo) &&
          `${i.titulo} ${i.autor_orgao}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(
              q
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase(),
            ),
      ),
    [catalogo, q, tipo],
  );
  const porTipo = Object.entries(dados?.porTipo || {})
    .filter(([, quantidade]) => quantidade > 0)
    .map(
      ([chave, quantidade]) =>
        [tipos[chave] || chave, quantidade] as [string, number],
    )
    .sort((a, b) => b[1] - a[1]);
  const porDecada = useMemo(() => {
    const contagens = new Map<string, number>();
    for (const item of catalogo) {
      const ano = Number(item.data_documento?.slice(0, 4));
      const rotulo =
        Number.isInteger(ano) && ano > 0
          ? `${Math.floor(ano / 10) * 10}–${Math.floor(ano / 10) * 10 + 9}`
          : "Sem data informada";
      contagens.set(rotulo, (contagens.get(rotulo) || 0) + 1);
    }
    return [...contagens.entries()].sort(([a], [b]) => {
      if (a === "Sem data informada") return 1;
      if (b === "Sem data informada") return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [catalogo]);
  const autores = new Set(
    catalogo.map((item) => item.autor_orgao.trim().toLocaleLowerCase("pt-BR")),
  ).size;
  const notas = catalogo.filter((item) => item.nota_contexto?.trim()).length;
  const pages = Math.max(1, Math.ceil(itens.length / 20));
  const page = Math.min(Math.floor(requested), pages);
  function navigate(p: number) {
    const next = new URLSearchParams(params);
    next.set("pagina", String(p));
    router.push("/acervo?" + next, { scroll: false });
  }
  function csv() {
    const escape = (s: string) =>
      '"' + (/^[\s]*[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
    const text =
      "\uFEFF" +
      [
        ["Título", "Autoria", "Tipo", "Data", "Fonte"],
        ...itens.map((i) => [
          i.titulo,
          i.autor_orgao,
          tipos[i.tipo_fonte] || i.tipo_fonte,
          i.data_documento || "",
          i.url_origem,
        ]),
      ]
        .map((row) => row.map(escape).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "bacuri-acervo.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="bk-dashboard">
      <header className="bk-page-heading">
        <span className="bk-eyebrow">CONHECER · EXPLORAR · CONFERIR</span>
        <h1>Acervo documental</h1>
        <p>
          Conheça a composição do catálogo e consulte autoria, proveniência e
          contexto de cada documento.
        </p>
      </header>
      <Estado>
        <div className="bk-metrics">
          {[
            ["Documentos", dados?.total],
            ["Tipos documentais", porTipo.length],
            ["Autores e órgãos responsáveis", autores],
            ["Documentos com nota de contexto", notas],
          ].map(([rotulo, valor]) => (
            <article className="bk-card" key={rotulo}>
              <p>{rotulo}</p>
              <strong>{Number(valor || 0).toLocaleString("pt-BR")}</strong>
              <small>No catálogo atual</small>
            </article>
          ))}
        </div>

        <div className="bk-acervo-charts">
          <section className="bk-card">
            <span className="bk-eyebrow">NATUREZA DAS FONTES</span>
            <h2>Composição por tipo documental</h2>
            <p className="bk-muted">
              Quantidade de documentos em cada categoria editorial.
            </p>
            <GraficoBarras itens={porTipo} />
          </section>
          <section className="bk-card">
            <span className="bk-eyebrow">TEMPO DO DOCUMENTO</span>
            <h2>Distribuição por década</h2>
            <p className="bk-muted">
              Usa a data cadastrada do documento, não o período dos fatos
              narrados.
            </p>
            <GraficoBarras itens={porDecada} />
          </section>
        </div>

        <section
          className="bk-acervo-guide"
          aria-labelledby="como-explorar-acervo"
        >
          <div>
            <span className="bk-eyebrow">LEITURA ORIENTADA</span>
            <h2 id="como-explorar-acervo">Como explorar o acervo</h2>
          </div>
          <ol>
            <li>
              <strong>1. Localize</strong>
              <span>Pesquise pelo título ou pela autoria.</span>
            </li>
            <li>
              <strong>2. Contextualize</strong>
              <span>Observe tipo, período e nota editorial.</span>
            </li>
            <li>
              <strong>3. Confira</strong>
              <span>Acesse o documento em sua fonte original.</span>
            </li>
          </ol>
        </section>

        <p className="bk-method">
          Autores e órgãos são valores distintos do campo de autoria,
          normalizados apenas para contagem; não equivalem a pessoas
          identificadas. Notas de contexto explicam proveniência e limites, não
          são selo de confiabilidade.
        </p>

        <form
          action="/acervo"
          className="bk-filters"
          id="documentos"
          role="search"
          aria-label="Pesquisar no acervo"
        >
          <label>
            Título ou autoria
            <input
              name="q"
              type="search"
              defaultValue={q}
              key={q}
              placeholder="Pesquisar documentos"
            />
          </label>
          <label>
            Tipo documental
            <select name="tipo" defaultValue={tipo} key={tipo}>
              <option value="">Todos os tipos</option>
              {Object.keys(dados?.porTipo || {})
                .sort()
                .map((t) => (
                  <option value={t} key={t}>
                    {tipos[t] || t}
                  </option>
                ))}
            </select>
          </label>
          <button className="bk-button bk-primary">Filtrar</button>
          <Link href="/acervo" className="bk-button">
            Limpar
          </Link>
        </form>
        <section className="bk-card bk-table-card">
          <div className="bk-card-heading">
            <p role="status">{itens.length} documentos encontrados</p>
            <button
              onClick={csv}
              disabled={!itens.length}
              className="bk-button"
            >
              Exportar CSV
            </button>
          </div>
          {itens.length ? (
            <Tabela itens={itens.slice((page - 1) * 20, page * 20)} />
          ) : (
            <p className="bk-empty">
              Nenhum documento corresponde aos filtros.
            </p>
          )}
          <nav className="bk-pagination" aria-label="Paginação do acervo">
            <button
              className="bk-button"
              disabled={page <= 1}
              onClick={() => navigate(page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {pages}
            </span>
            <button
              className="bk-button"
              disabled={page >= pages}
              onClick={() => navigate(page + 1)}
            >
              Próxima
            </button>
          </nav>
        </section>
        <section className="bk-card mt-6">
          <h2>Como ler as fontes</h2>
          <p>
            O tipo documental e a classificação descrevem a natureza e os
            limites de uso da fonte. Documentos da repressão e imprensa da época
            exigem atenção às notas de contexto.
          </p>
          <GlossarioFontes />
          <Link className="underline" href="/transparencia">
            Conheça os critérios editoriais →
          </Link>
        </section>
      </Estado>
    </main>
  );
}
