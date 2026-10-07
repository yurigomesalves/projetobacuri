"use client";

import Link from "next/link";
import MenuAcoesComunidade from "../../componentes/MenuAcoesComunidade";
import AvatarComunidade from "../../componentes/AvatarComunidade";
import ComunidadeLayout, { NavegacaoComunidade } from "../../componentes/ComunidadeLayout";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Citacao } from "@/lib/shared/tipos";
import Citacoes from "../../componentes/Citacoes";
import { comunidadeGet, data, MensagemErro, nomeAutor, type Autor } from "../../componentes/ComunidadeApi";
import { AvaliarProposta, BotaoAcao, EditorProposta, FontesProposta, FormularioAcao, OrganizarDiscussao, type FonteComunidade } from "../../componentes/DiscussaoFormularios";

type Comentario = { comentario_id: string; autor: Autor; autor_id: string; pai_id: string | null; texto: string; criado_em: string; revisoes: { texto: string; versao: number }[] };
type Decisao = { decisao_id: string; resultado: string; sintese: string; criada_em: string; ciclo: number };
type Versao = { versao_id: string; numero: number; texto: string; justificativa: string; fontes_sugeridas?: string; chunk_ids: string[]; fontes: FonteComunidade[]; comentario_incorporado_id?: string; estado: string; minha_avaliacao?: string; apoios: number; ajustes: number; sem_fundamento: number; avaliacoes: { autor: Autor; tipo: string; justificativa?: string }[]; pareceres: { autor: Autor; resultado: string; justificativa: string; ciclo: number }[]; decisoes: Decisao[] };
type Proposta = { proposta_id: string; autor: Autor; autor_id: string; estado: string; versao_atual: number; proposta_origem_id?: string; versoes: Versao[] };
type Discussao = { titulo: string; motivo: string; categoria: string; autor: Autor; autor_id: string; criado_em: string; pergunta: string; resumo: string; resposta: string; citacoes: Citacao[]; acompanhando: boolean; comentarios: Comentario[]; propostas: Proposta[]; total_comentarios: number; total_propostas: number; organizacao: { acao: string; dados: { etiqueta?: string; discussao_id?: string }; autor: Autor }[] };
type Eu = { user_id: string; perfil: { nivel: string } | null };
const votos: Record<string, string> = { apoio: "Apoio", ajustes: "Precisa de ajustes", sem_fundamento: "Sem fundamento", aprovar: "Aprovar", recusar: "Recusar", aprovada: "Aprovada", recusada: "Recusada" };

