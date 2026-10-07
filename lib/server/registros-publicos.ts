import { supabaseServidor } from "./supabase";
import { montarCitacao, montarMarcadores } from "./citacoes";
import type { Biografia, VinculoOrganizacao, BlocoJustica, EventoGeo } from "@/lib/shared/tipos";

export async function lerBiografiaPublica(slug: string): Promise<Biografia | null> {
  const { data: biografia, error: erroBiografia } = await supabaseServidor
    .from("biografias")
    .select(
      "biografia_id, slug, nome, tipo, resumo_1_linha, texto_md, municipio, uf, municipio_natal, uf_natal, lat_natal, lng_natal, data_inicio, data_fim, status_curadoria"
    )
    .eq("slug", slug)
    .eq("status_curadoria", "publicada")
    .maybeSingle();

  if (erroBiografia) {
    throw new Error(`Falha ao buscar biografia: ${erroBiografia.message}`);
  }

  if (!biografia) {
    return null;
  }

  const [
    { data: fontesLinhas, error: erroFontes },
    { data: marcadoresLinhas, error: erroMarcadores },
    { data: eventosLinhas, error: erroEventos },
    { data: vinculosLinhas, error: erroVinculos },
  ] = await Promise.all([
    supabaseServidor
      .from("biografia_fontes")
      .select(
        "fonte_id, paginas, trecho, secao, ordem, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
      )
      .eq("biografia_id", biografia.biografia_id)
      .order("ordem", { ascending: true }),
    supabaseServidor
      .from("biografia_marcadores")
      .select(
        "marcador, fonte_id, paginas, trecho, secao, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
      )
      .eq("biografia_id", biografia.biografia_id),
    supabaseServidor
      .from("evento_vitimas")
      .select("evento_id, eventos_geo!inner (status_curadoria)")
      .eq("biografia_id", biografia.biografia_id)
      .eq("eventos_geo.status_curadoria", "publicada"),
    supabaseServidor
      .from("pessoa_organizacoes")
      .select(
        "organizacao_id, nota_vinculo, fonte_id, paginas, trecho, secao, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
      )
      .eq("pessoa_id", biografia.biografia_id),
  ]);

  if (erroFontes) {
    throw new Error(`Falha ao buscar fontes da biografia: ${erroFontes.message}`);
  }
  if (erroMarcadores) {
    throw new Error(`Falha ao buscar marcadores da biografia: ${erroMarcadores.message}`);
  }
  if (erroEventos) {
    throw new Error(`Falha ao buscar eventos da biografia: ${erroEventos.message}`);
  }
  if (erroVinculos) {
    throw new Error(`Falha ao buscar vínculos da biografia: ${erroVinculos.message}`);
  }

  const fontes = (fontesLinhas ?? []).map((linha, indice) =>
    montarCitacao(linha, indice + 1)
  );
  const marcadores = montarMarcadores(marcadoresLinhas ?? []);
  const eventos = (eventosLinhas ?? []).map((linha) => linha.evento_id as string);

  // Vínculos com organizações (ADR-016, decisão 3). Só expõe vínculos cuja
  // organização está publicada — resolve nome/slug pelo organizacao_id, pois
  // a FK é composta e não embeda direto no PostgREST.
  const organizacoes: VinculoOrganizacao[] = [];
  const idsOrgs = [
    ...new Set((vinculosLinhas ?? []).map((v) => v.organizacao_id as string)),
  ];
  if (idsOrgs.length > 0) {
    const { data: orgsLinhas, error: erroOrgs } = await supabaseServidor
      .from("biografias")
      .select("biografia_id, slug, nome")
      .in("biografia_id", idsOrgs)
      .eq("status_curadoria", "publicada");
    if (erroOrgs) {
      throw new Error(`Falha ao buscar organizações vinculadas: ${erroOrgs.message}`);
    }

    const porId = new Map(
      (orgsLinhas ?? []).map((o) => [o.biografia_id as string, o])
    );
    for (const linha of vinculosLinhas ?? []) {
      const org = porId.get(linha.organizacao_id as string);
      if (!org) continue; // organização em rascunho → não exibe
      const vinculo: VinculoOrganizacao = {
        organizacao_slug: org.slug,
        organizacao_nome: org.nome,
        fonte: montarCitacao(linha, 0),
      };
      if (linha.nota_vinculo) {
        vinculo.nota_vinculo = linha.nota_vinculo;
      }
      organizacoes.push(vinculo);
    }
  }

  const resultado: Biografia = {
    slug: biografia.slug,
    nome: biografia.nome,
    tipo: biografia.tipo as Biografia["tipo"],
    resumo_1_linha: biografia.resumo_1_linha,
    texto_md: biografia.texto_md,
    marcadores,
    fontes,
    eventos,
    status_curadoria: biografia.status_curadoria,
    organizacoes,
  };

  if (biografia.municipio) {
    resultado.municipio = biografia.municipio;
  }
  if (biografia.uf) {
    resultado.uf = biografia.uf;
  }
  if (biografia.municipio_natal) {
    resultado.municipio_natal = biografia.municipio_natal;
  }
  if (biografia.uf_natal) {
    resultado.uf_natal = biografia.uf_natal;
  }
  if (biografia.data_inicio) {
    resultado.data_inicio = biografia.data_inicio;
  }
  if (biografia.data_fim) {
    resultado.data_fim = biografia.data_fim;
  }
  if (biografia.lat_natal !== null && biografia.lat_natal !== undefined) {
    resultado.lat_natal = biografia.lat_natal;
  }
  if (biografia.lng_natal !== null && biografia.lng_natal !== undefined) {
    resultado.lng_natal = biografia.lng_natal;
  }

  return resultado;
}

