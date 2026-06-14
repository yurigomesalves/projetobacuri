import Image from "next/image";
import Chat from "./componentes/Chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-papel-200 px-4 py-4 text-center sm:px-6 sm:py-16 dark:border-tinta-900">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="sr-only">Projeto Bacuri</h1>
          <Image
            src="/marca/logo_fundo_claro_transparente.png"
            alt="Projeto Bacuri"
            width={500}
            height={500}
            className="mx-auto h-auto w-32 dark:hidden sm:w-56"
            priority
          />
          <Image
            src="/marca/logo_fundo_escuro_transparente.png"
            alt="Projeto Bacuri"
            width={500}
            height={500}
            className="mx-auto hidden h-auto w-32 dark:block sm:w-56"
            priority
          />
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-neutral-600 sm:mt-3 sm:text-sm dark:text-neutral-400">
            Assistente educativo sobre a Ditadura Civil-Militar no Brasil
            (1964–1985), que responde apenas com base em documentos
            históricos, citando as fontes utilizadas.
          </p>
          <p className="mx-auto mt-2 hidden max-w-xl text-xs leading-relaxed text-neutral-500 sm:block dark:text-neutral-500">
            Projeto de mestrado (ProfHistória/UFU), código aberto. O acervo
            está em construção — atualmente inclui o Relatório da Comissão
            Nacional da Verdade (volumes I, II e III).
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Chat />
      </main>

      <footer className="border-t border-papel-200 px-4 py-3 text-center text-xs text-neutral-500 sm:px-6 dark:border-tinta-900 dark:text-neutral-500">
        <a
          href="https://github.com/yurigomesalves/projetobacuri"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Código-fonte no GitHub
        </a>
        {" · "}
        Licenciado sob AGPL-3.0
        {" · "}
        <a
          href="/transparencia"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Transparência editorial
        </a>
        {" · "}
        <a
          href="/curadoria"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Curadoria (acesso restrito)
        </a>
      </footer>
    </div>
  );
}
