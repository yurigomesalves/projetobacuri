"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { comunidadeGet, comunidadePost, data, MensagemErro } from "./ComunidadeApi";

type Notificacao = { notificacao_id: string; tipo: string; dados: { discussao_id: string }; titulo_discussao?: string; criada_em: string; lida_em?: string | null };
type Resultado = { itens: Notificacao[]; total: number };
export default function NotificacoesComunidade() {
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState("todas");
  const [resultado, setResultado] = useState<Resultado>();
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [revisao, setRevisao] = useState(0);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro("");
      try {
        const r = await comunidadeGet("notificacoes", { pagina: String(pagina) });
        if (ativo) setResultado({ itens: r.itens || [], total: r.total ?? r.itens?.length ?? 0 });
      } catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível carregar as notificações."); }
      finally { if (ativo) setCarregando(false); }
    }
    void carregar(); return () => { ativo = false; };
  }, [pagina, revisao]);
  async function marcarLidas() {
    setEnviando(true); setErro(""); setAviso("");
    try {
      await comunidadePost("ler_notificacoes", {});
      setRevisao(r => r + 1); setAviso("Todas as suas notificações foram marcadas como lidas.");
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível atualizar as notificações."); }
    finally { setEnviando(false); }
  }
  const itens = (resultado?.itens || []).filter(n => filtro === "todas" || !n.lida_em);
  const paginas = Math.max(1, Math.ceil((resultado?.total || 0) / 20));
  return <section className="bc-panel bc-account-card bc-notification-card" aria-labelledby="notificacoes">
    <h2 id="notificacoes" className="font-semibold scroll-mt-6">Notificações</h2>
    <p className="mt-2 text-xs">Acompanhe discussões e consulte avisos antigos.</p>
    <label className="bc-notification-filter">Filtrar notificações<select aria-label="Filtrar notificações" value={filtro} onChange={e => setFiltro(e.target.value)}><option value="todas">Todas desta página</option><option value="nao_lidas">Não lidas desta página</option></select></label>
    {erro && <MensagemErro erro={erro} />}
    {carregando ? <p role="status" className="bc-notification-empty">Carregando notificações…</p> : !erro && <>
      {!itens.length ? <p className="bc-notification-empty">{filtro === "nao_lidas" ? "Nenhuma notificação não lida nesta página." : "Nenhuma notificação nesta página."}</p> : <ul className="bc-notification-list">{itens.map(n => <li key={n.notificacao_id} className={!n.lida_em ? "bc-notification-unread" : undefined}>
        <Link href={`/comunidade/${n.dados.discussao_id}`}><span className="bc-notification-kind">{n.tipo === "decisao" ? "Nova decisão" : n.tipo === "comentario" ? "Novo comentário" : "Atualização da discussão"}</span><strong>{n.titulo_discussao || "Abrir discussão"}</strong><span className="bc-notification-date">{data(n.criada_em)} · {n.lida_em ? "Lida" : "Não lida"}</span></Link>
      </li>)}</ul>}
    </>}
    {!!resultado?.total && <>
      <nav className="bc-notification-pagination" aria-label="Páginas de notificações"><button type="button" disabled={pagina === 1 || carregando} onClick={() => { setAviso(""); setPagina(p => p - 1); }}>Mais recentes</button><span>Página {pagina} de {paginas}</span><button type="button" disabled={pagina >= paginas || carregando} onClick={() => { setAviso(""); setPagina(p => p + 1); }}>Mais antigas</button></nav>
      <button type="button" className="bc-text-button bc-notification-read" disabled={enviando || carregando} onClick={() => void marcarLidas()}>{enviando ? "Atualizando…" : "Marcar notificações como lidas"}</button>
    </>}
    {aviso && <p role="status" className="bc-notification-status">{aviso}</p>}
  </section>;
}
