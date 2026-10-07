"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ContaComunidade from "./ContaComunidade";
import { CatalogoProvider } from "./PainelAcervo";
const links = [
  ["/", "Pesquisa", "search"],
  ["/acervo", "Acervo", "grid"],
  ["/biografias", "Biografias", "people"],
  ["/mapa", "Territórios", "map"],
  ["/comunidade", "Comunidade", "people"],
  ["/transparencia", "Transparência", "shield"],
  ["/sobre", "Sobre o projeto", "info"],
];
export function Icone({ nome }: { nome: string }) {
  const paths: Record<string, string> = {
    search: "M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    doc: "M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6",
    people:
      "M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M2 21v-3a6 6 0 0 1 12 0v3M17 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 4 5",
    map: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16",
    shield: "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6",
    info: "M12 11v6M12 7v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 6l12 12M18 6 6 18",
    expand: "M3 4h18v16H3zM9 4v16M13 8l3 4-3 4",
    panel: "M3 4h18v16H3zM9 4v16M16 8l-3 4 3 4",
    system: "M4 4h16v12H4zM8 20h8M12 16v4",
    light:
      "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    dark: "M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z",
  };
  return (
    <svg className="bk-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[nome] || paths.doc} />
    </svg>
  );
}
export default function Estrutura({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setCollapsed(localStorage.getItem("bacuri-sidebar") === "fechada");
        setTheme(localStorage.getItem("bacuri-tema") || "sistema");
      } catch {
        setTheme("sistema");
      }
    });
  }, []);
  useEffect(() => {
    if (!theme) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "sistema" ? (media.matches ? "escuro" : "claro") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  };
  const navigation = (mobile = false) => (
    <>
      <Link href="/" className="bk-brand" onClick={() => mobile && close()}>
        <Image
          src="/marca/logo-bacuri.svg"
          alt="projeto_BACURI"
          width={80}
          height={80}
          priority
        />
        <span>
          MEMÓRIA
          <br />
          VERDADE
          <br />
          JUSTIÇA
        </span>
      </Link>
      <p className="bk-nav-label">HISTÓRIA COLABORATIVA DIGITAL</p>
      <nav aria-label={mobile ? "Navegação móvel" : "Navegação principal"}>
        {links.map(([url, label, icon]) => (
          <Link
            key={url}
            href={url}
            title={label}
            aria-current={
              (url === "/" ? path === "/" : path.startsWith(url))
                ? "page"
                : undefined
            }
            onClick={() => mobile && close()}
          >
            <Icone nome={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="bk-sidebar-bottom">
        <button
          className="bk-collapse"
          onClick={() => {
            if (mobile) {
              close();
              return;
            }
            setCollapsed(!collapsed);
            try {
              localStorage.setItem(
                "bacuri-sidebar",
                collapsed ? "aberta" : "fechada",
              );
            } catch {}
          }}
          aria-label={
            mobile
              ? "Fechar menu"
              : collapsed
                ? "Expandir menu"
                : "Recolher menu"
          }
          aria-expanded={mobile ? open : !collapsed}
        >
          <Icone nome={mobile ? "close" : collapsed ? "expand" : "panel"} />
          <span>{mobile ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}</span>
        </button>
        <p>
          História pública
          <br />
          ProfHistória / UFU
        </p>
      </div>
    </>
  );
  return (
    <CatalogoProvider>
      <div className={`bk-app ${collapsed ? "bk-collapsed" : ""}`}>
        <a href="#conteudo" className="bk-skip">
          Pular para o conteúdo
        </a>
        <aside className="bk-sidebar">{navigation()}</aside>
        <dialog
          className="bk-mobile-sidebar"
          ref={dialog}
          onCancel={close}
          onClick={(e) => {
            if (e.target === dialog.current) close();
          }}
        >
          <div>{navigation(true)}</div>
        </dialog>
        <div className="bk-shell">
          <header className="bk-topbar">
            <button
              className="bk-mobile-trigger bk-button"
              ref={trigger}
              aria-label="Abrir menu"
              aria-expanded={open}
              onClick={() => {
                dialog.current?.showModal();
                setOpen(true);
              }}
            >
              <Icone nome="menu" />
            </button>
            <div className="bk-top-actions">
              <div className="bk-theme-switch" role="group" aria-label="Tema">
                {[
                  ["sistema", "Usar tema do sistema", "system"],
                  ["claro", "Usar tema claro", "light"],
                  ["escuro", "Usar tema escuro", "dark"],
                ].map(([valor, rotulo, icone]) => (
                  <button
                    type="button"
                    key={valor}
                    title={rotulo}
                    aria-label={rotulo}
                    aria-pressed={(theme || "sistema") === valor}
                    onClick={() => {
                      setTheme(valor);
                      try {
                        localStorage.setItem("bacuri-tema", valor);
                      } catch {}
                    }}
                  >
                    <Icone nome={icone} />
                  </button>
                ))}
              </div>
              <ContaComunidade />
            </div>
          </header>
          <div className="bk-route" id="conteudo" tabIndex={-1}>
            {children}
          </div>
          <footer className="bk-footer">
            <span>
              <strong>projeto_BACURI</strong> · Memória, verdade e justiça
            </span>
            <div>
              <Link href="/transparencia">Transparência</Link>
              <a
                href="https://github.com/yurigomesalves/projetobacuri"
                target="_blank"
                rel="noopener noreferrer"
              >
                Código aberto · AGPL-3.0
              </a>
            </div>
          </footer>
        </div>
      </div>
    </CatalogoProvider>
  );
}
