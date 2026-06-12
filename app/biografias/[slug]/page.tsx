"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Citacoes from "@/app/componentes/Citacoes";
import type { Biografia, RespostaErro } from "@/lib/shared/tipos";

const ROTULO_TIPO: Record<string, string> = {
  vitima: "Vítima",
  organizacao: "Organização",
  perpetrador: "Perpetrador",
  local: "Local",
};

export default function BiografiaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [biografia, setBiografia] = useState<Biografia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      setNaoEncontrado(false);
      try {
        const res = await fetch(`/api/biografias/${slug}`);
        if (res.status === 404) {
          if (!cancelado) setNaoEncontrado(true);
          return;
        }
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          if (!cancelado) {
            setErro(dados.erro?.mensagem ?? "Não foi possível carregar esta página.");
          }
          return;
        }
        const dados: Biografia = await res.json();
        if (!cancelado) setBiografia(dados);
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar esta página. Verifique sua conexão.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [slug]);

  if (carregando) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Carregando...
        </p>
      </main>
    );
  }

  if (naoEncontrado) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Biografia não encontrada
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Não encontramos esta página no acervo. Ela pode ainda não ter sido
          publicada após revisão editorial, ou o endereço pode estar
          incorreto.
        </p>
        <p className="mt-4">
          <Link
            href="/biografias"
            className="text-sm font-medium text-neutral-800 underline underline-offset-2 dark:text-neutral-200"
          >
            Voltar para Nomes e histórias
          </Link>
        </p>
      </main>
    );
  }

  if (erro || !biografia) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {erro ?? "Não foi possível carregar esta página."}
        </p>
        <p className="mt-4">
          <Link
            href="/biografias"
            className="text-sm font-medium text-neutral-800 underline underline-offset-2 dark:text-neutral-200"
          >
            Voltar para Nomes e histórias
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <p className="mb-4">
        <Link
          href="/biografias"
          className="text-sm font-medium text-neutral-700 underline underline-offset-2 dark:text-neutral-300"
        >
          ← Nomes e histórias
        </Link>
      </p>

      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-100">
            {biografia.nome}
          </h1>
          <span className="rounded border border-neutral-400 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300">
            {ROTULO_TIPO[biografia.tipo] ?? biografia.tipo}
          </span>
        </div>
        {(biografia.municipio || biografia.uf) && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
            {[biografia.municipio, biografia.uf].filter(Boolean).join(" — ")}
          </p>
        )}
      </header>

      <article className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-800 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold dark:text-neutral-200">
        <ReactMarkdown>{biografia.texto_md}</ReactMarkdown>
      </article>

      {biografia.marcadores.length > 0 && (
        <section className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Marcadores
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            Trechos do texto acima e a fonte documental que comprova cada um.
          </p>
          <ul className="mt-3 space-y-3">
            {biografia.marcadores.map((m, i) => (
              <li
                key={i}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {m.marcador}
                </p>
                <div className="mt-2">
                  <Citacoes citacoes={[m.fonte]} idResposta={`marcador-${i}`} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {biografia.fontes.length > 0 && (
        <Citacoes citacoes={biografia.fontes} idResposta="biografia" />
      )}

      {biografia.eventos.length > 0 && (
        <section className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Eventos no mapa
          </h2>
          <ul className="mt-2 space-y-1">
            {biografia.eventos.map((eventoId) => (
              <li key={eventoId}>
                <Link
                  href={`/mapa?evento=${eventoId}`}
                  className="text-sm font-medium text-neutral-800 underline underline-offset-2 dark:text-neutral-200"
                >
                  Ver este evento no mapa
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
