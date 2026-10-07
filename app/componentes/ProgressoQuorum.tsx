"use client";

import type { Quorum } from "@/lib/server/quorum-comunidade";

export default function ProgressoQuorum({ quorum: q, tipo = "parecer", rotulosVotos = ["favoráveis", "contrários"] }: { quorum?: Quorum; tipo?: "parecer" | "unanimidade" | "destituicao"; rotulosVotos?: [string, string] }) {
  if (!q) return null;
  const concordantes = tipo === "parecer" ? Math.max(q.favoraveis, q.contrarios) : q.favoraveis;
  const unidade = tipo === "parecer" ? "pareceres concordantes" : q.necessarios === 1 ? "voto favorável" : "votos favoráveis";
  return <section className="bc-quorum" aria-label="Progresso do quórum">
    <div><strong>{concordantes} de {q.necessarios} {unidade}</strong><span>{q.elegiveis} {tipo === "unanimidade" ? q.elegiveis === 1 ? "curador em atividade" : "curadores em atividade" : q.elegiveis === 1 ? "curador elegível" : "curadores elegíveis"}</span></div>
    <progress aria-label={`Progresso: ${concordantes} de ${q.necessarios} ${unidade}`} value={Math.min(concordantes, q.necessarios)} max={Math.max(1, q.necessarios)} />
    <p>{tipo === "parecer" ? "Pareceres válidos" : "Votos registrados"}: {q.recebidos}</p>
    <p>{q.favoraveis} {rotulosVotos[0]} · {q.contrarios} {rotulosVotos[1]}{tipo === "parecer" && ` · ${q.ajustes} ${q.ajustes === 1 ? "pedido de ajuste" : "pedidos de ajuste"}`}</p>
    {q.insuficientes > 0 ? <p className="bc-quorum-warning">{q.insuficientes === 1 ? "Falta" : "Faltam"} {q.insuficientes} {q.insuficientes === 1 ? "curador elegível" : "curadores elegíveis"} para formar o quórum.</p> : q.faltam > 0 && <p>{q.faltam === 1 ? "Falta" : "Faltam"} {q.faltam} {tipo === "parecer" ? q.faltam === 1 ? "parecer concordante" : "pareceres concordantes" : q.faltam === 1 ? "voto favorável" : "votos favoráveis"}.</p>}
    {q.aguarda_consentimento && <p>Aguardando o consentimento da pessoa indicada.</p>}
    {q.aguarda_defesa && <p>A votação aguarda a defesa ou o prazo de sete dias.</p>}
    {tipo === "parecer" && <small>São necessários pelo menos dois pareceres concordantes; havendo divergência, exige-se maioria dos curadores elegíveis. A decisão é registrada após a conferência do banco.</small>}
  </section>;
}
