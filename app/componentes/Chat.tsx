"use client";

import { useEffect, useId, useRef, useState } from "react";
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

// Velocidade do efeito de digitação: caracteres por intervalo.
// Valor calibrado para texto longo (respostas de 500–2000 chars) terminar
// em ~5–10 segundos — confortável sem parecer lento demais.
const TYPEWRITER_INTERVALO_MS = 16; // ~60fps
const TYPEWRITER_CHARS_POR_TICK = 6;

const PERGUNTAS_EXEMPLO = [
  "O que foi o Relatório da Comissão Nacional da Verdade?",
  "Quais métodos de tortura são documentados no relatório da CNV?",
  "O que o relatório da CNV documenta sobre a morte de Carlos Marighella?",
  "O que diz o relatório sobre a Guerrilha do Araguaia?",
];

type MensagemExibida = Mensagem & {
  id: string;
  resumo?: string;
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

/**
 * Detecta se o usuário pediu menos movimento no sistema operacional.
 * Lido uma vez ao montar — não muda durante a sessão.
 */
function prefereReducaoDeMovimento(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Hook que anima a exibição progressiva de um texto (efeito typewriter).
 * — Se `prefers-reduced-motion` estiver ativo, devolve o texto completo imediatamente.
 * — `ativo` permite acionar o efeito só quando a resposta está pronta.
 * — `aoTerminar` é chamado quando o texto completo foi exibido.
 */
function useTypewriter(
  textoCompleto: string,
  ativo: boolean,
  aoTerminar?: () => void
): string {
  const [textoVisivel, setTextoVisivel] = useState("");
  const semMovimento = useRef(prefereReducaoDeMovimento());
  const aoTerminarRef = useRef(aoTerminar);

  useEffect(() => {
    aoTerminarRef.current = aoTerminar;
  });

  useEffect(() => {
    if (!ativo || !textoCompleto) return;

    // Acessibilidade: sem animação se o usuário pediu menos movimento.
    if (semMovimento.current) {
      setTextoVisivel(textoCompleto);
      aoTerminarRef.current?.();
      return;
    }

    // Reinicia para nova resposta.
    setTextoVisivel("");
    let posicao = 0;

    const intervalo = setInterval(() => {
      posicao = Math.min(posicao + TYPEWRITER_CHARS_POR_TICK, textoCompleto.length);
      setTextoVisivel(textoCompleto.slice(0, posicao));

      if (posicao >= textoCompleto.length) {
        clearInterval(intervalo);
        aoTerminarRef.current?.();
      }
    }, TYPEWRITER_INTERVALO_MS);

    return () => clearInterval(intervalo);
  }, [textoCompleto, ativo]);

  return textoVisivel;
}

// ---------------------------------------------------------------------------
// Sub-componente: mensagem do assistente com efeito de digitação
// ---------------------------------------------------------------------------

type MensagemAssistenteProps = {
  mensagem: MensagemExibida;
  /** Indica se esta é a mensagem mais recente (única que anima). */
  ehAMaisRecente: boolean;
};

function MensagemAssistente({ mensagem, ehAMaisRecente }: MensagemAssistenteProps) {
  // Citações e sugestões só aparecem após o texto terminar de "digitar".
  const [digitacaoConcluida, setDigitacaoConcluida] = useState(!ehAMaisRecente);

  const textoExibido = useTypewriter(
    mensagem.conteudo,
    // Só anima se for a mensagem mais recente; as antigas já aparecem completas.
    ehAMaisRecente,
    () => setDigitacaoConcluida(true)
  );

  // Se não for a mais recente, mostra o texto completo direto.
  const conteudoFinal = ehAMaisRecente ? textoExibido : mensagem.conteudo;
  const mostrarRodape = !ehAMaisRecente || digitacaoConcluida;

  return (
    <div className="w-full rounded-md border border-papel-200 bg-papel-50 px-3 py-3 text-sm dark:border-tinta-900 dark:bg-tinta-950">
      <span className="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
        Projeto Bacuri
      </span>

      {mensagem.erro ? (
        <p role="alert" className="text-red-700 dark:text-red-400">
          {mensagem.erro}
        </p>
      ) : (
        <>
          {/* O resumo já estava disponível antes do typewriter — exibe completo. */}
          {mensagem.resumo && (
            <div className="mb-3 rounded-md border-l-2 border-carmim-700 bg-papel-100 px-3 py-2 dark:bg-tinta-900">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
                Resumo
              </h3>
              <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {mensagem.resumo}
              </p>
            </div>
          )}

          <div
            className="prose prose-neutral prose-sm max-w-none font-serif dark:prose-invert prose-a:font-sans prose-a:font-semibold prose-a:text-carmim-700 dark:prose-a:text-carmim-700"
            // Anuncia ao leitor de tela que o conteúdo está sendo atualizado.
            aria-live={ehAMaisRecente ? "polite" : undefined}
            aria-atomic={ehAMaisRecente ? "false" : undefined}
          >
            <ReactMarkdown
              components={{ a: criarLinkMarcador(mensagem.id) }}
            >
              {linkificarMarcadores(conteudoFinal)}
            </ReactMarkdown>
          </div>

          {/* Cursor piscante durante a digitação */}
          {ehAMaisRecente && !digitacaoConcluida && (
            <span
              aria-hidden="true"
              className="inline-block h-3.5 w-0.5 animate-pulse bg-tinta-700 align-middle dark:bg-papel-300"
            />
          )}

          {/* Rodapé só aparece após a digitação terminar, para não distrair. */}
          {mostrarRodape && (
            <>
              {mensagem.sugestoesPesquisa &&
                mensagem.sugestoesPesquisa.length > 0 && (
                  <div className="mt-3 rounded-md border border-papel-200 bg-papel-50 p-3 dark:border-tinta-800 dark:bg-tinta-900">
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
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal do Chat
// ---------------------------------------------------------------------------

export default function Chat() {
  const [mensagens, setMensagens] = useState<MensagemExibida[]>([]);
  const [entrada, setEntrada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const idBase = useId();

  // Ref para a área de scroll (o "log" da conversa).
  const listaRef = useRef<HTMLDivElement>(null);

  // Ref para a ÚLTIMA mensagem do usuário — usamos para rolar até ela.
  const ultimaPerguntaRef = useRef<HTMLDivElement>(null);

  const tamanhoValido =
    entrada.trim().length >= MIN_CARACTERES &&
    entrada.length <= MAX_CARACTERES;

  // Sempre que `mensagens` muda e a última é do usuário, rola até ela.
  // Quando a resposta chega, ela fica abaixo — o usuário a descobre rolando,
  // mas a pergunta permanece visível no topo da área.
  useEffect(() => {
    if (mensagens.length === 0) return;
    const ultima = mensagens[mensagens.length - 1];
    if (ultima.papel === "usuario") {
      // Posiciona a pergunta no topo do contêiner de scroll.
      ultimaPerguntaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [mensagens]);

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
            resumo: dados.resumo,
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

  // Índice da última mensagem do assistente — só ela recebe o efeito de digitação.
  const indiceMaisRecente = (() => {
    for (let i = mensagens.length - 1; i >= 0; i--) {
      if (mensagens[i].papel === "assistente") return i;
    }
    return -1;
  })();

  return (
    <div className="flex w-full flex-1 flex-col">
      <div
        ref={listaRef}
        role="log"
        aria-label="Conversa com o assistente"
        aria-live="off"
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
                    className="w-full rounded-md border border-papel-200 bg-papel-50 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-papel-100 dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-200 dark:hover:bg-tinta-800"
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

        {mensagens.map((mensagem, indice) => (
          <div
            key={mensagem.id}
            // O ref da última pergunta do usuário fica no container dela.
            ref={
              mensagem.papel === "usuario" &&
              indice === mensagens.length - 1
                ? ultimaPerguntaRef
                : undefined
            }
            className={`mx-auto w-full max-w-2xl ${
              mensagem.papel === "usuario" ? "flex justify-end" : ""
            }`}
          >
            {mensagem.papel === "usuario" ? (
              <div className="flex max-w-[85%] flex-col items-end gap-1">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Você
                </span>
                <p className="rounded-md bg-tinta-950 px-3 py-2 text-sm text-papel-50 dark:bg-papel-100 dark:text-tinta-950">
                  {mensagem.conteudo}
                </p>
              </div>
            ) : (
              <MensagemAssistente
                mensagem={mensagem}
                ehAMaisRecente={indice === indiceMaisRecente}
              />
            )}
          </div>
        ))}

        {carregando && (
          <div className="mx-auto w-full max-w-2xl">
            <div
              role="status"
              className="flex items-center gap-2 rounded-md border border-papel-200 bg-papel-50 px-3 py-2 text-sm text-neutral-600 dark:border-tinta-900 dark:bg-tinta-950 dark:text-neutral-400"
            >
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-1.5 animate-bounce rounded-full bg-tinta-700 [animation-delay:-0.3s] dark:bg-papel-200" />
                <span className="size-1.5 animate-bounce rounded-full bg-tinta-700 [animation-delay:-0.15s] dark:bg-papel-200" />
                <span className="size-1.5 animate-bounce rounded-full bg-tinta-700 dark:bg-papel-200" />
              </span>
              Consultando o acervo e redigindo a resposta — pode levar alguns
              segundos.
            </div>
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
        className="border-t border-papel-200 bg-papel-50 px-4 py-3 sm:px-6 dark:border-tinta-900 dark:bg-tinta-950"
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
            placeholder="Pergunte sobre a Ditadura Militar-Empresarial no Brasil (1964–1985)..."
            disabled={carregando}
            className="w-full resize-none rounded-md border border-papel-200 bg-papel-50 p-2 text-sm text-tinta-950 focus:border-tinta-700 focus:outline-none disabled:opacity-60 dark:border-tinta-800 dark:bg-tinta-900 dark:text-neutral-100"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {entrada.length}/{MAX_CARACTERES} caracteres (mínimo {MIN_CARACTERES})
            </span>
            <button
              type="submit"
              disabled={!tamanhoValido || carregando}
              className="rounded-md border border-tinta-950 bg-tinta-950 px-4 py-1.5 text-sm font-medium text-papel-50 hover:bg-tinta-800 disabled:opacity-50 dark:border-papel-100 dark:bg-papel-100 dark:text-tinta-950 dark:hover:bg-papel-200"
            >
              Enviar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
