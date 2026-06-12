import Link from "next/link";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/biografias", rotulo: "Nomes e histórias" },
  { href: "/mapa", rotulo: "Mapa" },
  { href: "/transparencia", rotulo: "Transparência" },
  { href: "/manifesto", rotulo: "manifesto projeto_bacuri" },
];

/**
 * Navegação compartilhada entre as páginas do projeto.
 * Discreta e acessível: lista de links com foco visível, sem ícones decorativos.
 */
export default function Cabecalho() {
  return (
    <nav
      aria-label="Navegação principal"
      className="border-b border-neutral-200 px-4 py-2 sm:px-6 dark:border-neutral-800"
    >
      <ul className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-4 gap-y-1 text-sm">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block rounded px-1 py-0.5 font-medium text-neutral-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 dark:text-neutral-300"
            >
              {link.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
