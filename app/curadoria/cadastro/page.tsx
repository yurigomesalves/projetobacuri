"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ConviteValido, RespostaErro } from "@/lib/shared/tipos";

// Página de cadastro a partir de convite — pública, mas herda o "noindex"
// de app/curadoria/layout.tsx (desejável: cadastro não deve ser indexado).

const TAMANHO_MAX_FOTO = 2 * 1024 * 1024; // 2MB
const TIPOS_FOTO_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const SOBRE_MAX = 2000;

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Carregando...
          </p>
        </div>
      }
    >
      <CadastroConteudo />
    </Suspense>
  );
}

function CadastroConteudo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [verificando, setVerificando] = useState(true);
  const [conviteValido, setConviteValido] = useState<ConviteValido | null>(null);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function verificar() {
      if (!token) {
        if (!cancelado) {
          setErroConvite("Convite inválido, já usado ou expirado.");
          setVerificando(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/curadoria/convites/validar?token=${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          if (!cancelado) {
            setErroConvite("Convite inválido, já usado ou expirado.");
          }
          return;
        }
        const dados: ConviteValido = await res.json();
        if (!cancelado) setConviteValido(dados);
      } catch {
        if (!cancelado) {
          setErroConvite("Não foi possível verificar o convite. Verifique sua conexão.");
        }
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }
    verificar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-papel-200 px-4 py-4 sm:px-6 dark:border-tinta-900">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-xl font-semibold tracking-tight text-tinta-950 sm:text-2xl dark:text-neutral-100">
            Cadastro de curadoria
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Este cadastro só pode ser feito a partir de um link de convite
            enviado pela equipe do projeto.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 sm:px-6">
        {verificando && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Verificando convite...
          </p>
        )}

        {!verificando && erroConvite && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {erroConvite}
          </p>
        )}

        {!verificando && conviteValido && (
          <Formulario token={token} email={conviteValido.email} />
        )}
      </main>
    </div>
  );
}

function Formulario({ token, email }: { token: string; email: string }) {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [lattesUrl, setLattesUrl] = useState("");
  const [organizacao, setOrganizacao] = useState("");
  const [sobre, setSobre] = useState("");
  const [concordo, setConcordo] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const senhaValida = senha.length >= 8;
  const senhasIguais = senha === confirmarSenha;

  const formularioValido =
    nome.trim().length > 0 && senhaValida && senhasIguais && concordo && !erroFoto;

  function aoEscolherFoto(arquivo: File | null) {
    setErroFoto(null);
    setFoto(null);
    setPreviewFoto(null);
    if (!arquivo) return;

    if (!TIPOS_FOTO_ACEITOS.includes(arquivo.type)) {
      setErroFoto("A foto deve ser um arquivo JPEG, PNG ou WebP.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX_FOTO) {
      setErroFoto("A foto deve ter no máximo 2MB.");
      return;
    }
    setFoto(arquivo);
    setPreviewFoto(URL.createObjectURL(arquivo));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!formularioValido) return;
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("nome", nome.trim());
      formData.append("senha", senha);
      if (foto) formData.append("foto", foto);
      if (lattesUrl.trim()) formData.append("lattes_url", lattesUrl.trim());
      if (organizacao.trim()) formData.append("organizacao", organizacao.trim());
      if (sobre.trim()) formData.append("sobre", sobre.trim());

      const res = await fetch("/api/curadoria/cadastro", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSucesso(true);
        return;
      }

      const dados: RespostaErro = await res.json();
      setErro(dados.erro?.mensagem ?? "Não foi possível concluir o cadastro.");
    } catch {
      setErro("Não foi possível concluir o cadastro. Verifique sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-800 dark:text-neutral-200">
          Cadastro concluído. Agora você já pode entrar.
        </p>
        <a
          href="/curadoria"
          className="inline-block rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
        >
          Ir para a área de curadoria
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        E-mail do convite
        <input
          type="email"
          value={email}
          readOnly
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-100 p-2 text-sm text-neutral-600 dark:border-tinta-800 dark:bg-tinta-950 dark:text-neutral-400"
        />
      </label>

      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        Nome
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
        />
      </label>

      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        Senha (mínimo 8 caracteres)
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          aria-describedby="erro-senha"
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
        />
      </label>
      {senha.length > 0 && !senhaValida && (
        <p id="erro-senha" role="alert" className="text-sm text-red-700 dark:text-red-400">
          A senha precisa ter pelo menos 8 caracteres.
        </p>
      )}

      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        Confirmar senha
        <input
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          autoComplete="new-password"
          required
          aria-describedby="erro-confirmar-senha"
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
        />
      </label>
      {confirmarSenha.length > 0 && !senhasIguais && (
        <p
          id="erro-confirmar-senha"
          role="alert"
          className="text-sm text-red-700 dark:text-red-400"
        >
          As senhas não coincidem.
        </p>
      )}

      <div>
        <label className="block text-sm text-neutral-700 dark:text-neutral-300">
          Foto (opcional, JPEG/PNG/WebP, até 2MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => aoEscolherFoto(e.target.files?.[0] ?? null)}
            aria-describedby="erro-foto"
            className="mt-1 block w-full text-sm text-neutral-700 dark:text-neutral-300"
          />
        </label>
        {erroFoto && (
          <p id="erro-foto" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
            {erroFoto}
          </p>
        )}
        {previewFoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewFoto}
            alt="Pré-visualização da foto de perfil"
            className="mt-2 h-20 w-20 rounded-full object-cover"
          />
        )}
      </div>

      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        Currículo Lattes (opcional)
        <input
          type="url"
          value={lattesUrl}
          onChange={(e) => setLattesUrl(e.target.value)}
          placeholder="https://www.lattes.cnpq.br/..."
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
        />
      </label>

      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        Organização política ou movimento social (opcional)
        <input
          type="text"
          value={organizacao}
          onChange={(e) => setOrganizacao(e.target.value)}
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
        />
      </label>

      <label className="block text-sm text-neutral-700 dark:text-neutral-300">
        Sobre (opcional)
        <textarea
          value={sobre}
          onChange={(e) => setSobre(e.target.value.slice(0, SOBRE_MAX))}
          rows={4}
          className="mt-1 w-full rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
        />
        <span className="mt-1 block text-right text-xs text-neutral-500">
          {sobre.length}/{SOBRE_MAX}
        </span>
      </label>

      <div className="rounded-md border border-papel-200 bg-papel-100 p-3 text-sm text-neutral-700 dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-300">
        <p>
          O Projeto Bacuri publica, na página de Transparência, quem é
          responsável pelas decisões de curadoria sobre o acervo. Por isso, a
          foto, a organização política ou movimento social, o link do
          Currículo Lattes e o texto &quot;Sobre&quot; que você preencher
          acima ficarão visíveis publicamente nessa página. Os campos
          opcionais que você não preencher não serão exibidos. Quem lê o
          acervo tem o direito de saber quem o avalia.
        </p>
        <label className="mt-2 flex items-start gap-2">
          <input
            type="checkbox"
            checked={concordo}
            onChange={(e) => setConcordo(e.target.checked)}
            required
            className="mt-0.5"
          />
          <span>
            Li e concordo com a publicação dessas informações no meu perfil
            público.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={enviando || !formularioValido}
        className="rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 disabled:opacity-60 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
      >
        {enviando ? "Enviando..." : "Concluir cadastro"}
      </button>

      {erro && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}
    </form>
  );
}
