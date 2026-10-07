"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/client/supabase";
import { comunidadePost, MensagemErro } from "./ComunidadeApi";
import Citacoes from "./Citacoes";
import RegistroOriginal from "./RegistroOriginal";
import type { RegistroCompartilhado } from "@/lib/shared/comunidade";
import type { Citacao } from "@/lib/shared/tipos";

type Props = { registro?: RegistroCompartilhado; interacaoId: string; token?: string; pergunta?: string; resumo?: string; citacoes?: Citacao[]; resposta: string };
export type Rascunho = { registro?: RegistroCompartilhado; titulo: string; motivo: string; categoria: string; token: string; pergunta?: string; resumo?: string; citacoes?: Citacao[]; resposta: string; interacaoId: string; expiraEm: number };
const chave = (id: string) => `bacuri-compartilhar-${id}`;

export default function CompartilharResposta({ interacaoId, token, pergunta, resumo, citacoes, resposta, registro }: Props) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const tituloDialogo = useId();
  const [logado, setLogado] = useState<boolean | null>(null);
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [categoria, setCategoria] = useState("omissao");
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function recuperar() {
      try {
        const salvo = JSON.parse(sessionStorage.getItem(chave(interacaoId)) || "null") as Rascunho | null;
        if (ativo && salvo?.expiraEm && salvo.expiraEm > Date.now()) { setTitulo(salvo.titulo); setMotivo(salvo.motivo); setCategoria(salvo.categoria); setAberto(true); }
      } catch { /* armazenamento opcional */ }
    }
    void recuperar(); return () => { ativo = false; };
  }, [interacaoId]);
  useEffect(() => {
    let ativo = true;
    void supabase.auth.getSession().then(({ data }) => { if (ativo) setLogado(!!data.session); });
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => { if (ativo) setLogado(!!sessao); });
    return () => { ativo = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!aberto || !dialogo.current) return;
    const janela = dialogo.current;
    const botao = gatilho.current;
    janela.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { if (janela.open) janela.close(); document.body.style.overflow = anterior; queueMicrotask(() => { if (botao?.isConnected) botao.focus({ preventScroll: true }); }); };
  }, [aberto]);
  function salvar() {
    try {
      const anterior = JSON.parse(sessionStorage.getItem(chave(interacaoId)) || "null") as Rascunho | null;
      sessionStorage.setItem(chave(interacaoId), JSON.stringify({ titulo, motivo, categoria, token: token || "", pergunta, resumo, citacoes, resposta, registro, interacaoId, expiraEm: anterior?.expiraEm || Date.now() + 7 * 86400000 } satisfies Rascunho));
      sessionStorage.setItem("bacuri-compartilhar-pendente", chave(interacaoId));
    } catch { /* formulário utilizável sem persistência */ }
  }
  async function publicar(event: React.FormEvent) {
    event.preventDefault(); setErro(""); setEnviando(true);
    try { const retorno = await comunidadePost(registro ? "compartilhar_registro" : "compartilhar", { ...(registro ? { origem: registro.origem, registro_id: registro.identificador } : { interacao_id: interacaoId, token_compartilhamento: token }), titulo, motivo, categoria, confirmacao_publicacao: true });
      try { sessionStorage.removeItem(chave(interacaoId)); sessionStorage.removeItem("bacuri-compartilhar-pendente"); } catch { /* conteúdo já publicado */ } const id = retorno?.resultado?.discussao_id; if (id) router.push(`/comunidade/${id}`); else router.push("/comunidade");
    } catch (causa) { salvar(); setErro(causa instanceof Error ? causa.message : "Não foi possível publicar agora."); } finally { setEnviando(false); }
  }
  if (!token && !registro) return null;
  return <section className="bk-share-action">
    <button ref={gatilho} type="button" className="bk-share-trigger" aria-haspopup="dialog" aria-expanded={aberto} onClick={() => setAberto(true)}>{registro ? "Discutir na comunidade" : "Discutir esta resposta"} <span aria-hidden="true">↗</span></button>
    {aberto && createPortal(<dialog ref={dialogo} className="bk-share-dialog" aria-labelledby={tituloDialogo} onCancel={() => { salvar(); setAberto(false); }}>
      <header className="bk-share-heading"><h2 id={tituloDialogo}>Prévia da publicação</h2><button type="button" aria-label="Fechar prévia" onClick={() => { salvar(); setAberto(false); }}>×</button></header>
      <form className="bk-share-form" onSubmit={publicar}>
        <div className="bk-share-preview" tabIndex={0} aria-label={registro ? "Registro e fontes que serão publicados" : "Pergunta, resposta e fontes que serão publicadas"}>{registro ? <RegistroOriginal registro={registro.conteudo} /> : <><p><strong>Pergunta:</strong> {pergunta}</p>{resumo && <p><strong>Em síntese:</strong> {resumo}</p>}<p className="whitespace-pre-wrap"><strong>Resposta:</strong> {resposta}</p><Citacoes citacoes={citacoes || []} idResposta={`previa-${interacaoId}`} /></>}</div>
        <p className="bk-share-note">{registro ? "Uma cópia do registro público e de suas fontes será preservada na discussão. O servidor confere a versão publicada no momento da confirmação." : "Esta pergunta, resumo, resposta e citações serão publicados. Revise dados pessoais antes de confirmar. O restante do histórico não integra esta publicação."}</p>
        <label>Título<input required minLength={5} maxLength={180} value={titulo} onBlur={salvar} onChange={e => setTitulo(e.target.value)} /></label>
        <label>Motivo da discussão<textarea required minLength={10} maxLength={3000} value={motivo} onBlur={salvar} onChange={e => setMotivo(e.target.value)} /></label>
        <label>Categoria<select aria-label="Categoria" value={categoria} onBlur={salvar} onChange={e => setCategoria(e.target.value)}><option value="erro_factual">Erro factual</option><option value="omissao">Omissão</option><option value="fontes">Fontes</option><option value="interpretacao">Interpretação</option><option value="clareza">Clareza</option></select></label>
        <label className="bk-share-confirm"><input required type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} /><span>{registro ? "Confirmo a publicação deste registro na comunidade sob meu perfil." : "Confirmo a publicação desta pergunta e resposta sob meu perfil."}</span></label>
        {erro && <MensagemErro erro={erro} />}
        <div className="bk-share-footer"><button className="bk-button" disabled={!confirmado || enviando || !logado}>{enviando ? "Publicando…" : "Confirmar publicação"}</button>{logado === false && <Link href="/conta" onClick={salvar}>Entrar ou criar conta</Link>}<button type="button" className="bk-share-cancel" onClick={() => { salvar(); setAberto(false); }}>Fechar prévia</button></div>
      </form>
    </dialog>, document.body)}
  </section>;
}