export async function lerEventoPublico(id: string): Promise<EventoGeo | null> {
  const { data: evento, error: erroEvento } = await supabaseServidor
    .from("eventos_geo")
    .select(
      "evento_id, titulo, data, municipio, uf, geometria, descricao_md, tipos_crime, status_curadoria, justica_descricao_crimes_md, justica_enquadramento_atual_md, justica_punicao_ocorrida_md, justica_nota_metodologica_md, revisado_por_humano"
    )
    .eq("evento_id", id)
    .eq("status_curadoria", "publicada")
    .maybeSingle();

  if (erroEvento) {
    throw new Error(`Falha ao buscar evento: ${erroEvento.message}`);
  }

  if (!evento) {
    return null;
  }

  const [
    { data: fontesLinhas, error: erroFontes },
    { data: marcadoresLinhas, error: erroMarcadores },
    { data: vitimasLinhas, error: erroVitimas },
  ] = await Promise.all([
    supabaseServidor
      .from("evento_fontes")
      .select(
        "fonte_id, paginas, trecho, secao, ordem, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
      )
      .eq("evento_id", evento.evento_id)
      .order("ordem", { ascending: true }),
    supabaseServidor
      .from("evento_marcadores")
      .select(
        "marcador, fonte_id, paginas, trecho, secao, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
      )
      .eq("evento_id", evento.evento_id),
    supabaseServidor
      .from("evento_vitimas")
      .select("biografia_id, biografias!inner (slug, status_curadoria)")
      .eq("evento_id", evento.evento_id)
      .eq("biografias.status_curadoria", "publicada"),
  ]);

  if (erroFontes) {
    throw new Error(`Falha ao buscar fontes do evento: ${erroFontes.message}`);
  }
  if (erroMarcadores) {
    throw new Error(`Falha ao buscar marcadores do evento: ${erroMarcadores.message}`);
  }
  if (erroVitimas) {
    throw new Error(`Falha ao buscar vítimas do evento: ${erroVitimas.message}`);
  }

  const fontes = (fontesLinhas ?? []).map((linha, indice) =>
    montarCitacao(linha, indice + 1)
  );
  const marcadores = montarMarcadores(marcadoresLinhas ?? []);
  const vitimas = (vitimasLinhas ?? []).map((linha) => {
    const biografia = Array.isArray(linha.biografias) ? linha.biografias[0] : linha.biografias;
    return biografia.slug as string;
  });

  const resultado: EventoGeo = {
    evento_id: evento.evento_id,
    titulo: evento.titulo,
    data: evento.data,
    municipio: evento.municipio,
    uf: evento.uf,
    geometria: evento.geometria as EventoGeo["geometria"],
    descricao_md: evento.descricao_md,
    vitimas,
    tipos_crime: evento.tipos_crime,
    marcadores,
    fontes,
  };

  // Salvaguarda do módulo "crimes e justiça" (contrato v1.2): o bloco só
  // entra na resposta quando revisado por humano. Até a Fase 7,
  // revisado_por_humano é sempre false em todos os registros.
  if (evento.revisado_por_humano) {
    const { data: justicaFontesLinhas, error: erroJusticaFontes } = await supabaseServidor
      .from("evento_justica_fontes")
      .select(
        "fonte_id, paginas, trecho, secao, ordem, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
      )
      .eq("evento_id", evento.evento_id)
      .order("ordem", { ascending: true });

    if (erroJusticaFontes) {
      throw new Error(
        `Falha ao buscar fontes do bloco de justiça: ${erroJusticaFontes.message}`
      );
    }

    const justica: BlocoJustica = {
      descricao_crimes_md: evento.justica_descricao_crimes_md ?? "",
      enquadramento_atual_md: evento.justica_enquadramento_atual_md ?? "",
      punicao_ocorrida_md: evento.justica_punicao_ocorrida_md ?? "",
      nota_metodologica_md: evento.justica_nota_metodologica_md ?? "",
      fontes: (justicaFontesLinhas ?? []).map((linha, indice) =>
        montarCitacao(linha, indice + 1)
      ),
      revisado_por_humano: evento.revisado_por_humano,
    };

    resultado.justica = justica;
  }

  return resultado;
}
