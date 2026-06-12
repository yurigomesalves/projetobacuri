import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

// Autenticação simples das rotas de curadoria: header
// `Authorization: Bearer <senha>`, comparado com CURADORIA_SENHA.
//
// Comparação timing-safe: usamos sha256 de ambos os valores antes de
// `timingSafeEqual` para que os buffers tenham sempre o mesmo tamanho
// (32 bytes), evitando vazar o tamanho da senha configurada por timing.
// Se CURADORIA_SENHA não estiver definida, a autenticação SEMPRE falha
// (rota de curadoria fica indisponível, nunca aberta por padrão).

function hashSha256(valor: string): Buffer {
  return createHash("sha256").update(valor, "utf8").digest();
}

export function autenticado(requisicao: NextRequest): boolean {
  const senhaEsperada = process.env.CURADORIA_SENHA;
  if (!senhaEsperada) {
    return false;
  }

  const cabecalho = requisicao.headers.get("authorization");
  if (!cabecalho) {
    return false;
  }

  const partes = cabecalho.split(" ");
  if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
    return false;
  }

  const senhaRecebida = partes[1];

  return timingSafeEqual(hashSha256(senhaRecebida), hashSha256(senhaEsperada));
}
