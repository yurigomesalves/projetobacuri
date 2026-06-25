"use client";

import { useEffect, useState } from "react";
import type { ItemAcervo, RespostaAcervo } from "@/lib/shared/tipos";

// ─── Constantes de apresentação ────────────────────────────────────────────

const ROTULO_TIPO: Record<string, string> = {
  relatorio_oficial: "Relatório oficial",
  documento_repressao: "Documento da repressão",
  documento_inteligencia_estrangeira: "Inteligência estrangeira",
  imprensa_epoca: "Imprensa da época",
  producao_academica: "Pesquisa acadêmica",
  testemunho: "Testemunho",
  legislacao_decisao_judicial: "Lei ou decisão judicial",
  material_didatico_educativo: "Material educativo",
};

const ROTULO_CONFIABILIDADE: Record<string, string> = {
  alta: "Confiabilidade alta",
  media_alta: "Confiabilidade média-alta",
  media: "Confiabilidade média",
  baixa: "Confiabilidade baixa",
  alta_como_evidencia_de_autoria: "Prova quem agiu, não os fatos",
  alta_como_relato_subjetivo: "Relato pessoal confiável",
  baixa_factual_alta_documental: "Pouco sobre os fatos, muito sobre a censura",
};

const CLASSE_CONFIABILIDADE: Record<string, string> = {
  alta: "border-emerald-600 text-emerald-800 dark:border-emerald-500 dark:text-emerald-300",
  media_alta:
    "border-teal-600 text-teal-800 dark:border-teal-500 dark:text-teal-300",
  media:
    "border-neutral-400 text-neutral-700 dark:border-neutral-500 dark:text-neutral-300",
  baixa:
    "border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400",
  alta_como_evidencia_de_autoria:
    "border-amber-500 text-amber-800 dark:border-amber-600 dark:text-amber-300",
  alta_como_relato_subjetivo:
    "border-emerald-600 text-emerald-800 dark:border-emerald-500 dark:text-emerald-300",
  baixa_factual_alta_documental:
    "border-neutral-300 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatarPeriodo(periodo: string): string {
  const mapa: Record<string, string> = {
    "1964": "1964",
    "1964-1968": "1964–1968",
    "1968-1974": "1968–1974",
    "1974-1979": "1974–1979",
    "1979-1985": "1979–1985",
    pos_1985: "Pós-1985",
  };
  return mapa[periodo] ?? periodo;
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function CardFonte({ item }: { item: ItemAcervo }) {
  return (
    <li className="rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
      {/* Cabeçalho: título + badge de confiabilidade */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-sans text-sm font-medium text-tinta-950 dark:text-neutral-100">
          {item.titulo}
        </p>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium ${
            CLASSE_CONFIABILIDADE[item.confiabilidade] ??
            "border-neutral-300 text-neutral-600"
          }`}
        >
          {ROTULO_CONFIABILIDADE[item.confiabilidade] ?? item.confiabilidade}
        </span>
      </div>

      {/* Autor/Órgão */}
      <p className="mt-1 font-serif text-sm text-neutral-700 dark:text-neutral-300">
        {item.autor_orgao}
      </p>

      {/* Data/Período */}
      {(item.data_documento || item.periodo) && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          {item.data_documento
            ? new Date(item.data_documento + "T00:00:00").getFullYear()
            : formatarPeriodo(item.periodo!)}
        </p>
      )}

      {/* Nota de contexto */}
      {item.nota_contexto && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-semibold">Nota de contexto: </span>
          {item.nota_contexto}
        </div>
      )}

      {/* Link */}
      <div className="mt-2">
        <a
          href={item.url_origem}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          Ver fonte original
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </li>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function AcervoDocumental() {
  const [dados, setDados] = useState<RespostaAcervo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const res = await fetch("/api/transparencia/acervo");
        if (!res.ok) {
          if (!cancelado) setErro(true);
          return;
        }
        const json: RespostaAcervo = await res.json();
        if (!cancelado) setDados(json);
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  // ── A. Texto introdutório (sempre visível) ──────────────────────────────
  return (
    <>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Este acervo reúne os documentos que servem de base para todas as
        respostas do projeto. Ele é público porque acreditamos que cada
        afirmação deve poder ser conferida na sua fonte original. Aqui você
        encontra relatórios oficiais, testemunhos, pesquisas e documentos do
        período, cada um com sua origem e seu grau de confiabilidade indicados.
        A lista cresce automaticamente à medida que novos documentos são
        analisados e incorporados.
      </p>

      {/* ── Estados de carregamento / erro ──────────────────────────────── */}
      {carregando && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Carregando acervo…
        </p>
      )}

      {!carregando && erro && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Não foi possível carregar o acervo.
        </p>
      )}

      {!carregando && !erro && dados?.total === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Nenhuma fonte indexada ainda.
        </p>
      )}

      {/* ── B. Painel de estatísticas ────────────────────────────────────── */}
      {!carregando && !erro && dados && dados.total > 0 && (
        <>
          <div className="mt-6">
            <p
              className="text-4xl font-bold font-sans text-tinta-950 dark:text-papel-50"
              aria-label={`${dados.total} documentos no acervo`}
            >
              {dados.total}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              documentos no acervo
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.keys(ROTULO_TIPO)
                .filter((tipo) => (dados.porTipo[tipo] ?? 0) > 0)
                .map((tipo) => (
                  <div
                    key={tipo}
                    className="rounded-md border border-papel-200 bg-papel-50 p-3 dark:border-tinta-900 dark:bg-tinta-900"
                  >
                    <p className="text-2xl font-bold font-sans text-tinta-950 dark:text-papel-50">
                      {dados.porTipo[tipo]}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {ROTULO_TIPO[tipo]}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* ── C. Glossário didático ──────────────────────────────────────── */}
          <details className="mt-6">
            <summary className="font-sans text-sm font-medium cursor-pointer text-tinta-950 dark:text-neutral-100 hover:underline">
              O que significam os tipos de fonte e a confiabilidade?
            </summary>

            <div className="mt-3 rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
              <div
                className="space-y-3 text-sm font-serif leading-relaxed text-neutral-700 dark:text-neutral-300"
                dangerouslySetInnerHTML={{
                  __html: `<p>Este acervo reúne documentos de origens muito diferentes. Saber de onde cada um vem é essencial para entender o que ele pode, e o que não pode, nos contar.</p>

<p><strong>Relatório oficial:</strong> documentos produzidos pelo Estado brasileiro após a redemocratização para apurar os crimes da ditadura, como os relatórios da Comissão Nacional da Verdade (CNV), publicados em 2014, e os das comissões estaduais e municipais.</p>

<p><strong>Documento da repressão:</strong> papéis produzidos pelos próprios órgãos que prenderam, vigiaram e torturaram, como o DOPS, o DOI-CODI e o SNI. Provam que a repressão existiu e como agiu, mas o que dizem sobre as vítimas é, por definição, hostil e muitas vezes distorcido.</p>

<p><strong>Inteligência estrangeira:</strong> documentos de governos de outros países (como os Estados Unidos) que acompanhavam o Brasil e foram depois liberados ao público. São informativos, mas refletem os interesses do país que os produziu.</p>

<p><strong>Imprensa da época:</strong> jornais e revistas publicados entre 1964 e 1985. É preciso lembrar que a imprensa operava sob censura, e parte dela apoiava o regime. Por isso é tratada como objeto de estudo, não como autoridade sobre os fatos.</p>

<p><strong>Pesquisa acadêmica:</strong> artigos, teses, dissertações e livros produzidos por pesquisadores, em geral revisados por outros especialistas.</p>

<p><strong>Testemunho:</strong> depoimentos de vítimas, familiares, militantes e ex-agentes, colhidos por comissões ou projetos de história oral. É a memória de quem viveu os fatos.</p>

<p><strong>Lei ou decisão judicial:</strong> textos de leis, decretos e sentenças, inclusive de cortes internacionais, como a condenação do Brasil no caso da Guerrilha do Araguaia.</p>

<p><strong>Material educativo:</strong> conteúdos já organizados para o ensino por museus, organizações de memória e iniciativas educativas.</p>

<p><strong>Sobre a confiabilidade.</strong> A confiabilidade aqui não é um julgamento moral da fonte, nem mede se ela é "boa" ou "ruim". Ela indica que tipo de informação a fonte contém e como ela deve ser lida. Fontes muito diferentes podem ser igualmente valiosas para perguntas diferentes. Três casos merecem atenção:</p>

<ul style="list-style-type:disc;padding-left:1.25rem;margin-top:0.5rem;display:flex;flex-direction:column;gap:0.5rem"><li><strong>Prova quem agiu, não os fatos:</strong> vale para os documentos da repressão. Eles comprovam que um órgão do regime atuou, mas o que afirmam sobre as vítimas costuma ser falso ou distorcido, e precisa ser lido com cuidado.</li><li><strong>Relato pessoal confiável:</strong> vale para os testemunhos. São altamente confiáveis como experiência de quem viveu aquilo, mas são memória pessoal, não um registro documental neutro dos fatos.</li><li><strong>Pouco sobre os fatos, muito sobre a censura:</strong> vale para a imprensa censurada. Ela diz pouco sobre o que de fato aconteceu, justamente porque foi censurada, mas é uma prova preciosa de como a informação era controlada no período.</li></ul>`,
                }}
              />
            </div>
          </details>

          {/* ── D. Lista de fontes agrupada por tipo ─────────────────────── */}
          <div className="mt-6 space-y-2">
            {Object.keys(ROTULO_TIPO)
              .filter((tipo) => (dados.porTipo[tipo] ?? 0) > 0)
              .map((tipo) => {
                const itensDeTipo = dados.itens.filter(
                  (item) => item.tipo_fonte === tipo,
                );
                return (
                  <details
                    key={tipo}
                    className="rounded-md border border-papel-200 bg-papel-50 px-4 dark:border-tinta-900 dark:bg-tinta-900"
                  >
                    <summary className="font-sans text-sm font-semibold cursor-pointer text-tinta-950 dark:text-neutral-100 py-2">
                      {ROTULO_TIPO[tipo]} ({dados.porTipo[tipo]})
                    </summary>
                    <ul className="mt-2 space-y-3 pb-4">
                      {itensDeTipo.map((item) => (
                        <CardFonte key={item.fonte_id} item={item} />
                      ))}
                    </ul>
                  </details>
                );
              })}
          </div>
        </>
      )}
    </>
  );
}
