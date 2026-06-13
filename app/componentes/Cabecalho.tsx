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
 * Nome do projeto à esquerda (como um logotipo) e links à direita,
 * com foco visível, sem ícones decorativos.
 */
export default function Cabecalho() {
  return (
    <nav
      aria-label="Navegação principal"
      className="border-b border-creme-200 px-4 py-3 sm:px-6 dark:border-verde-900"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <Link
          href="/"
          className="font-serif text-base font-semibold tracking-tight text-verde-950 dark:text-creme-50"
        >
          Memória e Verdade
        </Link>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded px-1 py-0.5 font-medium text-verde-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-700 dark:text-neutral-300"
              >
                {link.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
