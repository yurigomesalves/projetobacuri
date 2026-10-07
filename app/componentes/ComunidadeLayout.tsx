"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/client/supabase";
import { comunidadeGet } from "./ComunidadeApi";

export function NavegacaoComunidade() {
  const caminho = usePathname();
  const [curador, setCurador] = useState(false);
  useEffect(() => {
    let ativo = true; let versao = 0;
    async function carregar() {
      const atual = ++versao;
      try {
        const { data } = await supabase.auth.getSession();
        const eu = data.session ? await comunidadeGet("eu") : null;
        if (ativo && atual === versao) setCurador(eu?.curador === true);
      } catch { if (ativo && atual === versao) setCurador(false); }
    }
    void carregar();
    const { data } = supabase.auth.onAuthStateChange(() => queueMicrotask(() => void carregar()));
    window.addEventListener("bacuri-perfil-atualizado", carregar);
    return () => { ativo = false; data.subscription.unsubscribe(); window.removeEventListener("bacuri-perfil-atualizado", carregar); };
  }, []);
  const links = [["/comunidade", "Discussões"], ["/comunidade/ouro", "Respostas de referência"], ["/comunidade/regras", "Como participar"], ["/conta", "Meu perfil"], ["/comunidade/curadoria", "Curadoria"]];
  return <nav className="bc-nav" aria-label="Comunidade">{links.filter(([href]) => href !== "/comunidade/curadoria" || curador).map(([href, label]) => <Link key={href} href={href} aria-current={caminho === href ? "page" : undefined}>{label}</Link>)}</nav>;
}
export function GuiaComunidade() {
  return <aside className="bc-aside"><section className="bc-panel"><span className="bc-eyebrow">CONSTRUÇÃO COLETIVA</span><h2>Uma resposta pode abrir uma conversa.</h2><p>Confira documentos, compartilhe dúvidas e ajude a tornar as respostas mais precisas.</p><Link href="/" className="bk-button">Pesquisar no chat <span aria-hidden="true">↗</span></Link></section>
    <section className="bc-panel"><h2>Da discussão à curadoria</h2><ol className="bc-steps"><li><span>01</span><div><strong>Discuta a resposta</strong><p>Abra uma discussão a partir de uma resposta do chat.</p></div></li><li><span>02</span><div><strong>Proponha com fontes</strong><p>Escreva uma alternativa e explique a mudança.</p></div></li><li><span>03</span><div><strong>Avalie e contribua</strong><p>Justifique ajustes e incorpore outras contribuições.</p></div></li><li><span>04</span><div><strong>Curadoria decide</strong><p>O parecer e a decisão ficam públicos.</p></div></li></ol><Link className="bc-inline-link" href="/comunidade/regras">Conheça as regras <span aria-hidden="true">→</span></Link></section>
    <section className="bc-panel bc-editorial-note"><h2>Fontes antes de popularidade</h2><p>As avaliações organizam a discussão; a validação histórica depende de fontes e curadoria.</p><Link href="/transparencia" className="bc-inline-link">Transparência editorial →</Link></section>
  </aside>;
}
export default function ComunidadeLayout({ children }: { children: ReactNode }) {
  return <div className="bc-workspace"><div className="bc-content">{children}</div><GuiaComunidade /></div>;
}
