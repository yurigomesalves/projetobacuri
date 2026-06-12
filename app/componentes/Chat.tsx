"use client";

import { useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type {
  Mensagem,
  RespostaChat,
  RespostaErro,
} from "@/lib/shared/tipos";
import Citacoes from "./Citacoes";
import Feedback from "./Feedback";

const MIN_CARACTERES = 3;
const MAX_CARACTERES = 1000;
const MAX_HISTORICO = 6;

const PERGUNTAS_EXEMPLO = [
  "O que foi o Relatório da Comissão Nacional da Verdade?",
  "Quais métodos de tortura são documentados no relatório da CNV?",
  "O que o relatório da CNV documenta sobre a morte de Carlos Marighella?",
  "O que diz o relatório sobre a Guerrilha do Araguaia?",
];

type MensagemExibida = Mensagem & {
  id: string;
  citacoes?: RespostaChat["citacoes"];
  sugestoesPesquisa?: string[];
  interacaoId?: string;
  erro?: string;
};

/** Cria um link de marcador [n] que aponta para a fonte correspondente. */
function criarLinkMarcador(idResposta: string): Components["a"] {
  return function LinkMarcador(props) {
    const { href, children, ...resto } = props;

    // Marcadores no formato [1], [2]... viram âncoras internas para #idResposta-fonte-n
    if (href?.startsWith("#")) {
      return (
        <a href={`#${idResposta}-fonte-${href.slice(1)}`} {...resto}>
          {children}
        </a>
      );
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...resto}>
        {children}
      </a>
    );
  };
}

/**
 * Transforma marcadores de texto "[1]", "[2]" em links markdown "[1](#1)"
 * para que o ReactMarkdown os renderize como âncoras clicáveis.
 */
function linkificarMarcadores(texto: string): string {
  return texto.replace(/\[(\d+)\]/g, "[[$1]](#$1)");
}

export default function Chat() {
  const [mensagens, setMensagens] = useState<MensagemExibida[]>([]);
  const [entrada, setEntrada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const idBase = useId();
  const listaRef = useRef<HTMLDivElement>(null);

  const tamanhoValido =
    entrada.trim().length >= MIN_CARACTERES &&
    entrada.length <= MAX_CARACTERES;

  async function enviarMensagem(texto: string) {
    const conteudo = texto.trim();
    if (conteudo.length < MIN_CARACTERES || conteudo.length > MAX_CARACTERES) {
      return;
    }

    setErroGeral(null);

    const historico: Mensagem[] = mensagens
      .filter((m) => !m.erro)
      .slice(-MAX_HISTORICO)
      .map((m) => ({ papel: m.papel, conteudo: m.conteudo }));

    const mensagemUsuario: MensagemExibida = {
      id: `${idBase}-msg-${mensagens.length}`,
      papel: "usuario",
      conteudo,
    };

    setMensagens((atual) => [...atual, mensagemUsuario]);
    setEntrada("");
    setCarregando(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: conteudo, historico }),
      });

      if (res.ok) {
        const dados: RespostaChat = await res.json();
        setMensagens((atual) => [
          ...atual,
          {
            id: dados.interacao_id,
            papel: "assistente",
            conteudo: dados.resposta,
            citacoes: dados.citacoes,
            sugestoesPesquisa: dados.sugestoes_pesquisa,
            interacaoId: dados.interacao_id,
          },
        ]);
      } else {
        const dados: RespostaErro = await res.json();
        const mensagemErro =
          dados.erro?.mensagem ??
          "Não foi possível obter uma resposta agora. Tente novamente em alguns instantes.";
        setMensagens((atual) => [
          ...atual,
          {
            id: `${idBase}-erro-${atual.length}`,
            papel: "assistente",
            conteudo: mensagemErro,
            erro: mensagemErro,
          },
        ]);
      }
    } catch {
      setErroGeral(
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  function aoEnviarFormulario(e: React.FormEvent) {
    e.preventDefault();
    void enviarMensagem(entrada);
  }

  function aoPressionarTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviarMensagem(entrada);
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div
        ref={listaRef}
        role="log"
        aria-label="Conversa com o assistente"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {mensagens.length === 0 && (
          <div className="mx-auto w-full max-w-2xl py-6">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Experimente perguntar:
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {PERGUNTAS_EXEMPLO.map((pergunta) => (
                <li key={pergunta}>
                  <button
                    type="button"
                    onClick={() => void enviarMensagem(pergunta)}
                    className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {pergunta}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
              O assistente responde apenas com base em documentos do acervo,
              citando as fontes. Se não houver base documental suficiente, ele
              informa isso em vez de inventar uma resposta.
            </p>
          </div>
        )}

        {mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className={`mx-auto w-full max-w-2xl ${
              mensagem.papel === "usuario" ? "flex justify-end" : ""
            }`}
          >
            {mensagem.papel === "usuario" ? (
              <p className="max-w-[85%] rounded-md bg-neutral-900 px-3 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900">
                {mensagem.conteudo}
              </p>
            ) : (
              <div className="w-full rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
                {mensagem.erro ? (
                  <p role="alert" className="text-red-700 dark:text-red-400">
                    {mensagem.erro}
                  </p>
                ) : (
                  <>
                    <div className="prose prose-neutral prose-sm max-w-none dark:prose-invert prose-a:text-neutral-900 dark:prose-a:text-neutral-100">
                      <ReactMarkdown
                        components={{ a: criarLinkMarcador(mensagem.id) }}
                      >
                        {linkificarMarcadores(mensagem.conteudo)}
                      </ReactMarkdown>
                    </div>

                    {mensagem.sugestoesPesquisa &&
                      mensagem.sugestoesPesquisa.length > 0 && (
                        <div className="mt-3 rounded-md border border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                            Para aprofundar a pesquisa
                          </h3>
                          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                            {mensagem.sugestoesPesquisa.map((sugestao) => (
                              <li key={sugestao}>{sugestao}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {mensagem.citacoes && (
                      <Citacoes
                        citacoes={mensagem.citacoes}
                        idResposta={mensagem.id}
                      />
                    )}

                    {mensagem.interacaoId && (
                      <Feedback interacaoId={mensagem.interacaoId} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {carregando && (
          <div className="mx-auto w-full max-w-2xl">
            <p
              role="status"
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
            >
              Consultando o acervo e redigindo a resposta — pode levar alguns
              segundos.
            </p>
          </div>
        )}

        {erroGeral && (
          <div className="mx-auto w-full max-w-2xl">
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {erroGeral}
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={aoEnviarFormulario}
        className="border-t border-neutral-200 bg-white px-4 py-3 sm:px-6 dark:border-neutral-800 dark:bg-neutral-950"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <label htmlFor="campo-pergunta" className="sr-only">
            Escreva sua pergunta
          </label>
          <textarea
            id="campo-pergunta"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value.slice(0, MAX_CARACTERES))}
            onKeyDown={aoPressionarTecla}
            rows={2}
            placeholder="Pergunte sobre a Ditadura Civil-Militar no Brasil (1964–1985)..."
            disabled={carregando}
            className="w-full resize-none rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {entrada.length}/{MAX_CARACTERES} caracteres (mínimo {MIN_CARACTERES})
            </span>
            <button
              type="submit"
              disabled={!tamanhoValido || carregando}
              className="rounded-md border border-neutral-900 bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Enviar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
