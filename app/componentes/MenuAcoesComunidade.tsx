"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Discreet disclosure: native keyboard access, outside click and Escape. */
export default function MenuAcoesComunidade({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function fechar(evento: PointerEvent | FocusEvent) {
      if (evento.target instanceof Node && !menu.current?.contains(evento.target)) menu.current?.removeAttribute("open");
    }
    function teclado(evento: KeyboardEvent) {
      if (evento.key === "Escape" && menu.current?.open) {
        menu.current.removeAttribute("open");
        menu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", fechar);
    document.addEventListener("focusin", fechar);
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("pointerdown", fechar);
      document.removeEventListener("focusin", fechar);
      document.removeEventListener("keydown", teclado);
    };
  }, []);
  return <details ref={menu} className="bc-comment-menu"><summary aria-label={rotulo}>•••</summary><div>{children}</div></details>;
}
