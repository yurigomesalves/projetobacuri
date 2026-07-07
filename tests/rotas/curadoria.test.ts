import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { linhaFeedback, UUID_FEEDBACK } from "../apoio/fixtures";

const estado = vi.hoisted(() => ({ supabase: null as unknown as SupabaseFalso }));

vi.mock("@/lib/server/supabase", () => ({
  supabaseServidor: {
    from: (tabela: string) => estado.supabase.from(tabela),
    rpc: (nome: string, args?: unknown) => estado.supabase.rpc(nome, args),
  },
}));

// A autenticação real (validação do JWT no Supabase + busca em `curadores`) tem
// teste próprio em tests/unitarios/curadoria-auth.test.ts. Aqui mockamos
// `autenticarCurador` para focar no comportamento das ROTAS: um Bearer com o
// token válido identifica um curador; qualquer outro caso devolve null (401).
const TOKEN_VALIDO = "token-de-teste";
const UUID_CURADOR = "11111111-1111-1111-1111-111111111111";

vi.mock("@/lib/server/curadoria-auth", () => ({
  autenticarCurador: vi.fn(async (req: NextRequest) => {
    if (req.headers.get("authorization") === `Bearer ${TOKEN_VALIDO}`) {
      return {
        user_id: UUID_CURADOR,
        nome: "Curador de Teste",
        email: "curador@exemplo.org",
        papel: "curador",
      };
    }
    return null;
  }),
  exigirAdmin: (curador: { papel?: string } | null) => curador?.papel === "admin",
}));

import { GET } from "@/app/api/curadoria/feedbacks/route";
import { PATCH } from "@/app/api/curadoria/feedbacks/[id]/route";

function requisicaoLista(query = "", token?: string): NextRequest {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest(`http://localhost/api/curadoria/feedbacks${query}`, { headers });
}

function requisicaoDecisao(corpo: unknown, token?: string): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest(`http://localhost/api/curadoria/feedbacks/${UUID_FEEDBACK}`, {
    method: "PATCH",
    headers,
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

function contexto(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("GET /api/curadoria/feedbacks — autenticação", () => {
  it("devolve 401 sem token", async () => {
    const resposta = await GET(requisicaoLista());
    expect(resposta.status).toBe(401);
    expect((await resposta.json()).erro.codigo).toBe("NAO_AUTORIZADO");
  });

  it("devolve 401 com token inválido (não é um curador)", async () => {
    const resposta = await GET(requisicaoLista("", "token-invalido"));
    expect(resposta.status).toBe(401);
  });
});

describe("GET /api/curadoria/feedbacks — listagem", () => {
  it("lista feedbacks pendentes por padrão, com paginação", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        feedbacks: { data: [linhaFeedback({ status: "pendente", decidido_em: null })], count: 1 },
      },
    });

    const resposta = await GET(requisicaoLista("", TOKEN_VALIDO));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.total).toBe(1);
    expect(corpo.pagina).toBe(1);
    expect(corpo.itens[0]).toMatchObject({
      feedback_id: UUID_FEEDBACK,
      status: "pendente",
      interacao: { pergunta: "O que foi o AI-5?" },
    });
    const filtroStatus = estado.supabase.chamadas.find(
      (c) => c.tabela === "feedbacks" && c.metodo === "eq"
    );
    expect(filtroStatus?.args).toEqual(["status", "pendente"]);
  });

  it("rejeita status fora de pendente/aceito/recusado com 400", async () => {
    const resposta = await GET(requisicaoLista("?status=qualquer", TOKEN_VALIDO));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });
});

describe("PATCH /api/curadoria/feedbacks/[id]", () => {
  it("devolve 401 sem token", async () => {
    const resposta = await PATCH(
      requisicaoDecisao({ decisao: "aceito", justificativa: "Justificativa válida." }),
      contexto(UUID_FEEDBACK)
    );
    expect(resposta.status).toBe(401);
  });

  it("decide um feedback pendente, registra a autoria e devolve o item atualizado", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        feedbacks: [
          { data: { feedback_id: UUID_FEEDBACK, status: "pendente" } },
          { data: linhaFeedback({ status: "aceito" }) },
        ],
      },
    });

    const resposta = await PATCH(
      requisicaoDecisao(
        { decisao: "aceito", justificativa: "Fontes conferidas; a sugestão procede." },
        TOKEN_VALIDO
      ),
      contexto(UUID_FEEDBACK)
    );
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.status).toBe("aceito");
    expect(corpo.justificativa_decisao).toBeTruthy();
    const atualizacao = estado.supabase.chamadas.find((c) => c.metodo === "update");
    expect(atualizacao?.args[0]).toMatchObject({
      status: "aceito",
      justificativa_decisao: "Fontes conferidas; a sugestão procede.",
      decidido_por: UUID_CURADOR,
    });
  });

  it("rejeita justificativa com menos de 10 caracteres (transparência exige justificativa real)", async () => {
    const resposta = await PATCH(
      requisicaoDecisao({ decisao: "recusado", justificativa: "curta" }, TOKEN_VALIDO),
      contexto(UUID_FEEDBACK)
    );
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });

  it("devolve 409 para feedback já decidido", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { feedbacks: { data: { feedback_id: UUID_FEEDBACK, status: "aceito" } } },
    });

    const resposta = await PATCH(
      requisicaoDecisao(
        { decisao: "recusado", justificativa: "Tentativa de decidir de novo." },
        TOKEN_VALIDO
      ),
      contexto(UUID_FEEDBACK)
    );
    expect(resposta.status).toBe(409);
  });

  it("devolve 400 para id que não é UUID", async () => {
    const resposta = await PATCH(
      requisicaoDecisao({ decisao: "aceito", justificativa: "Justificativa válida." }, TOKEN_VALIDO),
      contexto("nao-e-uuid")
    );
    expect(resposta.status).toBe(400);
  });

  it("devolve 400 para feedback inexistente", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { feedbacks: { data: null } },
    });

    const resposta = await PATCH(
      requisicaoDecisao({ decisao: "aceito", justificativa: "Justificativa válida." }, TOKEN_VALIDO),
      contexto(UUID_FEEDBACK)
    );
    expect(resposta.status).toBe(400);
  });
});
