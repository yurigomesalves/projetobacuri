"use client";

import Link from "next/link";
import NotificacoesComunidade from "../componentes/NotificacoesComunidade";
import FotoPerfil from "../componentes/FotoPerfil";
import { NavegacaoComunidade } from "../componentes/ComunidadeLayout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/client/supabase";
import { comunidadeGet, comunidadePost, data, MensagemErro, nomeAutor, type Autor } from "../componentes/ComunidadeApi";
import { BotaoAcao, FormularioAcao } from "../componentes/DiscussaoFormularios";

type MeuPerfil = { tag: Autor; nome_publico?: string; bio?: string; nivel: string; pontos: number; suspenso: boolean };
type Eu = { perfil: MeuPerfil | null; curador: boolean; extrato: { tipo: string; pontos: number; criado_em: string }[]; candidaturas: { candidatura_id: string; estado: string; consentido_em?: string }[]; moderacoes: { moderacao_id: string; acao: string; justificativa: string }[] };


export default function Conta() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar" | "nova_senha">("entrar");
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState(""); const [tag, setTag] = useState(""); const [nome, setNome] = useState(""); const [bio, setBio] = useState("");
  const [termos, setTermos] = useState(false); const [disponivel, setDisponivel] = useState(false); const [logado, setLogado] = useState(false); const [iniciando, setIniciando] = useState(true);
  const [erro, setErro] = useState(""); const [aviso, setAviso] = useState(""); const [enviando, setEnviando] = useState(false); const [eu, setEu] = useState<Eu>(); const [confirmacao, setConfirmacao] = useState(""); const [revisao, setRevisao] = useState(0);
  const atualizar = () => setRevisao(r => r + 1);
  useEffect(() => {
    let ativo = true;
    comunidadeGet("discussoes").then(() => { if (ativo) setDisponivel(true); }).catch(() => { if (ativo) setDisponivel(false); });
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, sessao) => { if (ativo) { setLogado(!!sessao); if (evento === "PASSWORD_RECOVERY") setModo("nova_senha"); } });
    supabase.auth.getSession().then(({ data: sessao }) => { if (ativo) { setLogado(!!sessao.session); setIniciando(false); } });
    return () => { ativo = false; assinatura.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!logado) return;
    let ativo = true;
    async function carregar() {
      try {
        const me: Eu = await comunidadeGet("eu");
        if (!ativo) return;
        setEu(me); setTag(me.perfil ? nomeAutor(me.perfil.tag) : ""); setNome(me.perfil?.nome_publico || ""); setBio(me.perfil?.bio || ""); setTermos(!!me.perfil);
      } catch (e) { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível carregar seu perfil."); }
    }
    void carregar(); return () => { ativo = false; };
  }, [logado, revisao]);
  function continuar() { try { if (sessionStorage.getItem("bacuri-compartilhar-pendente")) router.push("/comunidade/compartilhar"); } catch { /* armazenamento opcional */ } }
  async function autenticar(e: React.FormEvent) {
    e.preventDefault(); setErro(""); setAviso(""); setEnviando(true);
    try {
      if (modo === "criar") { if (!disponivel) throw new Error("O cadastro está em preparação."); const r = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: `${location.origin}/conta` } }); if (r.error) throw r.error; setAviso("Confira seu e-mail para confirmar a conta. Depois, complete o perfil."); }
      else if (modo === "recuperar") { const r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/conta` }); if (r.error) throw r.error; setAviso("Se o endereço estiver cadastrado, enviaremos instruções."); }
      else if (modo === "nova_senha") { const r = await supabase.auth.updateUser({ password: senha }); if (r.error) throw r.error; setAviso("Senha atualizada."); setModo("entrar"); setSenha(""); }
      else { const r = await supabase.auth.signInWithPassword({ email, password: senha }); if (r.error) throw r.error; setLogado(true); atualizar(); const me: Eu = await comunidadeGet("eu"); if (me.perfil) continuar(); else setAviso("Complete seu perfil para participar. Seu rascunho será preservado."); }
    } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível concluir."); } finally { setEnviando(false); }
  }
  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault(); setEnviando(true); setErro("");
    try { await comunidadePost("salvar_perfil", { tag: "@" + tag.replace(/^@/, "").toLowerCase(), nome_publico: nome, bio, aceita_termos: true }); window.dispatchEvent(new Event("bacuri-perfil-atualizado")); atualizar(); setAviso("Perfil salvo."); continuar(); }
    catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível salvar."); } finally { setEnviando(false); }
  }
  async function sair() { const r = await supabase.auth.signOut(); if (r.error) setErro(r.error.message); else { setLogado(false); setEu(undefined); setSenha(""); } }
  async function reenviarConfirmacao() {
    setEnviando(true); setErro("");
    try { const r = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${location.origin}/conta` } }); if (r.error) throw r.error; setAviso("Solicitação de confirmação enviada. Confira sua caixa de entrada e a pasta de spam."); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível reenviar. Tente mais tarde."); } finally { setEnviando(false); }
  }
  return <main className="bc-page bc-profile-page">
    <NavegacaoComunidade /><header className="bc-account-hero"><div className="bc-page-heading"><span className="bc-eyebrow">SUA PARTICIPAÇÃO</span><h1>Sua conta</h1></div><p className="mt-2 text-sm">Seu e-mail fica privado. Você participa com uma tag pública; nome real é opcional.</p><Link className="bc-account-back" href="/comunidade">Voltar à comunidade <span aria-hidden="true">↗</span></Link></header>
    {iniciando && <p className="mt-4" role="status">Verificando sua sessão…</p>}
    {!disponivel && <p className="mt-4 text-sm">O cadastro público está em preparação. A pesquisa documental continua disponível.</p>}
    {(!logado || modo === "nova_senha") && !iniciando && <>
      <nav className="mt-4 flex flex-wrap gap-4 text-sm" aria-label="Acesso à conta"><button className="underline" onClick={() => setModo("entrar")}>Entrar</button><button disabled={!disponivel} className="underline disabled:opacity-50" onClick={() => setModo("criar")}>Criar conta</button><button className="underline" onClick={() => setModo("recuperar")}>Recuperar senha</button></nav>
      <form className="mt-5 space-y-3" onSubmit={autenticar}>{modo !== "nova_senha" && <label className="block text-sm">E-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>}{modo !== "recuperar" && <label className="block text-sm">{modo === "nova_senha" ? "Nova senha" : "Senha"}<input required type="password" minLength={modo === "entrar" ? 1 : 8} autoComplete={modo === "entrar" ? "current-password" : "new-password"} value={senha} onChange={e => setSenha(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>}<button className="bk-button" disabled={enviando || (modo === "criar" && !disponivel)}>{enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta gratuita" : modo === "recuperar" ? "Enviar instruções" : "Atualizar senha"}</button></form>
      {disponivel && email && <button type="button" className="mt-4 text-sm underline" disabled={enviando} onClick={() => void reenviarConfirmacao()}>Reenviar confirmação de e-mail</button>}
    </>}
    {logado && modo !== "nova_senha" && !eu && !erro && <p className="bc-empty" role="status">Carregando seu perfil…</p>}
    {logado && modo !== "nova_senha" && eu && <>
      <div className="bc-account-actions"><button className="underline" onClick={() => void sair()}>Sair da conta</button>{eu?.curador && <Link className="underline" href="/comunidade/curadoria">Painel de curadoria</Link>}</div>
      {eu?.perfil && <div className="bc-account-stats"><div><span>Tag pública</span><strong>{nomeAutor(eu.perfil.tag)}</strong></div><div><span>Participação</span><strong>{eu.curador ? "Curador(a)" : eu.perfil.nivel}{eu.perfil.suspenso && " · suspensa"}</strong></div><div><span>Pontos de participação</span><strong>{eu.perfil.pontos}</strong></div></div>}
      <div className="bc-account-workspace"><div className="bc-account-editor"><FotoPerfil /><form className="bc-panel bc-account-form space-y-4" onSubmit={salvarPerfil}><h2 className="font-semibold">{eu?.perfil ? "Editar perfil" : "Completar perfil"}</h2><label className="block text-sm">Tag pública<input required pattern="@[a-z0-9_]{3,30}" maxLength={31} placeholder="@sua_tag" value={tag} onChange={e => setTag(e.target.value.toLowerCase())} className="mt-1 block w-full rounded border p-2" /></label><label className="block text-sm">Nome público (opcional)<input maxLength={120} value={nome} onChange={e => setNome(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="block text-sm">Biografia (opcional)<textarea maxLength={500} value={bio} onChange={e => setBio(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="flex gap-2 text-sm"><input required type="checkbox" checked={termos} onChange={e => setTermos(e.target.checked)} /><span>Li as <Link className="underline" href="/comunidade/regras">regras</Link> e aceito publicar meus textos originais sob CC BY-SA 4.0. As fontes citadas mantêm seus próprios direitos.</span></label><button className="bk-button" disabled={!termos || enviando}>Salvar perfil <span aria-hidden="true">↗</span></button></form></div><aside className="bc-account-activity" aria-label="Sua participação">
      {!!eu?.candidaturas.length && <section className="bc-panel bc-account-card"><h2 className="font-semibold">Candidaturas à curadoria</h2>{eu.candidaturas.map(c => <div key={c.candidatura_id} className="mt-3"><p className="text-sm">Estado: {c.estado}</p>{c.estado === "pendente" && !c.consentido_em && <BotaoAcao acao="consentir_candidatura" dados={{ candidatura_id: c.candidatura_id }} concluido={atualizar}>Aceitar indicação à curadoria</BotaoAcao>}</div>)}</section>}
      <NotificacoesComunidade />
      <section className="bc-panel bc-account-card"><h2 className="font-semibold">Extrato de participação</h2>{!eu?.extrato.length ? <p className="mt-2 text-sm">Nenhum reconhecimento contabilizado.</p> : <ul className="mt-3 space-y-2">{eu.extrato.map((x, i) => <li className="text-sm" key={i}>{data(x.criado_em)} · {x.tipo.replaceAll("_", " ")} · {x.pontos > 0 ? "+" : ""}{x.pontos} pontos</li>)}</ul>}</section>
      {!!eu?.moderacoes.length && <section className="bc-panel bc-account-card"><h2 className="font-semibold">Moderações e recursos</h2>{eu.moderacoes.map(m => <details className="mt-3" key={m.moderacao_id}><summary className="text-sm">{m.acao.replaceAll("_", " ")}</summary><p className="mt-2 text-sm">{m.justificativa}</p><FormularioAcao acao="recorrer" base={{ alvo_tipo: "moderacao", alvo_id: m.moderacao_id }} rotulo="Justificativa do recurso" botao="Apresentar recurso" concluido={atualizar} /></details>)}</section>}
      </aside></div><details className="bc-account-close"><summary>Encerrar minha conta</summary><p className="mt-3 text-sm">Seu perfil será desativado. Contribuições e decisões permanecem no histórico com atribuição pública substituída por “Conta encerrada”. Curadores precisam sair do colegiado antes.</p><form className="mt-3 space-y-3" onSubmit={async e => { e.preventDefault(); setEnviando(true); setErro(""); try { await comunidadePost("encerrar_conta", { confirmacao }); await sair(); setAviso("Conta encerrada."); } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível encerrar."); } finally { setEnviando(false); } }}><label className="block text-sm">Digite ENCERRAR para confirmar<input required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><button className="bk-button" disabled={confirmacao !== "ENCERRAR" || enviando}>Confirmar encerramento</button></form></details>
    </>}
    {aviso && <p role="status" className="mt-5 text-sm">{aviso}</p>}{erro && <div className="mt-5"><MensagemErro erro={erro} /></div>}
  </main>;
}
