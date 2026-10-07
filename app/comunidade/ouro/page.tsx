"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavegacaoComunidade } from "../../componentes/ComunidadeLayout";
import { comunidadeGet, MensagemErro, nomeAutor, type Autor } from "../../componentes/ComunidadeApi";

type Fonte = { chunk_id: string; titulo: string; autor_orgao: string; paginas?: string; trecho?: string; url_origem?: string; tipo_fonte?: string; proveniencia?: string; nota_contexto?: string };
type Ouro = { ouro_id: string; titulo: string; texto: string; autor: Autor; discussao_id: string; estado: string; fontes_validas: boolean; fontes: Fonte[] };

export default function Ouro() {
  const [resultado, setResultado] = useState<{ itens: Ouro[]; total: number }>();
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro("");
      try { const alvo = new URL(location.href).searchParams.get("id"); const r = await comunidadeGet("ouro", { pagina: String(pagina), ...(alvo ? { id: alvo } : {}) }); if (ativo) setResultado(r); }
      catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível carregar."); }
      finally { if (ativo) setCarregando(false); }
    }
    void carregar(); return () => { ativo = false; };
  }, [pagina]);
  return <main className="bc-page bc-document-page"><NavegacaoComunidade />
    <h1 className="text-2xl font-bold">Respostas de referência</h1>
    <p className="bc-reference-intro mt-2 text-sm">São versões editoriais aprovadas, com fontes, discussão e histórico de revisão. Pense nelas como fichas de apoio: somente quando a integração passar por avaliação independente e for ativada, versões vigentes podem ajudar o chat a organizar a resposta. O chat continua buscando os trechos do acervo e citando autor, documento, página ou trecho e link; a referência nunca substitui a evidência documental.</p>
    <Link className="mt-3 inline-block text-sm underline" href="/comunidade">Voltar à comunidade</Link>
    {erro && <div className="mt-5"><MensagemErro erro={erro} /></div>}
    {carregando ? <p className="mt-5" role="status">Carregando respostas de referência…</p> : !erro && <>
      {!resultado?.itens.length && <p className="mt-5">Nenhuma resposta de referência publicada até o momento.</p>}
      <ul className="mt-6 space-y-4">{resultado?.itens.map(o => <li id={o.ouro_id} key={o.ouro_id} className="bk-card scroll-mt-24">
        <h2 className="font-semibold">{o.titulo}</h2><p className="mt-2 text-xs">Estado: {o.estado === "ativa" ? "Ativa" : o.estado === "suspensa" ? "Suspensa" : "Revogada"}</p>
        {!o.fontes_validas && <p className="mt-2 text-sm" role="status">As fontes foram alteradas ou retiradas após a aprovação. Esta versão está impedida de orientar o chat até nova revisão.</p>}
        <p className="mt-3 whitespace-pre-wrap text-sm">{o.texto}</p>
        <details className="mt-3"><summary>Fontes vinculadas</summary><ol className="mt-2 space-y-3">{o.fontes.map((f, i) => <li key={f.chunk_id} className="text-sm"><strong>[{i + 1}] {f.titulo}</strong><p>{f.autor_orgao} · {f.paginas ? `p. ${f.paginas}` : "página não informada"}</p>{f.tipo_fonte && <p className="text-xs">{f.tipo_fonte.replaceAll("_", " ")}</p>}{f.proveniencia && <p className="text-xs">Proveniência: {f.proveniencia}</p>}{f.nota_contexto && <p className="text-xs">Contexto: {f.nota_contexto}</p>}{f.trecho && <blockquote className="mt-1 whitespace-pre-wrap">{f.trecho}</blockquote>}{f.url_origem && /^https?:\/\//i.test(f.url_origem) && <a className="underline" href={f.url_origem} target="_blank" rel="noopener noreferrer">Fonte original (nova aba)</a>}</li>)}</ol></details>
        <p className="mt-3 text-xs">Proposta de {nomeAutor(o.autor)} · <Link className="underline" href={`/comunidade/${o.discussao_id}`}>Discussão, versões e pareceres</Link></p>
      </li>)}</ul>
      {(resultado?.total || 0) > 20 && <nav className="mt-6 flex justify-between" aria-label="Páginas de respostas de referência"><button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina}</span><button disabled={pagina * 20 >= (resultado?.total || 0)} onClick={() => setPagina(p => p + 1)}>Próxima</button></nav>}
    </>}
  </main>;
}
