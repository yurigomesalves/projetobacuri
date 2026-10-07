"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import CompartilharResposta from "@/app/componentes/CompartilharResposta";
import Citacoes from "@/app/componentes/Citacoes";
import { Icone } from "@/app/componentes/Estrutura";
import type { EventoGeo, RespostaErro } from "@/lib/shared/tipos";
import type { Feature, FeatureCollection } from "geojson";

const MapaEventos = dynamic(() => import("@/app/componentes/MapaEventos"), {
  ssr: false,
  loading: () => (
    <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
      Carregando cartografia...
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
  apagamento_de_registros_e_testemunhos:
    "Apagamento de registros e testemunhos",
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
  const [mostrarOrigens, setMostrarOrigens] = useState(false);
  const [origem, setOrigem] = useState<Feature[]>([]);
  const [origemCarregada, setOrigemCarregada] = useState(false);
  const [carregandoOrigem, setCarregandoOrigem] = useState(false);
  const [erroOrigem, setErroOrigem] = useState<string | null>(null);

  // Camada de territórios de origem (ADR-019): povos indígenas, desligada por padrão.
  // Só buscada quando o usuário ativa pela primeira vez.
  const [territorios, setTerritorios] = useState<Feature[]>([]);
  const [territoriosCarregados, setTerritoriosCarregados] = useState(false);
  const [carregandoTerritorios, setCarregandoTerritorios] = useState(false);
  const [erroTerritorios, setErroTerritorios] = useState<string | null>(null);

  const [eventoSelecionado, setEventoSelecionado] = useState<EventoGeo | null>(
    null,
  );
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
            setErroLista(
              dados.erro?.mensagem ?? "Não foi possível carregar o mapa.",
            );
          }
          return;
        }
        const dados: FeatureCollection = await res.json();
        if (!cancelado) setFeatures(dados.features ?? []);
      } catch {
        if (!cancelado) {
          setErroLista(
            "Não foi possível carregar o mapa. Verifique sua conexão.",
          );
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
    if (!mostrarOrigens || origemCarregada) return;
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
              dados.erro?.mensagem ??
                "Não foi possível carregar a camada de origem.",
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
            "Não foi possível carregar a camada de origem. Verifique sua conexão.",
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
  }, [mostrarOrigens, origemCarregada]);

  // Busca a camada de territórios de origem só na primeira ativação.
  useEffect(() => {
    if (!mostrarOrigens || territoriosCarregados) return;
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
              dados.erro?.mensagem ??
                "Não foi possível carregar a camada de territórios.",
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
            "Não foi possível carregar a camada de territórios. Verifique sua conexão.",
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
  }, [mostrarOrigens, territoriosCarregados]);

  async function selecionarEvento(eventoId: string) {
    setCarregandoEvento(true);
    setErroEvento(null);
    setEventoSelecionado(null);
    try {
      const res = await fetch(`/api/eventos-geo/${eventoId}`);
      if (!res.ok) {
        const dados: RespostaErro = await res.json();
        setErroEvento(
          dados.erro?.mensagem ?? "Não foi possível carregar este evento.",
        );
        return;
      }
      const dados: EventoGeo = await res.json();
      setEventoSelecionado(dados);
    } catch {
      setErroEvento(
        "Não foi possível carregar este evento. Verifique sua conexão.",
      );
    } finally {
      setCarregandoEvento(false);
    }
  }

  function ehEventoIndigena(feature: Feature): boolean {
    const tipos =
      (feature.properties as { tipos_crime?: string[] })?.tipos_crime ?? [];
    return tipos.includes(TIPO_VIOLENCIA_INDIGENA);
  }

  const featuresVisiveis = features.filter((f) => {
    const indigena = ehEventoIndigena(f);
    if (indigena) return mostrarIndigena;
    return mostrarCasos;
  });

  const totalIndigenas = features.filter(ehEventoIndigena).length;
  const camadasAtivas = [mostrarCasos, mostrarIndigena, mostrarOrigens].filter(
    Boolean,
  ).length;

  return (
    <main className="bk-territory">
      <header className="bk-territory-hero">
        <div className="bk-territory-heading">
          <p className="bk-eyebrow">Memória e território</p>
          <h1>Territórios da memória</h1>
          <p>
            Explore onde ocorreram casos, operações e violações documentadas da
            Ditadura Militar-Empresarial brasileira.
          </p>
        </div>
        <dl className="bk-territory-stats" aria-label="Resumo territorial">
          <div>
            <dt>Registros mapeados</dt>
            <dd>{carregandoLista ? "—" : features.length}</dd>
          </div>
          <div>
            <dt>Violência contra povos indígenas</dt>
            <dd>{carregandoLista ? "—" : totalIndigenas}</dd>
          </div>
          <div>
            <dt>Camadas ativas</dt>
            <dd>{camadasAtivas}/3</dd>
          </div>
        </dl>
      </header>

      <section
        className="bk-territory-method"
        aria-labelledby="precisao-geografica"
      >
        <Icone nome="info" />
        <div>
          <h2 id="precisao-geografica">Como ler esta cartografia</h2>
          <p>
            As localizações são referências históricas aproximadas. Polígonos
            não representam limites oficiais, e cada geometria mantém sua
            proveniência documentada no repositório público.
          </p>
        </div>
      </section>

      <section className="bk-territory-layers" aria-labelledby="titulo-camadas">
        <div className="bk-territory-section-title">
          <div>
            <p className="bk-eyebrow">Leitura cartográfica</p>
            <h2 id="titulo-camadas">Camadas territoriais</h2>
          </div>
          <p>{featuresVisiveis.length} registros visíveis</p>
        </div>
        <fieldset>
          <legend className="sr-only">Escolha as camadas exibidas</legend>
          <label className="bk-layer-option bk-layer-event">
            <span className="bk-layer-mark" aria-hidden="true" />
            <span>
              <strong>Casos e operações</strong>
              <small>Locais de ocorrência documentados</small>
            </span>
            <input
              type="checkbox"
              checked={mostrarCasos}
              onChange={(e) => setMostrarCasos(e.target.checked)}
            />
          </label>
          <label className="bk-layer-option bk-layer-indigenous">
            <span className="bk-layer-mark" aria-hidden="true" />
            <span>
              <strong>Violência contra povos indígenas</strong>
              <small>Casos identificados no acervo</small>
            </span>
            <input
              type="checkbox"
              checked={mostrarIndigena}
              onChange={(e) => setMostrarIndigena(e.target.checked)}
            />
          </label>
          <label className="bk-layer-option bk-layer-origin">
            <span className="bk-layer-mark" aria-hidden="true" />
            <span>
              <strong>Cidades e territórios de origem</strong>
              <small>Naturalidades e referências de povos indígenas</small>
            </span>
            <input
              type="checkbox"
              checked={mostrarOrigens}
              onChange={(e) => setMostrarOrigens(e.target.checked)}
            />
          </label>
        </fieldset>
      </section>

      <div className="bk-territory-notices" aria-live="polite">
        {mostrarOrigens && (
          <p>
            Cidades indicam a naturalidade documentada da vítima, não o local do
            crime. Territórios usam referências contemporâneas aproximadas e não
            reconstituem os limites do período de 1964–1985.
          </p>
        )}
        {(carregandoOrigem || carregandoTerritorios) && (
          <p>Carregando camadas complementares…</p>
        )}
        {erroOrigem && <p role="alert">{erroOrigem}</p>}
        {erroTerritorios && <p role="alert">{erroTerritorios}</p>}
        {mostrarOrigens && origemCarregada && origem.length === 0 && (
          <p>Ainda não há cidades de origem documentadas no acervo.</p>
        )}
        {mostrarOrigens &&
          territoriosCarregados &&
          territorios.length === 0 && (
            <p>Ainda não há territórios de origem documentados no acervo.</p>
          )}
      </div>

      <section
        className="bk-territory-workspace"
        aria-label="Cartografia documental"
      >
        <div className="bk-territory-map-card">
          <div className="bk-territory-map-heading">
            <div>
              <p className="bk-eyebrow">Brasil</p>
              <h2>Geografia da repressão</h2>
            </div>
            <span>Selecione um ponto para consultar as evidências</span>
          </div>
          {erroLista && (
            <p role="alert" className="bk-territory-error">
              {erroLista}
            </p>
          )}
          {carregandoLista ? (
            <div className="bk-territory-loading">
              Carregando cartografia documental…
            </div>
          ) : (
            <div className="bk-territory-map">
              <MapaEventos
                features={featuresVisiveis}
                origem={mostrarOrigens ? origem : []}
                territorios={mostrarOrigens ? territorios : []}
                onSelecionar={selecionarEvento}
              />
            </div>
          )}
        </div>

        <aside
          className="bk-territory-detail"
          aria-label="Detalhes do evento selecionado"
        >
          {carregandoEvento && (
            <div className="bk-territory-detail-state">
              Carregando registro…
            </div>
          )}

          {erroEvento && (
            <p role="alert" className="bk-territory-error">
              {erroEvento}
            </p>
          )}

          {!carregandoEvento && !erroEvento && !eventoSelecionado && (
            <div className="bk-territory-detail-state">
              <span>
                <Icone nome="map" />
              </span>
              <p className="bk-eyebrow">Documento associado</p>
              <h2>Selecione uma localização</h2>
              <p>
                Cada localização conduz ao registro histórico, às pessoas
                relacionadas e às fontes que sustentam sua inclusão.
              </p>
            </div>
          )}

          {eventoSelecionado && (
            <article className="bk-territory-event">
              <div className="bk-territory-event-head">
                <p className="bk-eyebrow">Registro documental</p>
                <button
                  type="button"
                  onClick={() => setEventoSelecionado(null)}
                  aria-label="Fechar detalhes"
                >
                  ×
                </button>
              </div>
              <h2>{eventoSelecionado.titulo}</h2>
              <CompartilharResposta key={eventoSelecionado.evento_id} interacaoId={`evento-${eventoSelecionado.evento_id}`} resposta="" registro={{ origem: "evento", identificador: eventoSelecionado.evento_id, conteudo: eventoSelecionado }} />
              <p className="bk-territory-event-meta">
                {formatarData(eventoSelecionado.data)} ·{" "}
                {eventoSelecionado.municipio} — {eventoSelecionado.uf}
              </p>

              {eventoSelecionado.tipos_crime.length > 0 && (
                <ul className="bk-territory-tags">
                  {eventoSelecionado.tipos_crime.map((tipo) => (
                    <li key={tipo}>{rotuloCrime(tipo)}</li>
                  ))}
                </ul>
              )}

              <div className="bk-reading bk-territory-description">
                <ReactMarkdown>{eventoSelecionado.descricao_md}</ReactMarkdown>
              </div>

              {eventoSelecionado.vitimas.length > 0 && (
                <section className="bk-territory-related">
                  <h3>Pessoas relacionadas</h3>
                  <ul>
                    {eventoSelecionado.vitimas.map((slug) => (
                      <li key={slug}>
                        <Link href={`/biografias/${slug}`}>Ver biografia</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {eventoSelecionado.marcadores.length > 0 && (
                <section className="bk-territory-related">
                  <h3>Evidências localizadas</h3>
                  <ul className="bk-territory-evidence">
                    {eventoSelecionado.marcadores.map((m, i) => (
                      <li key={i}>
                        <p>{m.marcador}</p>
                        <Citacoes
                          citacoes={[m.fonte]}
                          idResposta={`evento-marcador-${i}`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {eventoSelecionado.fontes.length > 0 && (
                <Citacoes
                  citacoes={eventoSelecionado.fontes}
                  idResposta="evento"
                />
              )}
            </article>
          )}
        </aside>
      </section>
    </main>
  );
}
