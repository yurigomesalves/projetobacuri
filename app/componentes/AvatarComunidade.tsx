"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function AvatarComunidade({ tag, tamanho = 32, revisao = 0 }: { tag?: string; tamanho?: number; revisao?: number }) {
  const [falhaEm, setFalhaEm] = useState<string>();
  const [versao, setVersao] = useState(revisao);
  useEffect(() => {
    const atualizar = () => { setVersao(Date.now()); };
    window.addEventListener("bacuri-perfil-atualizado", atualizar);
    return () => window.removeEventListener("bacuri-perfil-atualizado", atualizar);
  }, []);
  const iniciais = (tag || "B").replace(/^@/, "").split(/[_\s]+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const src = `/api/comunidade/foto?tag=${encodeURIComponent(tag || "")}&v=${versao}-${revisao}`;
  return <span className="bc-avatar" style={{ width: tamanho, height: tamanho, fontSize: Math.max(11, tamanho / 3) }} aria-hidden="true">
    {tag?.startsWith("@") && tag !== "@conta_desativada" && falhaEm !== src ? <Image key={`${tag}-${versao}-${revisao}`} src={src} alt="" width={tamanho} height={tamanho} unoptimized onError={() => setFalhaEm(src)} /> : iniciais}
  </span>;
}
