import Chat from "./componentes/Chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-creme-200 px-4 py-8 text-center sm:px-6 sm:py-10 dark:border-verde-900">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-verde-950 sm:text-4xl dark:text-creme-50">
            Memória e Verdade
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Assistente educativo sobre a Ditadura Civil-Militar no Brasil
            (1964–1985), que responde apenas com base em documentos
            históricos, citando as fontes utilizadas.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
            Projeto de mestrado (ProfHistória/UFU), código aberto. O acervo
            está em construção — atualmente inclui o Relatório da Comissão
            Nacional da Verdade (volumes I, II e III).
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Chat />
      </main>

      <footer className="border-t border-creme-200 px-4 py-3 text-center text-xs text-neutral-500 sm:px-6 dark:border-verde-900 dark:text-neutral-500">
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
