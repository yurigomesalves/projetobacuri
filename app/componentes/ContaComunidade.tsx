"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/lib/client/supabase";
import { comunidadeGet, nomeAutor } from "./ComunidadeApi";
import AvatarComunidade from "./AvatarComunidade";

type PerfilMenu = { tag?: string; nome?: string; nivel?: string; pontos?: number; curador: boolean };

export default function ContaComunidade() {
  const router = useRouter();
  const [logado, setLogado] = useState(false);
  const [perfil, setPerfil] = useState<PerfilMenu>({ curador: false });
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");
  const [pendentes, setPendentes] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    let ativo = true; let versao = 0;
    async function carregar() {
      const atual = ++versao;
      const { data } = await supabase.auth.getSession();
      if (!ativo || atual !== versao) return;
      setLogado(!!data.session);
      if (!data.session) { setPerfil({ curador: false }); setAberto(false); return; }
      try {
        const eu = await comunidadeGet("eu");
        if (ativo && atual === versao) setPerfil({ tag: eu.perfil ? nomeAutor(eu.perfil.tag) : undefined,
          nome: eu.perfil?.nome_publico, nivel: eu.perfil?.nivel, pontos: eu.perfil?.pontos, curador: eu.curador === true });
      } catch { if (ativo && atual === versao) setPerfil({ curador: false }); }
    }
    void carregar();
    const { data } = supabase.auth.onAuthStateChange(() => { queueMicrotask(() => void carregar()); });
    window.addEventListener("bacuri-perfil-atualizado", carregar);
    return () => { ativo = false; data.subscription.unsubscribe(); window.removeEventListener("bacuri-perfil-atualizado", carregar); };
  }, []);
  useEffect(() => {
    if (!aberto || !logado) return;
    let ativo = true;
    async function carregarNotificacoes() {
      try {
        let pagina = 1;
        let lidas = 0;
        while (ativo) {
          const resultado = await comunidadeGet("notificacoes", { pagina: String(pagina) });
          if (!ativo) return;
          const itens = resultado.itens as { lida_em: string | null }[];
          if (itens.some(item => !item.lida_em)) { setPendentes(true); return; }
          lidas += itens.length;
          if (!itens.length || lidas >= (resultado.total ?? itens.length)) { setPendentes(false); return; }
          pagina++;
        }
      } catch { if (ativo) setPendentes(false); }
    }
    void carregarNotificacoes();
    return () => { ativo = false; };
  }, [aberto, logado]);
  useEffect(() => {
    if (!aberto) return;
    function fora(e: PointerEvent) { if (e.target instanceof Node && !raiz.current?.contains(e.target)) setAberto(false); }
    function teclado(e: KeyboardEvent) { if (e.key === "Escape") { setAberto(false); botao.current?.focus(); } }
    function foco(e: FocusEvent) { if (e.target instanceof Node && !raiz.current?.contains(e.target)) setAberto(false); }
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", teclado); document.addEventListener("focusin", foco);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", teclado); document.removeEventListener("focusin", foco); };
  }, [aberto]);
  async function sair() {
    setSaindo(true); setErro("");
    try {
      const { error } = await supabase.auth.signOut(); if (error) throw error;
      setAberto(false); router.push("/");
    } catch { setErro("Não foi possível sair. Tente novamente."); }
    finally { setSaindo(false); }
  }
  if (!logado) return <Link href="/conta" className="bc-account" aria-label="Entrar no BACURI">Entrar</Link>;
  return <div ref={raiz} className="bc-account-menu">
    <button ref={botao} type="button" className="bc-account bc-account-trigger" aria-expanded={aberto} aria-controls={menuId}
      aria-label={`Menu da conta${perfil.tag ? `: ${perfil.tag}` : ""}`} onClick={() => setAberto(v => !v)}>
      <AvatarComunidade tag={perfil.tag} /><span>{perfil.tag || "Minha conta"}</span><svg className="bc-account-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {aberto && <div id={menuId} className="bc-account-dropdown">
      <div className="bc-account-identity"><AvatarComunidade tag={perfil.tag} tamanho={44} /><div><strong>{perfil.nome || perfil.tag || "Minha conta"}</strong>{perfil.nome && perfil.tag && <span>{perfil.tag}</span>}<small>{perfil.curador ? "Curador(a)" : perfil.nivel || "Complete seu perfil"}{perfil.pontos !== undefined && ` · ${perfil.pontos} pontos de participação`}</small></div></div>
      <nav aria-label="Menu da conta" onClick={() => setAberto(false)}>
        <Link href="/conta">Meu perfil <span aria-hidden="true">→</span></Link>
        <Link href="/comunidade">Minha comunidade <span className="bc-account-notifications" role="img" aria-label={pendentes ? "Há notificações não lidas" : "Notificações"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{pendentes && <i />}</span></Link>
        {perfil.curador && <Link href="/comunidade/curadoria">Curadoria <span aria-hidden="true">→</span></Link>}
      </nav>
      <div className="bc-account-exit"><button type="button" disabled={saindo} onClick={() => void sair()}>{saindo ? "Saindo…" : "Sair da Conta"}<span aria-hidden="true">↪</span></button>{erro && <p role="alert">{erro}</p>}</div>
    </div>}
  </div>;
}
