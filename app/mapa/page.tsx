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
  grilagem_de_territorio_indigena: "Grilagem de território indígena",
  apagamento_de_registros_e_testemunhos: "Apagamento de registros e testemunhos",
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

  // Camada de origem (ADR-016, decisão 4): desligada por padrão. Os pontos só
  // são buscados quando o usuário ativa a camada pela primeira vez.
  const [mostrarOrigem, setMostrarOrigem] = useState(false);
  const [origem, setOrigem] = useState<Feature[]>([]);
  const [origemCarregada, setOrigemCarregada] = useState(false);
  const [carregandoOrigem, setCarregandoOrigem] = useState(false);
  const [erroOrigem, setErroOrigem] = useState<string | null>(null);

  // Camada de territórios de origem (ADR-019): povos indígenas, desligada por padrão.
  // Só buscada quando o usuário ativa pela primeira vez.
  const [mostrarTerritorios, setMostrarTerritorios] = useState(false);
  const [territorios, setTerritorios] = useState<Feature[]>([]);
  const [territoriosCarregados, setTerritoriosCarregados] = useState(false);
  const [carregandoTerritorios, setCarregandoTerritorios] = useState(false);
  const [erroTerritorios, setErroTerritorios] = useState<string | null>(null);

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

  // Busca a camada de origem só na primeira ativação (cache em `origem`).
  useEffect(() => {
    if (!mostrarOrigem || origemCarregada) return;
    let cancelado = false;
    async function carregarOrigem() {
      setCarregandoOrigem(true);
      setErroOrigem(null);
      try {
        const res = await fetch("/api/naturalidades");
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          if (!cancelado) {
            setErroOrigem(
              dados.erro?.mensagem ?? "Não foi possível carregar a camada de origem."
            );
          }
          return;
        }
        const dados: FeatureCollection = await res.json();
        if (!cancelado) {
          setOrigem(dados.features ?? []);
          setOrigemCarregada(true);
        }
      } catch {
        if (!cancelado) {
          setErroOrigem(
            "Não foi possível carregar a camada de origem. Verifique sua conexão."
          );
        }
      } finally {
        // Sempre desliga o indicador: é um sinal de interface, seguro de
        // resetar mesmo se esta execução do efeito foi cancelada (StrictMode).
        setCarregandoOrigem(false);
      }
    }
    carregarOrigem();
    return () => {
      cancelado = true;
    };
  }, [mostrarOrigem, origemCarregada]);

  // Busca a camada de territórios de origem só na primeira ativação.
  useEffect(() => {
    if (!mostrarTerritorios || territoriosCarregados) return;
    let cancelado = false;
    async function carregarTerritorios() {
      setCarregandoTerritorios(true);
      setErroTerritorios(null);
      try {
        const res = await fetch("/api/territorios-origem");
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          if (!cancelado) {
            setErroTerritorios(
              dados.erro?.mensagem ?? "Não foi possível carregar a camada de territórios."
            );
          }
          return;
        }
        const dados: FeatureCollection = await res.json();
        if (!cancelado) {
          setTerritorios(dados.features ?? []);
          setTerritoriosCarregados(true);
        }
      } catch {
        if (!cancelado) {
          setErroTerritorios(
            "Não foi possível carregar a camada de territórios. Verifique sua conexão."
          );
        }
      } finally {
        setCarregandoTerritorios(false);
      }
    }
    carregarTerritorios();
    return () => {
      cancelado = true;
    };
  }, [mostrarTerritorios, territoriosCarregados]);

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
      <header className="border-b border-papel-200 px-4 py-6 sm:px-6 dark:border-tinta-900">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-tinta-950 sm:text-3xl dark:text-papel-50">
            Mapa
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Casos, operações e territórios documentados da Ditadura
            Militar-Empresarial no Brasil. Clique em um marcador ou área para ver os
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
          <fieldset className="flex flex-wrap gap-4 rounded-md border border-papel-200 p-3 text-sm dark:border-tinta-900">
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarOrigem}
                onChange={(e) => setMostrarOrigem(e.target.checked)}
              />
              Cidades e territórios natais das vítimas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarTerritorios}
                onChange={(e) => setMostrarTerritorios(e.target.checked)}
              />
              Territórios de origem (povos indígenas)
            </label>
          </fieldset>

          {mostrarOrigem && (
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
              Esta camada mostra a cidade natal (origem) de cada vítima com ficha
              publicada, não o local do crime. Vítimas sem naturalidade
              documentada não aparecem.
            </p>
          )}

          {carregandoOrigem && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Carregando camada de origem...
            </p>
          )}

          {erroOrigem && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {erroOrigem}
            </p>
          )}

          {mostrarOrigem && origemCarregada && origem.length === 0 && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Ainda não há vítimas com cidade natal documentada no acervo.
            </p>
          )}

          {mostrarTerritorios && (
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
              Esta camada mostra o território do povo indígena ao qual a vítima pertence,
              segundo fonte documental. Referência geográfica aproximada e contemporânea —
              os limites atuais da Terra Indígena não correspondem ao território de 1964–1985.
              Vítimas sem referência territorial documentada não aparecem.
            </p>
          )}

          {carregandoTerritorios && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Carregando territórios de origem...
            </p>
          )}

          {erroTerritorios && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {erroTerritorios}
            </p>
          )}

          {mostrarTerritorios && territoriosCarregados && territorios.length === 0 && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Ainda não há vítimas com território de origem documentado no acervo.
            </p>
          )}

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
            <div className="h-[60vh] min-h-[320px] overflow-hidden rounded-md border border-papel-200 dark:border-tinta-900">
              <MapaEventos
                features={featuresVisiveis}
                origem={mostrarOrigem ? origem : []}
                territorios={mostrarTerritorios ? territorios : []}
                onSelecionar={selecionarEvento}
              />
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
            <div className="rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
              <h2 className="text-base font-semibold text-tinta-950 dark:text-neutral-100">
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
                      className="rounded border border-tinta-700 px-1.5 py-0.5 text-xs font-medium text-neutral-700 dark:border-tinta-700 dark:text-neutral-300"
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
                  <h3 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
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
                  <h3 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
                    Marcadores
                  </h3>
                  <ul className="mt-2 space-y-3">
                    {eventoSelecionado.marcadores.map((m, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-papel-200 bg-papel-50 p-3 dark:border-tinta-900 dark:bg-tinta-950"
                      >
                        <p className="text-sm font-medium text-tinta-950 dark:text-neutral-100">
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
