"use client";

import { useState, type ReactNode } from "react";
import { comunidadeGet, comunidadePost, MensagemErro } from "./ComunidadeApi";

export type FonteComunidade = { chunk_id: string; titulo: string; autor_orgao: string; paginas?: string; trecho?: string; url_origem?: string; tipo_fonte?: string; proveniencia?: string; nota_contexto?: string };
export function FontesProposta({ fontes }: { fontes: FonteComunidade[] }) {
  return <ol className="mt-3 space-y-3">{fontes.map((f, i) => <li key={f.chunk_id} className="text-sm"><strong>[{i + 1}] {f.titulo}</strong><p>{f.autor_orgao} · {f.paginas ? `p. ${f.paginas}` : "página não informada"}</p>{f.tipo_fonte && <p className="text-xs">Tipo de fonte: {f.tipo_fonte.replaceAll("_", " ")}</p>}{f.proveniencia && <p className="text-xs">Proveniência: {f.proveniencia}</p>}{f.nota_contexto && <p className="mt-2 text-xs">Contexto: {f.nota_contexto}</p>}<details><summary>Trecho documental</summary><blockquote className="whitespace-pre-wrap">{f.trecho}</blockquote></details>{f.url_origem && /^https?:\/\//i.test(f.url_origem) && <a className="underline" href={f.url_origem} target="_blank" rel="noopener noreferrer">Fonte original (nova aba)</a>}</li>)}</ol>;
}

export function FormularioAcao({ acao, base, campo = "motivo", rotulo, botao = "Enviar", minimo = 10, maximo = 3000, inicial = "", concluido }: { acao: string; base: Record<string, unknown>; campo?: string; rotulo: string; botao?: string; minimo?: number; maximo?: number; inicial?: string; concluido: () => void | Promise<void> }) {
  const [texto, setTexto] = useState(inicial);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  return <form className="mt-3 space-y-3" onSubmit={async e => { e.preventDefault(); setEnviando(true); setErro(""); try { await comunidadePost(acao, { ...base, [campo]: texto }); setTexto(""); await concluido(); } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível enviar."); } finally { setEnviando(false); } }}>
    <label className="block text-sm">{rotulo}<textarea required minLength={minimo} maxLength={maximo} value={texto} onChange={e => setTexto(e.target.value)} className="mt-1 block min-h-24 w-full rounded border p-2" /></label>
    <button className="bk-button" disabled={enviando}>{enviando ? "Enviando…" : botao}</button>{erro && <MensagemErro erro={erro} />}
  </form>;
}

export function BotaoAcao({ acao, dados, children, concluido, disabled = false }: { acao: string; dados: Record<string, unknown>; children: ReactNode; concluido: () => void | Promise<void>; disabled?: boolean }) {
  const [erro, setErro] = useState(""); const [enviando, setEnviando] = useState(false);
  return <><button type="button" className="text-sm underline disabled:opacity-50" disabled={enviando || disabled} onClick={async () => { setEnviando(true); setErro(""); try { await comunidadePost(acao, dados); await concluido(); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível concluir."); } finally { setEnviando(false); } }}>{children}</button>{erro && <MensagemErro erro={erro} />}</>;
}

export function AvaliarProposta({ versaoId, minha, concluido }: { versaoId: string; minha?: string | null; concluido: () => void | Promise<void> }) {
  const [tipo, setTipo] = useState(minha || "apoio"); const [justificativa, setJustificativa] = useState(""); const [erro, setErro] = useState(""); const [enviando, setEnviando] = useState(false);
  return <form className="mt-4 space-y-3" onSubmit={async e => { e.preventDefault(); setErro(""); setEnviando(true); try { await comunidadePost("avaliar", { versao_id: versaoId, tipo, ...(tipo !== "apoio" ? { justificativa } : {}) }); await concluido(); } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível avaliar."); } finally { setEnviando(false); } }}>
    <label className="block text-sm">Sua avaliação<select aria-label="Sua avaliação" value={tipo} onChange={e => setTipo(e.target.value)} className="mt-1 block max-w-full rounded border p-2"><option value="apoio">Apoio</option><option value="ajustes">Precisa de ajustes</option><option value="sem_fundamento">Sem fundamento</option></select></label>
    {tipo !== "apoio" && <label className="block text-sm">Justifique com base nas fontes<textarea required minLength={3} maxLength={2000} value={justificativa} onChange={e => setJustificativa(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>}
    <div className="flex flex-wrap gap-4"><button className="bk-button" disabled={enviando}>Registrar avaliação</button>{minha && <BotaoAcao acao="avaliar" dados={{ versao_id: versaoId, remover: true }} concluido={concluido}>Retirar minha avaliação</BotaoAcao>}</div>
    {erro && <MensagemErro erro={erro} />}
  </form>;
}

export function OrganizarDiscussao({ discussaoId, concluido }: { discussaoId: string; concluido: () => void }) {
  const [etiqueta, setEtiqueta] = useState(""); const [relacao, setRelacao] = useState(""); const [erro, setErro] = useState(""); const [enviando, setEnviando] = useState(false);
  async function registrar(tipo: string) {
    setErro(""); setEnviando(true);
    try {
      const id = new URL(relacao, location.origin).pathname.split("/").filter(Boolean).at(-1);
      await comunidadePost("organizar", { alvo_id: discussaoId, tipo, dados: tipo === "etiquetar" ? { etiqueta } : { discussao_id: id } }); concluido();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível organizar."); } finally { setEnviando(false); }
  }
  return <details className="mt-4"><summary className="text-sm">Organizar discussão</summary>
    <p className="mt-2 text-xs">Etiquetas e relações ajudam a leitura e ficam no histórico; não alteram votos nem decisões.</p>
    <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); void registrar("etiquetar"); }}><label className="block text-sm">Etiqueta<input required maxLength={50} value={etiqueta} onChange={e => setEtiqueta(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><button className="bk-button" disabled={enviando}>Adicionar etiqueta</button></form>
    <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); void registrar("relacionar"); }}><label className="block text-sm">Link de outra discussão<input required value={relacao} onChange={e => setRelacao(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><button className="bk-button" disabled={enviando}>Relacionar discussões</button></form>
    {erro && <MensagemErro erro={erro} />}
  </details>;
}

type InicialProposta = { texto: string; justificativa: string; fontes_sugeridas?: string; chunk_ids: string[]; fontes: FonteComunidade[] };
export function EditorProposta({ discussaoId, propostaId, origemId, inicial, comentarios, concluido }: { discussaoId: string; propostaId?: string; origemId?: string; inicial?: InicialProposta; comentarios: { comentario_id: string; texto: string }[]; concluido: () => void | Promise<void> }) {
  const [texto, setTexto] = useState(inicial?.texto || ""); const [justificativa, setJustificativa] = useState(inicial?.justificativa || "");
  const [externas, setExternas] = useState(inicial?.fontes_sugeridas || ""); const [selecionadas, setSelecionadas] = useState<FonteComunidade[]>(inicial?.fontes || []);
  const [incorporado, setIncorporado] = useState(""); const [busca, setBusca] = useState(""); const [encontradas, setEncontradas] = useState<FonteComunidade[]>([]);
  const [erro, setErro] = useState(""); const [avisoBusca, setAvisoBusca] = useState(""); const [buscando, setBuscando] = useState(false); const [enviando, setEnviando] = useState(false);
  async function buscar() { setBuscando(true); setAvisoBusca(""); try { const r: { itens: FonteComunidade[] } = await comunidadeGet("fontes", { q: busca }); setEncontradas(r.itens); if (!r.itens.length) setAvisoBusca("Nenhum trecho encontrado. Você pode sugerir uma fonte externa abaixo."); } catch (e) { setAvisoBusca(e instanceof Error ? e.message : "Não foi possível buscar."); } finally { setBuscando(false); } }
  return <form className="mt-3 space-y-4" onSubmit={async e => { e.preventDefault(); setEnviando(true); setErro(""); try { await comunidadePost(propostaId ? "revisar_proposta" : "propor", { ...(propostaId ? { proposta_id: propostaId } : { discussao_id: discussaoId, ...(origemId ? { proposta_origem_id: origemId } : {}) }), texto, justificativa, fontes_sugeridas: externas, chunk_ids: selecionadas.map(f => f.chunk_id), ...(incorporado ? { comentario_incorporado_id: incorporado } : {}) }); if (!propostaId) { setTexto(""); setJustificativa(""); setExternas(""); setSelecionadas([]); } await concluido(); } catch (x) { setErro(x instanceof Error ? x.message : "Não foi possível publicar a proposta."); } finally { setEnviando(false); } }}>
    <label className="block text-sm">Resposta alternativa completa<textarea required minLength={10} maxLength={12000} value={texto} onChange={e => setTexto(e.target.value)} className="mt-1 block min-h-40 w-full rounded border p-2" /></label>
    <label className="block text-sm">Justificativa da mudança<textarea required minLength={10} maxLength={3000} value={justificativa} onChange={e => setJustificativa(e.target.value)} className="mt-1 block min-h-24 w-full rounded border p-2" /></label>
    <fieldset className="space-y-3 rounded border p-3"><legend className="px-1 text-sm font-semibold">Trechos do acervo (até oito)</legend>
      <p className="text-xs">Vincule trechos que sustentem o texto e indique seus números na resposta. Conferir os trechos é responsabilidade editorial.</p>
      <label className="block text-sm">Buscar documento ou conteúdo<input minLength={3} maxLength={150} value={busca} onChange={e => setBusca(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <button type="button" className="text-sm underline" disabled={buscando || busca.trim().length < 3} onClick={() => void buscar()}>{buscando ? "Buscando…" : "Buscar trechos"}</button>
      {avisoBusca && <p role="status" className="text-sm">{avisoBusca}</p>}
      <ul className="space-y-3">{encontradas.map(f => <li key={f.chunk_id}><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selecionadas.some(s => s.chunk_id === f.chunk_id)} disabled={!selecionadas.some(s => s.chunk_id === f.chunk_id) && selecionadas.length >= 8} onChange={e => setSelecionadas(s => e.target.checked ? [...s, f] : s.filter(x => x.chunk_id !== f.chunk_id))} /><span>{f.titulo} · {f.autor_orgao} · p. {f.paginas || "não informada"}<span className="mt-1 block whitespace-pre-wrap text-xs">{f.trecho}</span></span></label></li>)}</ul>
      {!!selecionadas.length && <div><p className="text-sm font-semibold">Trechos vinculados</p><ol className="mt-2 space-y-2">{selecionadas.map((f, i) => <li className="text-xs" key={f.chunk_id}>[{i + 1}] {f.titulo} · p. {f.paginas || "não informada"} <button type="button" className="ml-2 underline" onClick={() => setSelecionadas(s => s.filter(x => x.chunk_id !== f.chunk_id))}>Remover trecho {i + 1}</button></li>)}</ol></div>}
    </fieldset>
    <label className="block text-sm">Fontes externas sugeridas (opcional)<textarea maxLength={4000} value={externas} onChange={e => setExternas(e.target.value)} className="mt-1 block w-full rounded border p-2" /><span className="text-xs">Indique autoria, documento, página e endereço. A aprovação como ouro exige vincular a fonte ao acervo.</span></label>
    {!!comentarios.length && <label className="block text-sm">Sugestão de comentário incorporada<select aria-label="Sugestão de comentário incorporada" value={incorporado} onChange={e => setIncorporado(e.target.value)} className="mt-1 block w-full rounded border p-2"><option value="">Nenhuma</option>{comentarios.map(c => <option key={c.comentario_id} value={c.comentario_id}>{c.texto.slice(0, 100)}</option>)}</select></label>}
    <button className="bk-button" disabled={enviando || (!selecionadas.length && externas.trim().length < 10)}>{enviando ? "Publicando…" : propostaId ? "Publicar nova versão" : "Publicar proposta"}</button>
    {propostaId && <p className="text-xs">A versão anterior e suas avaliações serão preservadas. A nova versão inicia outra rodada.</p>}{erro && <MensagemErro erro={erro} />}
  </form>;
}
