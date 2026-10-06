import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSAO = 1;
const TTL_SEGUNDOS = 30 * 60;
const MAX_FONTES = 8;
const MAX_TOKEN = 2048;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CargaToken = {
  v: number;
  iat: number;
  exp: number;
  nonce: string;
  fontes: string[];
};

function segredo(): string | null {
  const valor = process.env.CONTINUIDADE_TOKEN_SECRET;
  return valor && valor.length >= 32 ? valor : null;
}

function codificar(valor: string | Buffer): string {
  return Buffer.from(valor).toString("base64url");
}

function assinar(carga: string, chave: string): string {
  return createHmac("sha256", chave).update(carga).digest("base64url");
}

function cargaValida(valor: unknown, agora: number): valor is CargaToken {
  if (!valor || typeof valor !== "object") return false;
  const carga = valor as Partial<CargaToken>;
  return carga.v === VERSAO &&
    Number.isInteger(carga.iat) &&
    Number.isInteger(carga.exp) &&
    carga.iat! <= agora &&
    carga.exp! >= agora &&
    carga.exp! - carga.iat! <= TTL_SEGUNDOS &&
    typeof carga.nonce === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(carga.nonce) &&
    Array.isArray(carga.fontes) && carga.fontes.length > 0 && carga.fontes.length <= MAX_FONTES &&
    carga.fontes.every((fonte) => typeof fonte === "string" && UUID.test(fonte)) &&
    new Set(carga.fontes).size === carga.fontes.length;
}

/** Emite uma referência assinada às fontes efetivamente citadas, sem conversa ou identidade. */
export function emitirTokenContinuidade(fontes: string[], agora = Math.floor(Date.now() / 1000)): string | undefined {
  const chave = segredo();
  const fontesUnicas = [...new Set(fontes)].slice(0, MAX_FONTES);
  if (!chave || fontesUnicas.length === 0 || fontesUnicas.some((fonte) => !UUID.test(fonte))) {
    return undefined;
  }

  const carga: CargaToken = {
    v: VERSAO,
    iat: agora,
    exp: agora + TTL_SEGUNDOS,
    nonce: codificar(randomBytes(18)),
    fontes: fontesUnicas,
  };
  const parteCarga = codificar(JSON.stringify(carga));
  return `${parteCarga}.${assinar(parteCarga, chave)}`;
}

/** Retorna somente as fontes de um token íntegro e vigente; qualquer falha é silenciosa. */
export function verificarTokenContinuidade(token: string | undefined, agora = Math.floor(Date.now() / 1000)): string[] | null {
  const chave = segredo();
  if (!chave || !token || token.length > MAX_TOKEN || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    return null;
  }

  const [parteCarga, assinatura] = token.split(".");
  const esperada = assinar(parteCarga, chave);
  const recebidaBuffer = Buffer.from(assinatura, "base64url");
  const esperadaBuffer = Buffer.from(esperada, "base64url");
  if (recebidaBuffer.length !== esperadaBuffer.length ||
    !timingSafeEqual(recebidaBuffer, esperadaBuffer) || assinatura !== esperada) {
    return null;
  }

  try {
    const carga = JSON.parse(Buffer.from(parteCarga, "base64url").toString("utf8"));
    return cargaValida(carga, agora) ? carga.fontes : null;
  } catch {
    return null;
  }
}

const PALAVRAS_VAZIAS = new Set([
  "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "ela", "ele",
  "em", "essa", "esse", "isso", "mais", "na", "nas", "no", "nos", "o", "os", "ou", "para", "por",
  "qual", "que", "se", "sobre", "um", "uma", "vai", "foi", "sao", "são", "sua", "seu", "tambem", "também",
]);

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Termos que impedem que uma coincidência frágil de stopword entre no prompt. */
export function termosSubstantivos(texto: string): string[] {
  return [...new Set(normalizar(texto).match(/[a-z0-9]{3,}/g) ?? [])]
    .filter((termo) => !PALAVRAS_VAZIAS.has(termo));
}

export function possuiDoisTermosDaConsulta(conteudo: string, consulta: string): boolean {
  const termos = termosSubstantivos(consulta);
  const texto = normalizar(conteudo);
  return termos.filter((termo) => new RegExp(`\\b${termo}\\b`).test(texto)).length >= 2;
}

/** Aceita identificadores curtos (ex.: AI-5) e uma entidade substantiva; evita
 * descartar documentos por uma regra feita apenas para palavras longas. */
export function possuiTermosSuficientesDaConsulta(conteudo: string, consulta: string): boolean {
  if (possuiDoisTermosDaConsulta(conteudo, consulta)) return true;
  const normalizado = normalizar(consulta);
  const identificadores = normalizado.match(/\b[a-z]{1,4}[\s-]?\d{1,4}\b/g) ?? [];
  const texto = normalizar(conteudo);
  return identificadores.some((id) => texto.includes(id.replace(/\s+/g, " "))) &&
    termosSubstantivos(consulta).some((termo) => new RegExp(`\\b${termo}\\b`).test(texto));
}

export function houveMudancaExplicitaDeAssunto(texto: string): boolean {
  return /\b(mudando de assunto|outro tema|em outro tema|outra questao|agora sobre)\b/.test(normalizar(texto));
}
