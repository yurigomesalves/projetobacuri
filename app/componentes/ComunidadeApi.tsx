"use client";


export type Autor = { tag?: string; nome_publico?: string } | string | null;
export function nomeAutor(autor: Autor) { return typeof autor === "string" ? autor : autor?.tag || autor?.nome_publico || "Participante"; }
export function data(valor?: string) { return valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(valor)) : ""; }
export async function comunidadeGet(recurso: string, params: Record<string,string> = {}) {
  const { tokenAtual } = await import("@/lib/client/supabase"); const token = await tokenAtual(); const qs = new URLSearchParams({ recurso, ...Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== "")) });
  const res = await fetch(`/api/comunidade?${qs}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json?.erro?.mensagem || "Não foi possível carregar este conteúdo."); return json;
}
export async function comunidadePost(acao: string, dados: object) {
  const { tokenAtual } = await import("@/lib/client/supabase"); const token = await tokenAtual(); if (!token) throw new Error("Entre com e-mail confirmado para continuar.");
  const res = await fetch("/api/comunidade", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({acao,dados}) });
  const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json?.erro?.mensagem || "Não foi possível concluir a ação."); return json;
}
export function MensagemErro({erro}:{erro:string}) { return <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>; }
