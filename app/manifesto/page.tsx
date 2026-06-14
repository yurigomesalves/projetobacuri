import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";

export const metadata: Metadata = {
  title: "Manifesto — Projeto Bacuri",
  description:
    "Manifesto do projeto: por que existe, o nome e os princípios que o orientam.",
};

// O texto vive em docs/ (curadoria com revisão humana) e é lido no build —
// a página é estática; mudar o manifesto exige novo deploy, de propósito:
// nenhum texto público muda sem passar pelo repositório.
export default async function ManifestoPage() {
  const caminho = path.join(process.cwd(), "docs", "manifesto-projeto-bacuri.md");
  const texto = await fs.readFile(caminho, "utf-8");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <article className="space-y-3 font-serif text-sm leading-relaxed text-neutral-800 [&_a]:underline [&_a]:underline-offset-2 [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-tinta-950 sm:[&_h1]:text-3xl dark:[&_h1]:text-papel-50 [&_h2]:mt-4 [&_h2]:font-sans [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-tinta-950 dark:[&_h2]:text-neutral-100 [&_h3]:font-sans [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold dark:text-neutral-200">
        <ReactMarkdown>{texto}</ReactMarkdown>
      </article>
    </main>
  );
}
