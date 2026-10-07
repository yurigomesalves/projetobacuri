"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { tokenAtual } from "@/lib/client/supabase";
import { MensagemErro } from "./ComunidadeApi";

export default function FotoPerfil() {
  const [imagem, setImagem] = useState<string>();
  const [erro, setErro] = useState(""); const [aviso, setAviso] = useState(""); const [ocupado, setOcupado] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const objeto = useRef<string | undefined>(undefined);
  function exibir(blob?: Blob) {
    if (objeto.current) URL.revokeObjectURL(objeto.current);
    objeto.current = blob ? URL.createObjectURL(blob) : undefined; setImagem(objeto.current);
  }
  useEffect(() => {
    let ativo = true;
    void tokenAtual().then(async token => {
      if (!token) return;
      const res = await fetch("/api/comunidade/foto", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const blob = await res.blob(); if (ativo) { objeto.current = URL.createObjectURL(blob); setImagem(objeto.current); } }
    }).catch(() => {});
    return () => { ativo = false; if (objeto.current) URL.revokeObjectURL(objeto.current); };
  }, []);
  async function salvar(foto?: File) {
    if (foto && (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) || foto.size > 2 * 1024 * 1024)) { setErro("Use JPG, PNG ou WebP de até 2 MB."); return; }
    setOcupado(true); setErro(""); setAviso("");
    try {
      const token = await tokenAtual(); if (!token) throw new Error("Entre novamente para continuar.");
      const form = new FormData(); if (foto) form.set("foto", foto);
      const res = await fetch("/api/comunidade/foto", { method: foto ? "POST" : "DELETE", headers: { Authorization: `Bearer ${token}` }, ...(foto ? { body: form } : {}) });
      if (!res.ok) { const dados = await res.json(); throw new Error(dados.erro?.mensagem || "Não foi possível atualizar a foto."); }
      exibir(foto); setAviso(foto ? "Foto salva." : "Foto removida.");
      window.dispatchEvent(new Event("bacuri-perfil-atualizado"));
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível atualizar a foto."); }
    finally { setOcupado(false); if (arquivo.current) arquivo.current.value = ""; }
  }
  return <section className="bc-photo-editor" aria-label="Foto de perfil">
    <div className="bc-photo-preview">{imagem ? <Image src={imagem} width={88} height={88} alt="Sua foto de perfil" unoptimized /> : <span aria-hidden="true">Você</span>}</div>
    <div><h2>Foto de perfil <span className="bc-muted">· opcional</span></h2><p>Visível junto à sua tag. JPG, PNG ou WebP, até 2 MB.</p>
      <p className="bc-photo-note">A foto não verifica identidade. Escolha uma imagem que você possa publicar.</p>
      <div className="bc-photo-actions"><label className={`bc-small-button ${ocupado ? "bc-disabled" : ""}`}>Escolher foto<input ref={arquivo} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado} onChange={e => { const foto = e.target.files?.[0]; if (foto) void salvar(foto); }} /></label>{imagem && <button type="button" className="bc-text-button" disabled={ocupado} onClick={() => void salvar()}>Remover foto</button>}</div>
      {ocupado && <p role="status">Salvando…</p>}{aviso && <p role="status">{aviso}</p>}{erro && <MensagemErro erro={erro} />}
    </div>
  </section>;
}
