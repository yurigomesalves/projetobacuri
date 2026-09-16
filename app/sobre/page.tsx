import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";

export const metadata: Metadata = {
  title: "Sobre — projeto_BACURI",
  description:
    "O que é o projeto_BACURI: a plataforma, a origem na pesquisa de mestrado, o nome e os compromissos editoriais.",
};

function idSecao(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// O texto vive em docs/ (curadoria com revisão humana) e é lido no build —
// a página é estática; mudar este texto exige novo deploy, de propósito:
// nenhum texto público muda sem passar pelo repositório.
export default async function SobrePage() {
  const caminho = path.join(process.cwd(), "docs", "sobre-projeto-bacuri.md");
  const texto = await fs.readFile(caminho, "utf-8");
  const secoes = Array.from(texto.matchAll(/^##\s+(.+)$/gm)).map(
    (resultado) => {
      const titulo = resultado[1].replaceAll(/[*_`]/g, "");
      return { titulo, id: idSecao(titulo) };
    },
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:py-12">
      {secoes.length > 0 && (
        <nav aria-label="Nesta página" className="lg:w-52 lg:shrink-0">
          <div className="bk-card p-4 lg:sticky lg:top-6">
            <p className="bk-eyebrow">Nesta página</p>
            <ul className="mt-3 space-y-2">
              {secoes.map((secao) => (
                <li key={secao.id}>
                  <a
                    href={`#${secao.id}`}
                    className="text-sm leading-relaxed text-neutral-600 underline-offset-4 hover:text-tinta-950 hover:underline dark:text-neutral-400 dark:hover:text-papel-50"
                  >
                    {secao.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
      <article className="bk-reading min-w-0 max-w-3xl flex-1 [&_a]:underline [&_a]:underline-offset-4 [&_h1]:mb-6 [&_h1]:font-sans [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-tinta-950 sm:[&_h1]:text-4xl dark:[&_h1]:text-papel-50 [&_h2]:mt-10 [&_h2]:scroll-mt-8 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-tinta-950 dark:[&_h2]:text-neutral-100 [&_h3]:font-sans [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 id={idSecao(String(children))}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 id={idSecao(String(children))}>{children}</h2>
            ),
          }}
        >
          {texto}
        </ReactMarkdown>
      </article>
    </main>
  );
}
