import { Suspense } from "react";
import { Acervo } from "../componentes/PainelAcervo";
export const metadata = { title: "Acervo — projeto_BACURI" };
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Carregando acervo…</p>}>
      <Acervo />
    </Suspense>
  );
}
