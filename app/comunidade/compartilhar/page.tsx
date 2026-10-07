"use client";

import Link from "next/link";
import { NavegacaoComunidade } from "../../componentes/ComunidadeLayout";
import { useEffect, useState } from "react";
import CompartilharResposta, { type Rascunho } from "../../componentes/CompartilharResposta";
import { MensagemErro } from "../../componentes/ComunidadeApi";

export default function RetomarCompartilhamento() {
  const [rascunho, setRascunho] = useState<Rascunho>(); const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    async function recuperar() {
      try {
        const chave = sessionStorage.getItem("bacuri-compartilhar-pendente");
        const valor: Rascunho | null = chave ? JSON.parse(sessionStorage.getItem(chave) || "null") : null;
        if (valor && typeof valor.token === "string" && typeof valor.resposta === "string" && valor.expiraEm > Date.now()) { if (ativo) setRascunho(valor); }
        else { if (chave) sessionStorage.removeItem(chave); sessionStorage.removeItem("bacuri-compartilhar-pendente"); if (ativo) setErro("Não há um rascunho válido neste dispositivo. Faça uma nova consulta e abra a discussão novamente."); }
      } catch { if (ativo) setErro("Não foi possível recuperar o rascunho neste dispositivo."); }
    }
    void recuperar(); return () => { ativo = false; };
  }, []);
  return <main className="bc-page bc-document-page"><NavegacaoComunidade /><h1 className="text-2xl font-bold">Retomar publicação</h1><p className="mt-3 text-sm">Confira os dados e confirme a publicação. O rascunho não é enviado automaticamente.</p>
    {erro && <div className="mt-4"><MensagemErro erro={erro} /><Link className="mt-3 inline-block underline" href="/">Voltar ao chat</Link></div>}
    {rascunho && <CompartilharResposta interacaoId={rascunho.interacaoId} token={rascunho.token} pergunta={rascunho.pergunta} resumo={rascunho.resumo} citacoes={rascunho.citacoes} resposta={rascunho.resposta} />}
  </main>;
}
