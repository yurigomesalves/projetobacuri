export default function GlossarioFontes() {
  return (
    <details className="mt-6">
      <summary className="font-sans text-sm font-medium cursor-pointer text-tinta-950 dark:text-neutral-100 hover:underline">
        O que significam os tipos de fonte e a confiabilidade?
      </summary>

      <div className="mt-3 rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
        <div
          className="space-y-3 text-sm font-serif leading-relaxed text-neutral-700 dark:text-neutral-300"
          dangerouslySetInnerHTML={{
            __html: `<p>Este acervo reúne documentos de origens muito diferentes. Saber de onde cada um vem é essencial para entender o que ele pode, e o que não pode, nos contar.</p>

<p><strong>Relatório oficial:</strong> documentos produzidos pelo Estado brasileiro após a redemocratização para apurar os crimes da ditadura, como os relatórios da Comissão Nacional da Verdade (CNV), publicados em 2014, e os das comissões estaduais e municipais.</p>

<p><strong>Documento da repressão:</strong> papéis produzidos pelos próprios órgãos que prenderam, vigiaram e torturaram, como o DOPS, o DOI-CODI e o SNI. Provam que a repressão existiu e como agiu, mas o que dizem sobre as vítimas é, por definição, hostil e muitas vezes distorcido.</p>

<p><strong>Inteligência estrangeira:</strong> documentos de governos de outros países (como os Estados Unidos) que acompanhavam o Brasil e foram depois liberados ao público. São informativos, mas refletem os interesses do país que os produziu.</p>

<p><strong>Imprensa da época:</strong> jornais e revistas publicados entre 1964 e 1985. É preciso lembrar que a imprensa operava sob censura, e parte dela apoiava o regime. Por isso é tratada como objeto de estudo, não como autoridade sobre os fatos.</p>

<p><strong>Pesquisa acadêmica:</strong> artigos, teses, dissertações e livros produzidos por pesquisadores, em geral revisados por outros especialistas.</p>

<p><strong>Testemunho:</strong> depoimentos de vítimas, familiares, militantes e ex-agentes, colhidos por comissões ou projetos de história oral. É a memória de quem viveu os fatos.</p>

<p><strong>Lei ou decisão judicial:</strong> textos de leis, decretos e sentenças, inclusive de cortes internacionais, como a condenação do Brasil no caso da Guerrilha do Araguaia.</p>

<p><strong>Material educativo:</strong> conteúdos já organizados para o ensino por museus, organizações de memória e iniciativas educativas.</p>

<p><strong>Sobre a confiabilidade.</strong> A confiabilidade aqui não é um julgamento moral da fonte, nem mede se ela é "boa" ou "ruim". Ela indica que tipo de informação a fonte contém e como ela deve ser lida. Fontes muito diferentes podem ser igualmente valiosas para perguntas diferentes. Três casos merecem atenção:</p>

<ul style="list-style-type:disc;padding-left:1.25rem;margin-top:0.5rem;display:flex;flex-direction:column;gap:0.5rem"><li><strong>Prova quem agiu, não os fatos:</strong> vale para os documentos da repressão. Eles comprovam que um órgão do regime atuou, mas o que afirmam sobre as vítimas costuma ser falso ou distorcido, e precisa ser lido com cuidado.</li><li><strong>Relato pessoal confiável:</strong> vale para os testemunhos. São altamente confiáveis como experiência de quem viveu aquilo, mas são memória pessoal, não um registro documental neutro dos fatos.</li><li><strong>Pouco sobre os fatos, muito sobre a censura:</strong> vale para a imprensa censurada. Ela diz pouco sobre o que de fato aconteceu, justamente porque foi censurada, mas é uma prova preciosa de como a informação era controlada no período.</li></ul>`,
          }}
        />
      </div>
    </details>
  );
}
