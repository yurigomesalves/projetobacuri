"use client";

import EstadoEditorial from "./EstadoEditorial";
import type { ConclusaoEditorial } from "@/lib/shared/comunidade";
import Link from "next/link";
import { useEffect, useState } from "react";
import { comunidadeGet, data, MensagemErro, nomeAutor, type Autor } from "./ComunidadeApi";

type Decisao = ConclusaoEditorial & { decisao_id: string; discussao_id: string; versao_id: string; fontes: { titulo: string; autor_orgao: string; paginas?: string }[]; resultado: string; sintese: string; criada_em: string; ciclo: number; pareceristas: Autor[] | null };
type Evento = { tipo: string; justificativa: string; criado_em: string; atores: Autor[] | null };
type Revisao = { ouro_id: string; acao: string; justificativa: string; criada_em: string };
type Feed = { itens: Decisao[]; total: number; eventos: Evento[]; revisoes_ouro: Revisao[] };
const rotulos: Record<string, string> = { aprovada: "Aprovada", recusada: "Recusada", ajustes: "Ajustes solicitados", admissao: "Admissão na curadoria", saida: "Saída da curadoria", destituicao: "Destituição da curadoria", suspender: "Suspensão", reativar: "Reativação", revogar: "Revogação" };

export default function DecisoesComunidade() {
  const [feed, setFeed] = useState<Feed>();
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro("");
      try { const d = await comunidadeGet("transparencia", { pagina: String(pagina) }); if (ativo) setFeed(d); }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível carregar as decisões."); }
      finally { if (ativo) setCarregando(false); }
    }
    void carregar(); return () => { ativo = false; };
  }, [pagina]);
  return <section id="decisoes-comunidade" className="mb-8 space-y-4">
    <h2 className="text-lg font-semibold">Decisões sobre propostas da comunidade</h2>
    <p className="text-sm">As avaliações ajudam a organizar a fila. A aprovação exige pareceres independentes da curadoria e fontes verificáveis. Cada versão mantém sua decisão; um recurso abre uma nova rodada de análise.</p>
    {carregando && <p role="status">Carregando decisões…</p>}{erro && <MensagemErro erro={erro} />}
    {!carregando && !erro && <>
      {!feed?.itens.length && <p className="text-sm">Nenhuma decisão do fórum publicada até o momento.</p>}
      <ul className="space-y-3">{feed?.itens.map(d => <li key={d.decisao_id} className="bk-card">
        <p className="text-xs">{data(d.criada_em)} · rodada {d.ciclo}</p><h3 className="mt-2 font-semibold">{rotulos[d.resultado] || d.resultado}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{d.sintese}</p><EstadoEditorial decisao={d} />
        <ul className="mt-3 text-xs">{d.fontes.map((f, i) => <li key={i}>[{i + 1}] {f.titulo} · {f.autor_orgao} · p. {f.paginas || "não informada"}</li>)}</ul><p className="mt-2 text-xs">Pareceristas: {d.pareceristas?.map(nomeAutor).join(", ") || "Curadoria"}</p>
        <Link className="mt-3 inline-block text-sm underline" href={`/comunidade/${d.discussao_id}?versao_id=${d.versao_id}#${d.versao_id}`}>Ver versão decidida, fontes vinculadas e pareceres</Link>
      </li>)}</ul>
      {(feed?.total || 0) > 20 && <nav aria-label="Páginas de decisões do fórum" className="flex justify-between"><button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina}</span><button disabled={pagina * 20 >= (feed?.total || 0)} onClick={() => setPagina(p => p + 1)}>Próxima</button></nav>}
      {!!feed?.eventos.length && <details><summary>Histórico público da curadoria</summary><ul className="mt-3 space-y-3">{feed.eventos.map((e, i) => <li key={`${e.criado_em}-${i}`} className="text-sm"><strong>{rotulos[e.tipo] || e.tipo}</strong> · {data(e.criado_em)}<p>{e.justificativa}</p><p>{e.atores?.map(nomeAutor).join(", ")}</p></li>)}</ul></details>}
      {!!feed?.revisoes_ouro.length && <details><summary>Revisões das respostas de referência</summary><ul className="mt-3 space-y-3">{feed.revisoes_ouro.map((r, i) => <li key={`${r.ouro_id}-${i}`} className="text-sm">{rotulos[r.acao] || r.acao} · {data(r.criada_em)}<p>{r.justificativa}</p><Link href="/comunidade/ouro" className="underline">Consultar respostas de referência</Link></li>)}</ul></details>}
    </>}
  </section>;
}
