import { describe, expect, it } from "vitest";
import { montarCitacao, montarMarcadores } from "@/lib/server/citacoes";
import { linhaFonteJoin, linhaMarcadorJoin } from "../apoio/fixtures";

describe("montarCitacao", () => {
  it("monta a citação completa com o n informado e tipo_chunk sempre 'corpo'", () => {
    const citacao = montarCitacao(linhaFonteJoin(), 3);

    expect(citacao).toMatchObject({
      n: 3,
      fonte_id: "fonte-cnv-v1",
      titulo: "Relatório da Comissão Nacional da Verdade — Volume I",
      autor_orgao: "Comissão Nacional da Verdade",
      tipo_fonte: "relatorio_oficial",
      confiabilidade: "alta",
      trecho: "Trecho citado verbatim do relatório para fins de teste.",
      url_origem: "https://exemplo.org/cnv/volume1.pdf",
      tipo_chunk: "corpo",
      data_documento: "2014-12-10",
      paginas: "120",
      secao: "Capítulo 5",
    });
  });

  it("omite campos opcionais ausentes em vez de enviá-los como null", () => {
    const linha = linhaFonteJoin({
      paginas: null,
      secao: null,
      fontes: {
        ...linhaFonteJoin().fontes,
        data_documento: null,
        nota_contexto: null,
      },
    });

    const citacao = montarCitacao(linha, 1);

    expect("paginas" in citacao).toBe(false);
    expect("secao" in citacao).toBe(false);
    expect("data_documento" in citacao).toBe(false);
    expect("nota_contexto" in citacao).toBe(false);
  });

  it("inclui nota_contexto quando a fonte tem uma", () => {
    const linha = linhaFonteJoin({
      fontes: {
        ...linhaFonteJoin().fontes,
        nota_contexto: "Documento produzido pelo próprio órgão repressivo.",
      },
    });

    expect(montarCitacao(linha, 1).nota_contexto).toBe(
      "Documento produzido pelo próprio órgão repressivo."
    );
  });

  it("aceita o join de fontes vindo como array de 1 elemento", () => {
    const base = linhaFonteJoin();
    const linha = { ...base, fontes: [base.fontes] };

    const citacao = montarCitacao(linha, 2);

    expect(citacao.titulo).toBe("Relatório da Comissão Nacional da Verdade — Volume I");
  });
});

describe("montarMarcadores", () => {
  it("monta um marcador por linha, com a citação da fonte usando n=0", () => {
    const marcadores = montarMarcadores([
      linhaMarcadorJoin(),
      linhaMarcadorJoin({ marcador: "6.2.violencia_contra_mulheres" }),
    ]);

    expect(marcadores).toHaveLength(2);
    expect(marcadores[0].marcador).toBe("6.2.repressao_a_trabalhadores");
    expect(marcadores[1].marcador).toBe("6.2.violencia_contra_mulheres");
    // Convenção documentada em lib/server/citacoes.ts: marcadores não entram
    // na numeração [n] das citações do corpo.
    expect(marcadores.every((m) => m.fonte.n === 0)).toBe(true);
    expect(marcadores[0].fonte.url_origem).toBe("https://exemplo.org/cnv/volume1.pdf");
  });

  it("devolve lista vazia para entrada vazia", () => {
    expect(montarMarcadores([])).toEqual([]);
  });
});
