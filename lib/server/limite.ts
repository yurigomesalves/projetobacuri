// Rate limit simples por IP, em memória.
//
// É melhor-esforço e provisório: cada instância serverless tem seu próprio
// mapa, então o limite real pode ser maior que 20/min se a Vercel escalar
// para várias instâncias. Suficiente para o estágio atual do projeto
// (uma pessoa, free tier); se o uso crescer, trocar por um contador
// compartilhado (ex.: Upstash Redis).

const JANELA_MS = 60_000;
const LIMITE_REQUISICOES = 20;

type Registro = {
  inicio: number;
  contagem: number;
};

const registros = new Map<string, Registro>();

/**
 * Retorna true se o IP ainda está dentro do limite (e registra a
 * requisição), ou false se o limite foi excedido.
 */
export function dentroDoLimite(ip: string): boolean {
  const agora = Date.now();
  const registro = registros.get(ip);

  if (!registro || agora - registro.inicio >= JANELA_MS) {
    registros.set(ip, { inicio: agora, contagem: 1 });
    return true;
  }

  if (registro.contagem >= LIMITE_REQUISICOES) {
    return false;
  }

  registro.contagem += 1;
  return true;
}
