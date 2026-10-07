import Link from "next/link";
import type { ConclusaoEditorial } from "@/lib/shared/comunidade";
import { data, nomeAutor } from "./ComunidadeApi";

export default function EstadoEditorial({ decisao: d }: { decisao: ConclusaoEditorial }) {
  if (!d.estado_editorial) return null;
  return <div className="mt-3 text-sm">
    <p className="font-semibold">{d.estado_editorial === "pendente" ? "Atualização editorial pendente" : d.estado_editorial === "concluida" ? "Atualização editorial concluída" : "Atualização editorial suspensa por recurso"}</p>
    {d.estado_editorial === "pendente" && <p>A aprovação encaminha a revisão do registro pelo fluxo editorial do acervo. A conclusão será registrada aqui.</p>}
    {d.estado_editorial === "concluida" && <><p className="whitespace-pre-wrap">{d.conclusao_justificativa}</p><p>{data(d.concluida_em)} · {nomeAutor(d.concluida_por ?? null)}</p>{d.registro_link && <Link className="underline" href={d.registro_link}>Consultar registro atualizado</Link>}</>}
  </div>;
}