function AutorLink({ autor }: { autor: Autor }) {
  const nome = nomeAutor(autor);
  return nome.startsWith("@") && nome !== "@conta_desativada" ? <Link className="bc-author" href={`/comunidade/perfil/${encodeURIComponent(nome)}`}><AvatarComunidade tag={nome} tamanho={26} /><span>{nome}</span></Link> : <span>{nome === "@conta_desativada" ? "Conta encerrada" : nome}</span>;
}
function ComentarioItem({ comentario: c, userId, discussaoId, concluido }: { comentario: Comentario; userId?: string; discussaoId: string; concluido: () => void }) {
  const [painel, setPainel] = useState<"responder" | "historico" | "editar" | "denunciar" | null>(null);
  function concluir() { setPainel(null); concluido(); }
  return <article id={c.comentario_id} className={`bc-comment ${c.pai_id ? "bc-comment-reply" : ""}`}>
    <header className="bc-comment-header"><div><AutorLink autor={c.autor} /><span>{data(c.criado_em)}</span>{c.revisoes.length > 1 && <span>· editado</span>}</div>
      <MenuAcoesComunidade rotulo={`Opções do comentário de ${nomeAutor(c.autor)}`}>
        <button type="button" onClick={e => { setPainel("historico"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Histórico do comentário</button>
        {userId === c.autor_id && <button type="button" onClick={e => { setPainel("editar"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Editar meu comentário</button>}
        {userId && userId !== c.autor_id && <button type="button" onClick={e => { setPainel("denunciar"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Denunciar comentário</button>}
      </MenuAcoesComunidade>
    </header>
    {c.pai_id && <a className="bc-comment-parent" href={`#${c.pai_id}`}>↳ Resposta a comentário</a>}
    <p className="bc-comment-text whitespace-pre-wrap">{c.texto}</p>
    <div className="bc-comment-actions">
      {userId && <button type="button" aria-expanded={painel === "responder"} onClick={() => setPainel(painel === "responder" ? null : "responder")}>Responder</button>}
      {userId && c.autor_id !== userId && <BotaoAcao acao="reconhecer_comentario" dados={{ comentario_id: c.comentario_id }} concluido={concluido}>Reconhecer como útil</BotaoAcao>}
    </div>
    {painel && <section className="bc-comment-panel"><div className="bc-comment-panel-heading"><h4>{painel === "historico" ? "Histórico do comentário" : painel === "editar" ? "Editar meu comentário" : painel === "denunciar" ? "Denunciar comentário" : "Responder"}</h4><button type="button" onClick={() => setPainel(null)}>Fechar</button></div>
      {painel === "historico" && c.revisoes.map(r => <div className="bc-comment-version" key={r.versao}><strong>Versão {r.versao}</strong><p className="whitespace-pre-wrap">{r.texto}</p></div>)}
      {painel === "responder" && userId && <FormularioAcao key="responder" acao="comentar" base={{ discussao_id: discussaoId, pai_id: c.pai_id || c.comentario_id }} campo="texto" minimo={1} maximo={4000} rotulo="Sua resposta" botao="Publicar comentário" concluido={concluir} />}
      {painel === "editar" && userId === c.autor_id && <FormularioAcao key="editar" acao="editar_comentario" base={{ comentario_id: c.comentario_id }} campo="texto" minimo={1} maximo={4000} inicial={c.texto} rotulo="Texto revisado" botao="Salvar revisão" concluido={concluir} />}
      {painel === "denunciar" && userId && userId !== c.autor_id && <FormularioAcao key="denunciar" acao="denunciar" base={{ alvo_tipo: "comentario", alvo_id: c.comentario_id }} maximo={2000} rotulo="Motivo da denúncia" concluido={concluir} />}
    </section>}
  </article>;
}

function PropostaItem({ proposta: p, userId, discussaoId, comentarios, concluido }: { proposta: Proposta; userId?: string; discussaoId: string; comentarios: Comentario[]; concluido: () => void }) {
  const [painel, setPainel] = useState<"revisar" | "alternativa" | "denunciar" | null>(null);
  function concluir() { setPainel(null); concluido(); }
  const atual = p.versoes.find(v => v.numero === p.versao_atual);
  const proprias = userId === p.autor_id;
  const disponivel = atual && ["aberta", "encaminhada", "recorrida"].includes(atual.estado);
  return <article id={p.proposta_id} className="bc-proposal">
    <header className="bc-comment-header"><h3 className="bc-proposal-title">Proposta de <AutorLink autor={p.autor} /></h3>
      {userId && atual && (!proprias || (disponivel && atual.estado !== "recorrida")) && <MenuAcoesComunidade rotulo={`Opções da proposta de ${nomeAutor(p.autor)}`}>
        {proprias && disponivel && atual.estado !== "recorrida" && <button type="button" onClick={e => { setPainel("revisar"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Revisar minha proposta</button>}
        {!proprias && <><button type="button" onClick={e => { setPainel("alternativa"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Sugerir resposta alternativa</button><button type="button" onClick={e => { setPainel("denunciar"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Denunciar proposta</button></>}
      </MenuAcoesComunidade>}
    </header><p className="mt-1 text-xs">Estado: {p.estado}{p.proposta_origem_id && <> · <a href={`#${p.proposta_origem_id}`} className="underline">Proposta de origem</a></>}</p>
    {p.versoes.map(v => <details id={v.versao_id} key={v.versao_id} open={v.numero === p.versao_atual} className="mt-4 scroll-mt-24 border-t pt-3">
      <summary className="font-semibold text-sm">Versão {v.numero}{v.numero === p.versao_atual ? " (atual)" : " (histórico)"}</summary>
      <p className="mt-3 whitespace-pre-wrap text-sm">{v.texto}</p><p className="mt-3 whitespace-pre-wrap text-sm"><strong>Justificativa: </strong>{v.justificativa}</p>
      {v.fontes_sugeridas && <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Fontes sugeridas: </strong>{v.fontes_sugeridas}</p>}
      {!!v.fontes.length && <FontesProposta fontes={v.fontes} />}
      {v.comentario_incorporado_id && <p className="mt-3 text-xs">Sugestão incorporada: <a className="underline" href={`#${v.comentario_incorporado_id}`}>consultar comentário</a></p>}
      <div className="bc-vote-summary"><span><strong>{v.apoios}</strong> apoios</span><span><strong>{v.ajustes}</strong> pedidos de ajuste</span><span><strong>{v.sem_fundamento}</strong> sem fundamento</span></div>
      {!!v.avaliacoes.length && <details className="mt-3 text-sm"><summary>Avaliações e justificativas</summary>{v.avaliacoes.map((a, i) => <p className="mt-2 whitespace-pre-wrap" key={i}><AutorLink autor={a.autor} />: {votos[a.tipo] || a.tipo}{a.justificativa && ` — ${a.justificativa}`}</p>)}</details>}
      {userId && !proprias && v.numero === p.versao_atual && disponivel && <AvaliarProposta key={`${v.versao_id}-${v.minha_avaliacao}`} versaoId={v.versao_id} minha={v.minha_avaliacao} concluido={concluido} />}
      {!!v.pareceres.length && <details className="mt-4 text-sm"><summary>Pareceres da curadoria</summary>{v.pareceres.map((pc, i) => <div className="mt-3" key={i}><p><AutorLink autor={pc.autor} /> · rodada {pc.ciclo} · {votos[pc.resultado] || pc.resultado}</p><p className="whitespace-pre-wrap">{pc.justificativa}</p></div>)}</details>}
      {v.decisoes.map(dc => <section className="mt-4 rounded border p-3" key={dc.decisao_id}><h4 className="font-semibold text-sm">Decisão: {votos[dc.resultado] || dc.resultado}</h4><p className="mt-2 whitespace-pre-wrap text-sm">{dc.sintese}</p><p className="mt-2 text-xs">{data(dc.criada_em)} · rodada {dc.ciclo} · <Link href="/transparencia#decisoes-comunidade" className="underline">Transparência editorial</Link></p>{userId && v.numero === p.versao_atual && v.estado === "decidida" && dc.ciclo === Math.max(...v.decisoes.map(d => d.ciclo)) && <details className="mt-3"><summary className="text-sm">Apresentar recurso</summary><FormularioAcao acao="recorrer" base={{ alvo_tipo: "decisao", alvo_id: dc.decisao_id }} rotulo="Justificativa e novas evidências" botao="Enviar recurso" concluido={concluido} /></details>}</section>)}
    </details>)}
    {userId && atual && painel && <section className="bc-comment-panel"><div className="bc-comment-panel-heading"><h4>{painel === "revisar" ? "Revisar minha proposta" : painel === "alternativa" ? "Sugerir resposta alternativa" : "Denunciar proposta"}</h4><button type="button" onClick={() => setPainel(null)}>Fechar</button></div>
      {painel === "revisar" && proprias && disponivel && atual.estado !== "recorrida" && <EditorProposta key={atual.versao_id} discussaoId={discussaoId} propostaId={p.proposta_id} inicial={atual} comentarios={comentarios.filter(c => c.autor_id !== userId)} concluido={concluir} />}
      {painel === "alternativa" && !proprias && <EditorProposta discussaoId={discussaoId} origemId={p.proposta_id} comentarios={comentarios.filter(c => c.autor_id !== userId)} concluido={concluir} />}
      {painel === "denunciar" && !proprias && <FormularioAcao acao="denunciar" base={{ alvo_tipo: "proposta", alvo_id: p.proposta_id }} maximo={2000} rotulo="Motivo da denúncia" concluido={concluir} />}
    </section>}
  </article>;
}
export default function DiscussaoPagina() {
  const { id } = useParams<{ id: string }>();
  const [discussao, setDiscussao] = useState<Discussao>(); const [eu, setEu] = useState<Eu>();
  const [erro, setErro] = useState(""); const [pagina, setPagina] = useState(1); const [revisao, setRevisao] = useState(0); const [carregando, setCarregando] = useState(true);
  const atualizar = () => setRevisao(r => r + 1);
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro("");
      const versaoAlvo = new URL(location.href).searchParams.get("versao_id");
      const resultados = await Promise.allSettled([comunidadeGet("discussao", { id, pagina: String(pagina), ...(versaoAlvo ? { versao_id: versaoAlvo } : {}) }), comunidadeGet("eu")]);
      if (!ativo) return;
      if (resultados[0].status === "fulfilled") setDiscussao(resultados[0].value); else setErro(resultados[0].reason instanceof Error ? resultados[0].reason.message : "Não foi possível carregar.");
      setEu(resultados[1].status === "fulfilled" ? resultados[1].value : undefined); setCarregando(false);
    }
    void carregar(); return () => { ativo = false; };
  }, [id, pagina, revisao]);
  useEffect(() => {
    if (!discussao || !location.hash) return;
    const alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (alvo instanceof HTMLDetailsElement) alvo.open = true;
    alvo?.scrollIntoView({ block: "start" });
  }, [discussao]);
  if (carregando && !discussao) return <main className="p-6"><p role="status">Carregando discussão…</p></main>;
  if (erro || !discussao) return <main className="p-6"><MensagemErro erro={erro || "Discussão indisponível."} /></main>;
  const d = discussao; const userId = eu?.perfil ? eu.user_id : undefined;
  return <main className="bc-page bc-thread-page">
    <NavegacaoComunidade /><ComunidadeLayout><div className="bc-thread">
    <Link className="bc-back" href="/comunidade">← Voltar à comunidade</Link><h1 className="bc-thread-title">{d.titulo}</h1><p className="mt-2 text-xs"><AutorLink autor={d.autor} /> · {data(d.criado_em)} · {d.categoria}</p><p className="mt-3 whitespace-pre-wrap">{d.motivo}</p>
    <nav className="bc-thread-jumps" aria-label="Nesta discussão"><a href="#resposta-original">Resposta original</a><a href="#propostas">Propostas ({d.total_propostas})</a><a href="#comentarios">Comentários ({d.total_comentarios})</a></nav>
    <section className="bc-original" id="resposta-original"><div className="bc-section-heading"><div><span className="bc-eyebrow">PONTO DE PARTIDA</span><h2>Pergunta e resposta originais</h2></div><span className="bc-category">Chat BACURI</span></div><p className="mt-3 whitespace-pre-wrap"><strong>Pergunta: </strong>{d.pergunta}</p>{d.resumo && <p className="mt-3 whitespace-pre-wrap"><strong>Em síntese: </strong>{d.resumo}</p>}<p className="mt-3 whitespace-pre-wrap text-sm">{d.resposta}</p><Citacoes citacoes={d.citacoes || []} idResposta={`discussao-${id}`} /></section>
    {userId ? <div className="mt-4"><BotaoAcao acao="acompanhar" dados={{ discussao_id: id, remover: d.acompanhando }} concluido={atualizar}>{d.acompanhando ? "Deixar de acompanhar" : "Acompanhar discussão"}</BotaoAcao></div> : <p className="mt-4 text-sm"><Link className="underline" href="/conta">Entre ou complete seu perfil</Link> para comentar, propor e avaliar.</p>}
    {!!d.organizacao?.length && <details className="mt-4 text-sm"><summary>Etiquetas e discussões relacionadas</summary><ul>{d.organizacao.map((o, i) => <li key={i}>{o.dados.etiqueta || (o.dados.discussao_id && <Link className="underline" href={`/comunidade/${o.dados.discussao_id}`}>Discussão relacionada</Link>)} · {nomeAutor(o.autor)}</li>)}</ul></details>}
    {userId && userId !== d.autor_id && <details className="mt-4"><summary className="text-xs">Denunciar discussão</summary><FormularioAcao acao="denunciar" base={{ alvo_tipo: "discussao", alvo_id: id }} maximo={2000} rotulo="Motivo da denúncia" concluido={atualizar} /></details>}
    {userId && ["revisor", "referencia"].includes(eu?.perfil?.nivel || "") && <OrganizarDiscussao discussaoId={id} concluido={atualizar} />}
    <section className="bc-thread-section" id="propostas"><h2 className="bc-section-title">Propostas de melhoria ({d.total_propostas})</h2>{!d.propostas.length && <p className="mt-2 text-sm">Nenhuma proposta nesta página.</p>}{d.propostas.map(p => <PropostaItem key={p.proposta_id} proposta={p} userId={userId} discussaoId={id} comentarios={d.comentarios} concluido={atualizar} />)}{userId && <details className="mt-6"><summary className="font-semibold">Propor uma resposta mais adequada</summary><EditorProposta discussaoId={id} comentarios={d.comentarios.filter(c => c.autor_id !== userId)} concluido={atualizar} /></details>}</section>
    <section className="bc-thread-section" id="comentarios"><h2 className="bc-section-title">Comentários ({d.total_comentarios})</h2>{!d.comentarios.length && <p className="mt-2 text-sm">Nenhum comentário nesta página.</p>}{d.comentarios.map(c => <ComentarioItem key={c.comentario_id} comentario={c} userId={userId} discussaoId={id} concluido={atualizar} />)}{userId && <FormularioAcao acao="comentar" base={{ discussao_id: id }} campo="texto" minimo={1} maximo={4000} rotulo="Novo comentário" botao="Publicar comentário" concluido={atualizar} />}</section>
    {Math.max(d.total_comentarios, d.total_propostas) > 20 && <nav className="mt-6 flex justify-between" aria-label="Páginas da discussão"><button disabled={pagina === 1 || carregando} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Página {pagina}</span><button disabled={pagina * 20 >= Math.max(d.total_comentarios, d.total_propostas) || carregando} onClick={() => setPagina(p => p + 1)}>Próxima</button></nav>}
  </div></ComunidadeLayout></main>;
}
