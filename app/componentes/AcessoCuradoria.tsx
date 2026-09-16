"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function AcessoCuradoria() {
  const [nome, setNome] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    let versao = 0;
    let unsubscribe: (() => void) | undefined;
    import("@/lib/client/supabase")
      .then(({ supabase }) => {
        const atualizar = async (token?: string) => {
          const v = ++versao;
          if (!token) {
            if (ativo) setNome(null);
            return;
          }
          try {
            const r = await fetch("/api/curadoria/eu", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const d = r.ok ? await r.json() : null;
            if (ativo && v === versao) setNome(d?.nome || null);
          } catch {
            if (ativo && v === versao) setNome(null);
          }
        };
        if (!ativo) return;
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          void atualizar(session?.access_token);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {});
    return () => {
      ativo = false;
      unsubscribe?.();
    };
  }, []);
  return (
    <Link className="bk-account" href="/curadoria">
      {nome ? (
        <>
          <span className="bk-avatar" aria-hidden="true">
            {nome.slice(0, 1).toUpperCase()}
          </span>
          <span>{nome}</span>
        </>
      ) : (
        <>
          Curadoria <span aria-hidden="true">↗</span>
        </>
      )}
    </Link>
  );
}
