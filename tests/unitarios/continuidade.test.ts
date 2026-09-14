import { afterEach, describe, expect, it } from "vitest";
import {
  emitirTokenContinuidade,
  possuiDoisTermosDaConsulta,
  verificarTokenContinuidade,
} from "@/lib/server/continuidade";

const segredoAnterior = process.env.CONTINUIDADE_TOKEN_SECRET;
const FONTE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FONTE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

afterEach(() => {
  if (segredoAnterior === undefined) delete process.env.CONTINUIDADE_TOKEN_SECRET;
  else process.env.CONTINUIDADE_TOKEN_SECRET = segredoAnterior;
});

describe("token de continuidade", () => {
  it("emite e verifica fontes sem expor a conversa", () => {
    process.env.CONTINUIDADE_TOKEN_SECRET = "s".repeat(32);
    const token = emitirTokenContinuidade([FONTE_A, FONTE_B], 1_000);

    expect(token).toBeTypeOf("string");
    expect(verificarTokenContinuidade(token, 1_100)).toEqual([FONTE_A, FONTE_B]);
    expect(token).not.toContain("pergunta");
  });

  it("recusa token adulterado ou expirado", () => {
    process.env.CONTINUIDADE_TOKEN_SECRET = "s".repeat(32);
    const token = emitirTokenContinuidade([FONTE_A], 1_000)!;
    const adulterado = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(verificarTokenContinuidade(adulterado, 1_100)).toBeNull();
    expect(verificarTokenContinuidade(token, 2_801)).toBeNull();
  });

  it("não emite nem aceita token sem segredo válido", () => {
    delete process.env.CONTINUIDADE_TOKEN_SECRET;
    expect(emitirTokenContinuidade([FONTE_A])).toBeUndefined();
    expect(verificarTokenContinuidade("carga.assinatura")).toBeNull();

    process.env.CONTINUIDADE_TOKEN_SECRET = "curto";
    expect(emitirTokenContinuidade([FONTE_A])).toBeUndefined();

    process.env.CONTINUIDADE_TOKEN_SECRET = "s".repeat(32);
    expect(emitirTokenContinuidade(["fonte-invalida"])).toBeUndefined();
  });
});

describe("filtro textual", () => {
  it("exige dois termos relevantes distintos da consulta contextual", () => {
    const consulta = "O que ocorreu com os trabalhadores depois do AI-5?";
    expect(possuiDoisTermosDaConsulta("Ocorreu repressão contra trabalhadores organizados.", consulta)).toBe(true);
    expect(possuiDoisTermosDaConsulta("Depois disso, a situação mudou.", consulta)).toBe(false);
  });
});
