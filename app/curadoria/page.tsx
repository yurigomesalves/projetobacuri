"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, tokenAtual } from "@/lib/client/supabase";
import type {
  Curador,
  ConvitePendente,
  CuradorPublico,
  FeedbackCuradoria,
  RespostaConvite,
  RespostaErro,
} from "@/lib/shared/tipos";

// Área interna de curadoria — não deve ser indexada por buscadores.
// A diretiva "noindex" é definida em app/curadoria/layout.tsx, pois
// "use client" não permite exportar `metadata` estática.

type Status = "pendente" | "aceito" | "recusado";

const ABAS: { valor: Status; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "aceito", rotulo: "Aceitos" },
  { valor: "recusado", rotulo: "Recusados" },
];

const ROTULO_CLASSIFICACAO: Record<string, string> = {
  util: "Útil",
  incompleta: "Incompleta",
  incorreta: "Incorreta",
};

const POR_PAGINA = 20;

export default function CuradoriaPage() {
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [curador, setCurador] = useState<Curador | null>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const [status, setStatus] = useState<Status>("pendente");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<FeedbackCuradoria[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  // Busca o Curador autenticado em /api/curadoria/eu a partir do token atual.
  const buscarCurador = useCallback(async (): Promise<Curador | null> => {
    const token = await tokenAtual();
    if (!token) return null;
    try {
      const res = await fetch("/api/curadoria/eu", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        await supabase.auth.signOut();
        return null;
      }
      if (!res.ok) return null;
      return (await res.json()) as Curador;
    } catch {
      return null;
    }
  }, []);

  // Ao montar, verifica se já existe uma sessão Supabase válida.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const c = await buscarCurador();
      if (!cancelado) {
        setCurador(c);
        setVerificandoSessao(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [buscarCurador]);

  const carregar = useCallback(
    async (statusAtual: Status, paginaAtual: number) => {
      setCarregando(true);
      setErroLista(null);
      try {
        const token = await tokenAtual();
        const res = await fetch(
          `/api/curadoria/feedbacks?status=${statusAtual}&pagina=${paginaAtual}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) {
          await supabase.auth.signOut();
          setCurador(null);
          return;
        }
        if (!res.ok) {
          const dados: RespostaErro = await res.json();
          setErroLista(dados.erro?.mensagem ?? "Não foi possível carregar a fila.");
          return;
        }
        const dados: { itens: FeedbackCuradoria[]; total: number; pagina: number } =
          await res.json();
        setItens(dados.itens);
        setTotal(dados.total);
      } catch {
        setErroLista("Não foi possível carregar a fila. Verifique sua conexão.");
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErroLogin(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErroLogin("E-mail ou senha incorretos.");
        return;
      }
      const c = await buscarCurador();
      if (!c) {
        setErroLogin("Não foi possível verificar sua conta. Tente novamente.");
        await supabase.auth.signOut();
        return;
      }
      setCurador(c);
    } catch {
      setErroLogin("Não foi possível entrar. Verifique sua conexão.");
    } finally {
      setEntrando(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    setCurador(null);
    setEmail("");
    setSenha("");
    setItens([]);
    setTotal(0);
    setStatus("pendente");
    setPagina(1);
  }

  useEffect(() => {
    if (curador) {
      // `carregar` liga o indicador de carregamento de forma síncrona; é uma
      // busca de dados disparada por mudança de filtro/página, padrão aceito.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregar(status, pagina);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curador, status, pagina]);

  function trocarStatus(novo: Status) {
    setStatus(novo);
    setPagina(1);
  }

  function atualizarItem(atualizado: FeedbackCuradoria) {
    setItens((lista) =>
      lista.map((it) => (it.feedback_id === atualizado.feedback_id ? atualizado : it))
    );
  }

  function removerDaListaPendente(id: string) {
    if (status === "pendente") {
      setItens((lista) => lista.filter((it) => it.feedback_id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-papel-200 px-4 py-4 sm:px-6 dark:border-tinta-900">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-tinta-950 sm:text-2xl dark:text-neutral-100">
                Curadoria de avaliações
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                Área interna de revisão. Decisões aceitas ou recusadas, com sua
                justificativa, são publicadas em{" "}
                <a
                  href="/transparencia"
                  className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  /transparencia
                </a>
                .
              </p>
            </div>
            {curador && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {curador.nome}
                </span>
                <button
                  type="button"
                  onClick={sair}
                  className="rounded-md border border-papel-200 px-3 py-1.5 font-medium text-neutral-800 hover:bg-papel-100 dark:border-tinta-800 dark:text-neutral-200 dark:hover:bg-tinta-800"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {verificandoSessao ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Verificando sessão...
          </p>
        ) : !curador ? (
          <form onSubmit={entrar} className="max-w-sm space-y-3">
            <label className="block text-sm text-neutral-700 dark:text-neutral-300">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
              />
            </label>
            <label className="block text-sm text-neutral-700 dark:text-neutral-300">
              Senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
              />
            </label>
            <button
              type="submit"
              disabled={entrando || email.length === 0 || senha.length === 0}
              className="rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 disabled:opacity-60 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
            >
              {entrando ? "Entrando..." : "Entrar"}
            </button>
            {erroLogin && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {erroLogin}
              </p>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Acesso apenas por convite.
            </p>
          </form>
        ) : (
          <>
            <PainelMeuPerfil
              onAtualizado={(perfil) =>
                setCurador((c) => (c ? { ...c, nome: perfil.nome } : c))
              }
            />

            {curador.papel === "admin" && <PainelConvites />}

            <div
              role="tablist"
              aria-label="Filtrar por status"
              className="mb-4 flex gap-2 border-b border-papel-200 dark:border-tinta-900"
            >
              {ABAS.map((aba) => (
                <button
                  key={aba.valor}
                  role="tab"
                  aria-selected={status === aba.valor}
                  onClick={() => trocarStatus(aba.valor)}
                  className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    status === aba.valor
                      ? "border-tinta-950 text-tinta-950 dark:border-papel-100 dark:text-neutral-100"
                      : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>

            {carregando && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Carregando...
              </p>
            )}

            {erroLista && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {erroLista}
              </p>
            )}

            {!carregando && !erroLista && itens.length === 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Nenhum feedback {status === "pendente" ? "pendente" : status} no
                momento.
              </p>
            )}

            <ul className="space-y-4">
              {itens.map((item) => (
                <li key={item.feedback_id}>
                  <ItemFeedback
                    item={item}
                    onDecidido={(atualizado) => {
                      atualizarItem(atualizado);
                      removerDaListaPendente(atualizado.feedback_id);
                    }}
                  />
                </li>
              ))}
            </ul>

            {total > POR_PAGINA && (
              <nav
                aria-label="Paginação"
                className="mt-6 flex items-center justify-between text-sm"
              >
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina <= 1 || carregando}
                  className="rounded-md border border-papel-200 px-3 py-1.5 disabled:opacity-50 dark:border-tinta-800"
                >
                  Anterior
                </button>
                <span className="text-neutral-600 dark:text-neutral-400">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas || carregando}
                  className="rounded-md border border-papel-200 px-3 py-1.5 disabled:opacity-50 dark:border-tinta-800"
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Painel do próprio perfil (todo curador logado, admin incluído): completar/
// editar foto e informações que aparecem na página de transparência.
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024; // 2 MB

function PainelMeuPerfil({
  onAtualizado,
}: {
  onAtualizado: (perfil: CuradorPublico) => void;
}) {
  const [carregando, setCarregando] = useState(true);
  const [fotoAtual, setFotoAtual] = useState<string | undefined>(undefined);
  const [nome, setNome] = useState("");
  const [lattesUrl, setLattesUrl] = useState("");
  const [organizacao, setOrganizacao] = useState("");
  const [sobre, setSobre] = useState("");

  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const token = await tokenAtual();
      const res = await fetch("/api/curadoria/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const p: CuradorPublico = await res.json();
      setNome(p.nome ?? "");
      setLattesUrl(p.lattes_url ?? "");
      setOrganizacao(p.organizacao ?? "");
      setSobre(p.sobre ?? "");
      setFotoAtual(p.foto_url);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    setErroFoto(null);
    const arquivo = e.target.files?.[0] ?? null;
    if (!arquivo) {
      setNovaFoto(null);
      setPreviewFoto(null);
      return;
    }
    if (!TIPOS_FOTO.includes(arquivo.type)) {
      setErroFoto("A foto deve ser JPEG, PNG ou WEBP.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
      setErroFoto("A foto deve ter no máximo 2 MB.");
      return;
    }
    setNovaFoto(arquivo);
    setPreviewFoto(URL.createObjectURL(arquivo));
    setRemoverFoto(false);
  }

  function limparFoto() {
    setNovaFoto(null);
    setPreviewFoto(null);
    setRemoverFoto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) {
      setErro("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      const dados = new FormData();
      dados.set("nome", nome.trim());
      dados.set("lattes_url", lattesUrl.trim());
      dados.set("organizacao", organizacao.trim());
      dados.set("sobre", sobre.trim());
      if (novaFoto) {
        dados.set("foto", novaFoto);
      } else if (removerFoto) {
        dados.set("remover_foto", "1");
      }

      const token = await tokenAtual();
      const res = await fetch("/api/curadoria/perfil", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: dados,
      });

      if (!res.ok) {
        const d: RespostaErro = await res.json();
        setErro(d.erro?.mensagem ?? "Não foi possível salvar seu perfil.");
        return;
      }

      const p: CuradorPublico = await res.json();
      setFotoAtual(p.foto_url);
      setNovaFoto(null);
      setPreviewFoto(null);
      setRemoverFoto(false);
      setSucesso(true);
      onAtualizado(p);
    } catch {
      setErro("Não foi possível salvar seu perfil. Verifique sua conexão.");
    } finally {
      setSalvando(false);
    }
  }

  const fotoExibida = previewFoto ?? (removerFoto ? undefined : fotoAtual);

  return (
    <details className="mb-6 rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
      <summary className="cursor-pointer text-sm font-semibold text-tinta-950 dark:text-neutral-100">
        Meu perfil
      </summary>

      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Estas informações aparecem publicamente na página de{" "}
        <a
          href="/transparencia"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Transparência
        </a>
        , para que o público saiba quem participa da curadoria.
      </p>

      {carregando ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Carregando...</p>
      ) : (
        <form onSubmit={salvar} className="mt-4 space-y-3">
          <div className="flex items-center gap-4">
            {fotoExibida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoExibida}
                alt="Pré-visualização da sua foto"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-papel-100 text-lg font-semibold text-tinta-950 dark:bg-tinta-800 dark:text-neutral-100"
              >
                {(nome.trim().charAt(0) || "?").toUpperCase()}
              </span>
            )}
            <div className="space-y-1">
              <label className="block text-sm text-neutral-700 dark:text-neutral-300">
                <span className="sr-only">Foto de perfil</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={escolherFoto}
                  className="block w-full text-xs text-neutral-700 file:mr-2 file:rounded-md file:border file:border-papel-200 file:bg-papel-100 file:px-3 file:py-1 file:text-xs file:font-medium hover:file:bg-papel-200 dark:text-neutral-300 dark:file:border-tinta-800 dark:file:bg-tinta-800"
                />
              </label>
              {fotoExibida && (
                <button
                  type="button"
                  onClick={limparFoto}
                  className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Remover foto
                </button>
              )}
              {erroFoto && (
                <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                  {erroFoto}
                </p>
              )}
            </div>
          </div>

          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Nome
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value.slice(0, 120))}
              required
              className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-100"
            />
          </label>

          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Currículo Lattes (link)
            <input
              type="url"
              value={lattesUrl}
              onChange={(e) => setLattesUrl(e.target.value)}
              placeholder="https://lattes.cnpq.br/..."
              className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-100"
            />
          </label>

          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Organização política / movimento social
            <input
              type="text"
              value={organizacao}
              onChange={(e) => setOrganizacao(e.target.value.slice(0, 200))}
              className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-100"
            />
          </label>

          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Sobre
            <textarea
              value={sobre}
              onChange={(e) => setSobre(e.target.value.slice(0, 2000))}
              rows={4}
              className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-100"
            />
            <span className="mt-1 block text-right text-xs text-neutral-500">
              {sobre.length}/2000
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 disabled:opacity-60 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
            >
              {salvando ? "Salvando..." : "Salvar perfil"}
            </button>
            {sucesso && (
              <span role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
                Perfil salvo.
              </span>
            )}
          </div>

          {erro && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {erro}
            </p>
          )}
        </form>
      )}
    </details>
  );
}

// Painel exclusivo do administrador: gerar convites, listar convites
// pendentes (com opção de revogar) e ver os curadores já cadastrados.
function PainelConvites() {
  const [email, setEmail] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);
  const [ultimoConvite, setUltimoConvite] = useState<RespostaConvite | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [convites, setConvites] = useState<ConvitePendente[]>([]);
  const [carregandoConvites, setCarregandoConvites] = useState(true);
  const [erroConvites, setErroConvites] = useState<string | null>(null);

  const [curadores, setCuradores] = useState<CuradorPublico[]>([]);
  const [carregandoCuradores, setCarregandoCuradores] = useState(true);
  const [erroCuradores, setErroCuradores] = useState<string | null>(null);

  const carregarConvites = useCallback(async () => {
    setCarregandoConvites(true);
    setErroConvites(null);
    try {
      const token = await tokenAtual();
      const res = await fetch("/api/curadoria/convites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const dados: RespostaErro = await res.json();
        setErroConvites(dados.erro?.mensagem ?? "Não foi possível carregar os convites.");
        return;
      }
      const dados: { itens: ConvitePendente[] } = await res.json();
      setConvites(dados.itens);
    } catch {
      setErroConvites("Não foi possível carregar os convites. Verifique sua conexão.");
    } finally {
      setCarregandoConvites(false);
    }
  }, []);

  const carregarCuradores = useCallback(async () => {
    setCarregandoCuradores(true);
    setErroCuradores(null);
    try {
      const token = await tokenAtual();
      const res = await fetch("/api/curadoria/curadores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const dados: RespostaErro = await res.json();
        setErroCuradores(dados.erro?.mensagem ?? "Não foi possível carregar os curadores.");
        return;
      }
      const dados: { itens: CuradorPublico[] } = await res.json();
      setCuradores(dados.itens);
    } catch {
      setErroCuradores("Não foi possível carregar os curadores. Verifique sua conexão.");
    } finally {
      setCarregandoCuradores(false);
    }
  }, []);

  useEffect(() => {
    // Carregamento inicial do painel administrativo, disparado uma vez ao
    // montar; padrão aceito (mesmo usado na fila de feedbacks abaixo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarConvites();
    carregarCuradores();
  }, [carregarConvites, carregarCuradores]);

  async function gerarConvite(e: React.FormEvent) {
    e.preventDefault();
    setGerando(true);
    setErroConvite(null);
    setCopiado(false);
    try {
      const token = await tokenAtual();
      const res = await fetch("/api/curadoria/convites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const dados: RespostaErro = await res.json();
        setErroConvite(dados.erro?.mensagem ?? "Não foi possível gerar o convite.");
        return;
      }
      const dados: RespostaConvite = await res.json();
      setUltimoConvite(dados);
      setEmail("");
      carregarConvites();
    } catch {
      setErroConvite("Não foi possível gerar o convite. Verifique sua conexão.");
    } finally {
      setGerando(false);
    }
  }

  async function copiarLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  async function revogar(id: string) {
    try {
      const token = await tokenAtual();
      const res = await fetch(`/api/curadoria/convites/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConvites((lista) => lista.filter((c) => c.convite_id !== id));
      }
    } catch {
      // silencioso: a lista permanece como está, e o usuário pode tentar de novo
    }
  }

  return (
    <details className="mb-6 rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
      <summary className="cursor-pointer text-sm font-semibold text-tinta-950 dark:text-neutral-100">
        Convidar curadores
      </summary>

      <div className="mt-4 space-y-6">
        <form onSubmit={gerarConvite} className="max-w-sm space-y-3">
          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            E-mail da pessoa convidada
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-100"
            />
          </label>
          <button
            type="submit"
            disabled={gerando || email.length === 0}
            className="rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 disabled:opacity-60 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
          >
            {gerando ? "Gerando..." : "Gerar convite"}
          </button>
          {erroConvite && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {erroConvite}
            </p>
          )}
        </form>

        {ultimoConvite && (
          <div className="rounded-md border border-papel-200 p-3 text-sm dark:border-tinta-800">
            <p className="text-neutral-700 dark:text-neutral-300">
              Convite gerado para <strong>{ultimoConvite.email}</strong>. Envie
              este link à pessoa (ele expira em 7 dias):
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all rounded-md bg-papel-100 px-2 py-1 text-xs text-tinta-950 dark:bg-tinta-950 dark:text-neutral-100">
                {ultimoConvite.link}
              </code>
              <button
                type="button"
                onClick={() => copiarLink(ultimoConvite.link)}
                className="rounded-md border border-papel-200 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-papel-100 dark:border-tinta-800 dark:text-neutral-200 dark:hover:bg-tinta-800"
              >
                {copiado ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
            Convites pendentes
          </h2>
          {carregandoConvites && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Carregando...
            </p>
          )}
          {erroConvites && (
            <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {erroConvites}
            </p>
          )}
          {!carregandoConvites && !erroConvites && convites.length === 0 && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Nenhum convite pendente.
            </p>
          )}
          {convites.length > 0 && (
            <ul className="mt-2 space-y-2">
              {convites.map((c) => (
                <li
                  key={c.convite_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-papel-200 px-3 py-2 text-sm dark:border-tinta-800"
                >
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {c.email}{" "}
                    <span className="text-xs text-neutral-500 dark:text-neutral-500">
                      (expira em {formatarData(c.expira_em)})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => revogar(c.convite_id)}
                    className="rounded-md border border-papel-200 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-papel-100 dark:border-tinta-800 dark:text-neutral-200 dark:hover:bg-tinta-800"
                  >
                    Revogar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
            Curadores cadastrados
            {!carregandoCuradores && !erroCuradores && ` (${curadores.length})`}
          </h2>
          {carregandoCuradores && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Carregando...
            </p>
          )}
          {erroCuradores && (
            <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
              {erroCuradores}
            </p>
          )}
          {!carregandoCuradores && !erroCuradores && curadores.length > 0 && (
            <ul className="mt-2 space-y-2">
              {curadores.map((c, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-md border border-papel-200 px-3 py-2 text-sm dark:border-tinta-800"
                >
                  {c.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.foto_url}
                      alt={`Foto de ${c.nome}`}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-papel-100 text-xs font-semibold text-tinta-950 dark:bg-tinta-800 dark:text-neutral-100"
                    >
                      {c.nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {c.nome}
                    {c.organizacao && (
                      <span className="text-neutral-500 dark:text-neutral-500">
                        {" "}
                        — {c.organizacao}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </details>
  );
}

function ItemFeedback({
  item,
  onDecidido,
}: {
  item: FeedbackCuradoria;
  onDecidido: (atualizado: FeedbackCuradoria) => void;
}) {
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const justificativaValida =
    justificativa.trim().length >= 10 && justificativa.trim().length <= 2000;

  async function decidir(decisao: "aceito" | "recusado") {
    if (!justificativaValida) return;
    setEnviando(true);
    setErro(null);
    try {
      const token = await tokenAtual();
      const res = await fetch(`/api/curadoria/feedbacks/${item.feedback_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decisao, justificativa: justificativa.trim() }),
      });

      if (res.ok) {
        const atualizado: FeedbackCuradoria = await res.json();
        onDecidido(atualizado);
        return;
      }

      const dados: RespostaErro = await res.json();
      if (res.status === 409) {
        setErro("Este feedback já foi decidido por outra sessão.");
      } else if (res.status === 401) {
        setErro("Sessão expirada. Recarregue a página e entre novamente.");
      } else {
        setErro(dados.erro?.mensagem ?? "Não foi possível registrar a decisão.");
      }
    } catch {
      setErro("Não foi possível registrar a decisão. Verifique sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="rounded-md border border-papel-200 bg-papel-50 p-4 dark:border-tinta-900 dark:bg-tinta-900">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Enviado em {formatarData(item.criado_em)}
      </p>

      <h3 className="mt-1 text-sm font-semibold text-tinta-950 dark:text-neutral-100">
        Pergunta do usuário
      </h3>
      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
        {item.interacao.pergunta}
      </p>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700 underline underline-offset-2 dark:text-neutral-300">
          ver resposta do assistente
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
          {item.interacao.resposta}
        </p>
      </details>

      <p className="mt-3 text-sm text-neutral-800 dark:text-neutral-200">
        <span className="font-semibold">Classificação: </span>
        {ROTULO_CLASSIFICACAO[item.classificacao] ?? item.classificacao}
      </p>

      {item.resposta_alternativa && (
        <div className="mt-2">
          <h4 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
            Resposta alternativa proposta
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
            {item.resposta_alternativa}
          </p>
        </div>
      )}

      {item.fontes_sugeridas && (
        <div className="mt-2">
          <h4 className="text-sm font-semibold text-tinta-950 dark:text-neutral-100">
            Fontes sugeridas
          </h4>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            {item.fontes_sugeridas}
          </p>
        </div>
      )}

      {item.status === "pendente" ? (
        <div className="mt-4 border-t border-papel-200 pt-3 dark:border-tinta-900">
          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Justificativa da decisão (10–2000 caracteres)
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value.slice(0, 2000))}
              rows={3}
              className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-100"
            />
            <span className="mt-1 block text-right text-xs text-neutral-500">
              {justificativa.length}/2000
            </span>
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Esta justificativa será publicada na página de transparência, junto
            com a decisão.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => decidir("aceito")}
              disabled={enviando || !justificativaValida}
              className="rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 disabled:opacity-60 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
            >
              {enviando ? "Enviando..." : "Aceitar"}
            </button>
            <button
              type="button"
              onClick={() => decidir("recusado")}
              disabled={enviando || !justificativaValida}
              className="rounded-md border border-papel-200 px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-papel-100 disabled:opacity-60 dark:border-tinta-800 dark:text-neutral-200 dark:hover:bg-tinta-800"
            >
              {enviando ? "Enviando..." : "Recusar"}
            </button>
          </div>

          {erro && (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
              {erro}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 border-t border-papel-200 pt-3 dark:border-tinta-900">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Status:{" "}
            <span
              className={
                item.status === "aceito"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-neutral-600 dark:text-neutral-400"
              }
            >
              {item.status === "aceito" ? "Aceito" : "Recusado"}
            </span>
            {item.decidido_em && ` em ${formatarData(item.decidido_em)}`}
          </p>
          {item.justificativa_decisao && (
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-semibold">Justificativa: </span>
              {item.justificativa_decisao}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}
