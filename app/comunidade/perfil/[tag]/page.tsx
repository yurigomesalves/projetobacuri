"use client";

import Link from "next/link";
import AvatarComunidade from "../../../componentes/AvatarComunidade";
import { NavegacaoComunidade } from "../../../componentes/ComunidadeLayout";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { comunidadeGet, data, MensagemErro, nomeAutor, type Autor } from "../../../componentes/ComunidadeApi";

type PerfilPublico = { tag: Autor; nome_publico?: string; bio?: string; nivel: string; pontos: number; criado_em: string; curador: boolean; contribuicoes: { discussao_id: string; titulo: string }[] };
export default function Perfil() {
  const { tag } = useParams<{ tag: string }>();
  const [perfil, setPerfil] = useState<PerfilPublico>();
  const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    comunidadeGet("perfil", { tag: "@" + decodeURIComponent(tag).replace(/^@/, "") }).then(d => { if (ativo) setPerfil(d); }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [tag]);
  return <main className="bc-page bc-profile-page">
    <NavegacaoComunidade /><Link href="/comunidade" className="bc-back">Voltar à comunidade</Link>
    {erro ? <div className="mt-4"><MensagemErro erro={erro} /></div> : !perfil ? <p role="status" className="mt-4">Carregando perfil…</p> : <>
      <div className="bc-public-profile-heading"><AvatarComunidade tag={nomeAutor(perfil.tag)} tamanho={88} /><div><span className="bc-eyebrow">PERFIL PÚBLICO</span><h1>{nomeAutor(perfil.tag)}</h1></div></div><p className="mt-2">{perfil.nome_publico}</p><p className="mt-2 whitespace-pre-wrap text-sm">{perfil.bio}</p>
      <p className="mt-4 text-sm">{perfil.curador ? "Curador(a) · " : ""}Nível: {perfil.nivel} · {perfil.pontos} pontos · desde {data(perfil.criado_em)}</p>
      <p className="mt-2 text-xs">Os pontos reconhecem contribuições verificadas. Eles não dão maior peso às avaliações nem substituem a análise das fontes.</p>
      <h2 className="mt-6 font-semibold">Discussões abertas</h2>
      {!perfil.contribuicoes.length && <p className="mt-2 text-sm">Nenhuma discussão pública.</p>}
      <ul className="mt-3 space-y-2">{perfil.contribuicoes.map(c => <li key={c.discussao_id}><Link className="underline" href={`/comunidade/${c.discussao_id}`}>{c.titulo}</Link></li>)}</ul>
    </>}
  </main>;
}
