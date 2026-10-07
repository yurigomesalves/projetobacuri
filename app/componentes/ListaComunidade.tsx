"use client";

import { rotuloOrigem } from "@/lib/shared/comunidade";
import Link from "next/link";
import AvatarComunidade from "./AvatarComunidade";
import ComunidadeLayout, { NavegacaoComunidade } from "./ComunidadeLayout";
import { useEffect, useState } from "react";
import { comunidadeGet, data, MensagemErro, nomeAutor, type Autor } from "./ComunidadeApi";

const categorias: Record<string, string> = { erro_factual: "Erro factual", omissao: "Omissão", fontes: "Fontes", interpretacao: "Interpretação", clareza: "Clareza" };
type Discussao = { origem?: string; discussao_id: string; titulo: string; motivo: string; categoria: string; autor: Autor; criado_em: string; comentarios: number; propostas: number };

export default function ListaComunidade() {
  const [resultado, setResultado] = useState<{ itens: Discussao[]; total: number }>();
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ q: "", categoria: "", ordem: "recentes" });
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true); setErro("");
      try { const dados = await comunidadeGet("discussoes", { ...filtros, pagina: String(pagina) }); if (!cancelado) setResultado(dados); }
      catch (causa) { if (!cancelado) setErro(causa instanceof Error ? causa.message : "Não foi possível carregar."); }
      finally { if (!cancelado) setCarregando(false); }
    }
    void carregar(); return () => { cancelado = true; };
  }, [filtros, pagina]);
  return <main className="bc-page">
    <header className="bc-hero"><div><span className="bc-eyebrow">MEMÓRIA EM CONSTRUÇÃO COLETIVA</span><h1>Comunidade<span className="bc-hero-dot">.</span></h1><p>Uma conversa aberta para conferir fontes, discutir respostas e construir conhecimento com responsabilidade.</p></div><Link href="/" className="bc-hero-action">Abrir o chat <span aria-hidden="true">↗</span></Link></header>
    <NavegacaoComunidade />
    <ComunidadeLayout><section aria-label="Discussões da comunidade">
      <div className="bc-section-heading"><div><span className="bc-eyebrow">FÓRUM COLABORATIVO</span><h2>Discussões da comunidade</h2></div>{resultado && <span className="bc-count">{resultado.total} {resultado.total === 1 ? "discussão" : "discussões"}</span>}</div>
      <form className="bc-filters" onSubmit={e => { e.preventDefault(); setPagina(1); setFiltros(f => ({ ...f, q: busca })); }}>
        <label className="bc-search">Buscar discussões<input placeholder="Título, dúvida ou tema…" value={busca} onChange={e => setBusca(e.target.value)} maxLength={150} /></label>
        <button className="bk-button bc-search-button">Buscar</button>
        <label>Categoria<select aria-label="Categoria" value={filtros.categoria} onChange={e => { setPagina(1); setFiltros(f => ({ ...f, categoria: e.target.value })); }}><option value="">Todas as categorias</option>{Object.entries(categorias).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Ordenar<select aria-label="Ordenar" value={filtros.ordem} onChange={e => { setPagina(1); setFiltros(f => ({ ...f, ordem: e.target.value })); }}><option value="recentes">Mais recentes</option><option value="avaliadas">Mais avaliadas</option><option value="sem_resposta">Com menos respostas</option></select></label>
      </form>
      {erro && <div className="mt-5"><MensagemErro erro={erro} /></div>}
      {carregando ? <div role="status" className="bc-empty">Carregando discussões…</div> : !erro && <>
        {!resultado?.itens.length && <div className="bc-empty"><span className="bc-empty-mark" aria-hidden="true">↗</span><h3>Abra uma discussão a partir do acervo.</h3><p>Nenhuma discussão encontrada. Use “Discutir esta resposta” no chat ou “Discutir na comunidade” em biografias e registros do mapa.</p><Link href="/" className="bk-button">Ir para o chat</Link></div>}
        <ul className="bc-feed">{resultado?.itens.map(d => <li key={d.discussao_id} className="bc-discussion-card">
          <div className="bc-discussion-meta">{nomeAutor(d.autor).startsWith("@") && nomeAutor(d.autor) !== "@conta_desativada" ? <Link className="bc-author" href={`/comunidade/perfil/${encodeURIComponent(nomeAutor(d.autor))}`}><AvatarComunidade tag={nomeAutor(d.autor)} tamanho={28} /><span>{nomeAutor(d.autor)}</span></Link> : <span className="bc-author"><AvatarComunidade tamanho={28} /><span>Conta encerrada</span></span>}<span>· {data(d.criado_em)}</span><span className="bc-category">{rotuloOrigem(d.origem)}</span><span className="bc-category">{categorias[d.categoria] || d.categoria}</span></div>
          <h3><Link href={`/comunidade/${d.discussao_id}`}>{d.titulo}</Link></h3><p className="bc-discussion-excerpt">{d.motivo}</p>
          <div className="bc-discussion-footer"><Link href={`/comunidade/${d.discussao_id}#comentarios`}><span aria-hidden="true">◯</span> {d.comentarios} comentários</Link><Link href={`/comunidade/${d.discussao_id}#propostas`}><span aria-hidden="true">↗</span> {d.propostas} propostas</Link><Link className="bc-open-discussion" href={`/comunidade/${d.discussao_id}`}>Participar <span aria-hidden="true">→</span></Link></div>
        </li>)}</ul>
        {(resultado?.total || 0) > 20 && <nav aria-label="Páginas de discussões" className="bc-pagination"><button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>← Anterior</button><span>Página {pagina}</span><button disabled={pagina * 20 >= (resultado?.total || 0)} onClick={() => setPagina(p => p + 1)}>Próxima →</button></nav>}
      </>}
    </section></ComunidadeLayout>
  </main>;
}
