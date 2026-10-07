import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Biografia, EventoGeo } from "@/lib/shared/tipos";
import Citacoes from "./Citacoes";

/** A mesma cópia pública aparece na prévia e no histórico da discussão. */
export default function RegistroOriginal({ registro }: { registro: Biografia | EventoGeo }) {
  const bio = "slug" in registro;
  return <div className="bc-record-copy">
    <h3 className="font-semibold">{bio ? registro.nome : registro.titulo}</h3>
    <p>{[bio ? registro.tipo : registro.data, registro.municipio, registro.uf].filter(Boolean).join(" · ")}</p>
    {bio && <><p>{registro.resumo_1_linha}</p>{(registro.municipio_natal || registro.uf_natal) && <p>Naturalidade: {[registro.municipio_natal, registro.uf_natal].filter(Boolean).join(" — ")}</p>}{(registro.data_inicio || registro.data_fim) && <p>{registro.data_inicio} — {registro.data_fim}</p>}</>}
    <div className="bk-reading"><ReactMarkdown>{bio ? registro.texto_md : registro.descricao_md}</ReactMarkdown></div>
    {!bio && <p>{registro.tipos_crime.join(" · ")}</p>}
    <Citacoes citacoes={registro.fontes} idResposta="registro-original" />
    {registro.marcadores.map((m, i) => <section key={`${m.marcador}-${i}`}><h4>{m.marcador}</h4><Citacoes citacoes={[m.fonte]} idResposta={`registro-marcador-${i}`} /></section>)}
    {bio && registro.organizacoes?.map((o, i) => <section key={o.organizacao_slug}><Link className="underline" href={`/biografias/${o.organizacao_slug}`}>{o.organizacao_nome}</Link><p>{o.nota_vinculo}</p><Citacoes citacoes={[o.fonte]} idResposta={`registro-organizacao-${i}`} /></section>)}
    {bio ? registro.eventos.map(id => <p key={id}><Link className="underline" href={`/mapa?evento=${id}`}>Evento relacionado no mapa</Link></p>) : registro.vitimas.map(slug => <p key={slug}><Link className="underline" href={`/biografias/${slug}`}>{slug.replaceAll("-", " ")}</Link></p>)}
    {!bio && registro.justica?.revisado_por_humano && <section><h4>Crimes e justiça</h4>{[registro.justica.descricao_crimes_md, registro.justica.enquadramento_atual_md, registro.justica.punicao_ocorrida_md, registro.justica.nota_metodologica_md].map((t, i) => <ReactMarkdown key={i}>{t}</ReactMarkdown>)}<Citacoes citacoes={registro.justica.fontes} idResposta="registro-justica" /></section>}
  </div>;
}
