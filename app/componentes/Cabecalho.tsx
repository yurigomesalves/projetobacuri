"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", rotulo: "INÍCIO" },
  { href: "/biografias", rotulo: "NOMES E HISTÓRIAS" },
  { href: "/mapa", rotulo: "MAPA" },
  { href: "/transparencia", rotulo: "TRANSPARÊNCIA" },
  { href: "/sobre", rotulo: "SOBRE projeto_BACURI" },
];

/**
 * Navegação compartilhada entre as páginas do projeto.
 * Logo do projeto à esquerda e links à direita, com foco visível,
 * sem ícones decorativos. O link da página atual fica destacado
 * para orientar o visitante.
 */
export default function Cabecalho() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="border-b-4 border-tinta-950 px-4 py-3 sm:px-6 dark:border-tinta-700"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/marca/logo_horizontal_fundo_claro_transparente.png"
            alt="Projeto Bacuri"
            width={600}
            height={100}
            className="h-7 w-auto dark:hidden"
            priority
          />
          <Image
            src="/marca/logo_horizontal_fundo_escuro_transparente.png"
            alt="Projeto Bacuri"
            width={600}
            height={100}
            className="hidden h-7 w-auto dark:block"
            priority
          />
        </Link>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => {
            const ativo =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`inline-block rounded px-1 py-0.5 font-sans font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carmim-700 ${
                    ativo
                      ? "underline text-carmim-700 dark:text-carmim-400"
                      : "text-tinta-800 dark:text-neutral-300"
                  }`}
                >
                  {link.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
