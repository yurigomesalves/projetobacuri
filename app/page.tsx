import Chat from "./componentes/Chat";
export default function Home() {
  return (
    <main className="bk-research">
      <section className="bk-home-hero" aria-labelledby="titulo-home">
        <div className="bk-home-hero-copy">
          <span className="bk-eyebrow">
            HISTÓRIA PÚBLICA · FONTES VERIFICÁVEIS
          </span>
          <h1 id="titulo-home">Memória para Justiça</h1>
          <p>
            O <strong>projeto_BACURI</strong> reúne fontes, pesquisas e
            testemunhos para estudar a Ditadura Militar-Empresarial brasileira
            com referência e contexto.
          </p>
          <ul aria-label="Compromissos da pesquisa">
            <li>Autoria identificada</li>
            <li>Trechos citados</li>
            <li>Documentos acessíveis</li>
          </ul>
        </div>
        <div className="bk-home-hero-mark" aria-hidden="true">
          <span>MEMÓRIA</span>
          <span>VERDADE</span>
          <span>JUSTIÇA</span>
        </div>
      </section>
      <section className="bk-home-chat" aria-label="Pesquisa documental">
        <Chat />
      </section>
    </main>
  );
}
