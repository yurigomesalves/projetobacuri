import Chat from "./componentes/Chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 px-4 py-4 sm:px-6 dark:border-neutral-800">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-100">
            Memória e Verdade
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Assistente educativo sobre a Ditadura Civil-Militar no Brasil
            (1964–1985), que responde apenas com base em documentos
            históricos, citando as fontes utilizadas.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
            Projeto de mestrado (ProfHistória/UFU), código aberto. O acervo
            está em construção — atualmente inclui o Relatório da Comissão
            Nacional da Verdade, volume I.
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Chat />
      </main>

      <footer className="border-t border-neutral-200 px-4 py-3 text-center text-xs text-neutral-500 sm:px-6 dark:border-neutral-800 dark:text-neutral-500">
        <a
          href="https://github.com/yurigomesalves/memoria-e-verdade"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Código-fonte no GitHub
        </a>
        {" · "}
        Licenciado sob AGPL-3.0
      </footer>
    </div>
  );
}
