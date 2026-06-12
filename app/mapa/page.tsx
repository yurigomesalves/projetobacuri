"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Citacoes from "@/app/componentes/Citacoes";
import type { EventoGeo, RespostaErro } from "@/lib/shared/tipos";
import type { Feature, FeatureCollection } from "geojson";

const MapaEventos = dynamic(() => import("@/app/componentes/MapaEventos"), {
  ssr: false,
  loading: () => (
    <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
      Carregando mapa...
    </p>
  ),
});

const TIPO_VIOLENCIA_INDIGENA = "violencia_contra_povos_indigenas";

// Vocabulário fechado de tipo_crime — docs/taxonomia.md, seção 6 (inclui ADR-008).
const ROTULOS_CRIME: Record<string, string> = {
  prisao_ilegal_arbitraria: "Prisão ilegal e arbitrária",
  tortura: "Tortura",
  execucao_sumaria: "Execução sumária",
  desaparecimento_forcado: "Desaparecimento forçado",
  ocultacao_de_cadaver: "Ocultação de cadáver",
  violencia_sexual: "Violência sexual",
  violencia_contra_povos_indigenas: "Violência contra povos indígenas",
  perseguicao_exilio_banimento: "Perseguição, exílio e banimento",
  censura: "Censura",
  atentado_a_populacao_civil: "Atentado contra a população civil",
};

function rotuloCrime(tipo: string): string {
  return (
    ROTULOS_CRIME[tipo] ??
    tipo.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export default function MapaPage() {
  return (
    <Suspense
      fallback={
        <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
          Carregando...
        </p>
      }
    >
      <MapaConteudo />
    </Suspense>
  );
}

function MapaConteudo() {
  const searchParams = useSearchParams();
  const eventoInicial = searchParams.get("evento");

  const [features, setFeatures] = useState<Feature[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [mostrarCasos, setMostrarCasos] = useState(true);
  const [mostrarIndigena, setMostrarIndigena] = useState(true);

  const [eventoSelecionado, setEventoSelecionado] = useState<EventoGeo | null>(null);
  const [carregandoEvento, setCarregandoEvento] = useState(false);
  const [erroEvento, setErroEvento] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregandoLista(true);
      setErroLista(null);
      try {
        const res = await fetch("/api/eventos-geo");
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          if (!cancelado) {
            setErroLista(dados.erro?.mensagem ?? "Não foi possível carregar o mapa.");
          }
          return;
        }
        const dados: FeatureCollection = await res.json();
        if (!cancelado) setFeatures(dados.features ?? []);
      } catch {
        if (!cancelado) {
          setErroLista("Não foi possível carregar o mapa. Verifique sua conexão.");
        }
      } finally {
        if (!cancelado) setCarregandoLista(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (eventoInicial) {
      selecionarEvento(eventoInicial);
    }
  }, [eventoInicial]);

  async function selecionarEvento(eventoId: string) {
    setCarregandoEvento(true);
    setErroEvento(null);
    setEventoSelecionado(null);
    try {
      const res = await fetch(`/api/eventos-geo/${eventoId}`);
      if (!res.ok) {
        const dados: RespostaErro = await res.json();
        setErroEvento(dados.erro?.mensagem ?? "Não foi possível carregar este evento.");
        return;
      }
      const dados: EventoGeo = await res.json();
      setEventoSelecionado(dados);
    } catch {
      setErroEvento("Não foi possível carregar este evento. Verifique sua conexão.");
    } finally {
      setCarregandoEvento(false);
    }
  }

  function ehEventoIndigena(feature: Feature): boolean {
    const tipos = (feature.properties as { tipos_crime?: string[] })?.tipos_crime ?? [];
    return tipos.includes(TIPO_VIOLENCIA_INDIGENA);
  }

  const featuresVisiveis = features.filter((f) => {
    const indigena = ehEventoIndigena(f);
    if (indigena) return mostrarIndigena;
    return mostrarCasos;
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 px-4 py-4 sm:px-6 dark:border-neutral-800">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-100">
            Mapa
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Casos, operações e territórios documentados da Ditadura
            Civil-Militar no Brasil. Clique em um marcador ou área para ver os
            detalhes.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
            Nota de precisão geográfica: as localizações e áreas exibidas são
            aproximadas, para fins de representação histórica e educativa.
            Os polígonos não correspondem a limites oficiais de territórios ou
            terras indígenas. A proveniência de cada geometria está documentada
            no repositório público do projeto.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-3 lg:order-1">
          <fieldset className="flex flex-wrap gap-4 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Camadas
            </legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarCasos}
                onChange={(e) => setMostrarCasos(e.target.checked)}
              />
              Casos e operações
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarIndigena}
                onChange={(e) => setMostrarIndigena(e.target.checked)}
              />
              Violência contra povos indígenas
            </label>
          </fieldset>

          {erroLista && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {erroLista}
            </p>
          )}

          {carregandoLista ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Carregando mapa...
            </p>
          ) : (
            <div className="h-[60vh] min-h-[320px] overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
              <MapaEventos features={featuresVisiveis} onSelecionar={selecionarEvento} />
            </div>
          )}
        </div>

        <aside className="w-full lg:order-2 lg:w-96" aria-label="Detalhes do evento selecionado">
          {carregandoEvento && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Carregando evento...
            </p>
          )}

          {erroEvento && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {erroEvento}
            </p>
          )}

          {!carregandoEvento && !erroEvento && !eventoSelecionado && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Selecione um marcador ou área no mapa para ver os detalhes do
              evento.
            </p>
          )}

          {eventoSelecionado && (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {eventoSelecionado.titulo}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                {formatarData(eventoSelecionado.data)} ·{" "}
                {eventoSelecionado.municipio} — {eventoSelecionado.uf}
              </p>

              {eventoSelecionado.tipos_crime.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {eventoSelecionado.tipos_crime.map((tipo) => (
                    <li
                      key={tipo}
                      className="rounded border border-neutral-400 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
                    >
                      {rotuloCrime(tipo)}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-800 [&_a]:underline [&_a]:underline-offset-2 dark:text-neutral-200">
                <ReactMarkdown>{eventoSelecionado.descricao_md}</ReactMarkdown>
              </div>

              {eventoSelecionado.vitimas.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Vítimas
                  </h3>
                  <ul className="mt-1 space-y-1">
                    {eventoSelecionado.vitimas.map((slug) => (
                      <li key={slug}>
                        <Link
                          href={`/biografias/${slug}`}
                          className="text-sm font-medium text-neutral-800 underline underline-offset-2 dark:text-neutral-200"
                        >
                          Ver biografia
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {eventoSelecionado.marcadores.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Marcadores
                  </h3>
                  <ul className="mt-2 space-y-3">
                    {eventoSelecionado.marcadores.map((m, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
                      >
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {m.marcador}
                        </p>
                        <Citacoes citacoes={[m.fonte]} idResposta={`evento-marcador-${i}`} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {eventoSelecionado.fontes.length > 0 && (
                <Citacoes citacoes={eventoSelecionado.fontes} idResposta="evento" />
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
