"use client";

import { useState } from "react";
import type { RequisicaoFeedback, RespostaFeedback, RespostaErro } from "@/lib/shared/tipos";

type Props = {
  interacaoId: string;
};

type Classificacao = RequisicaoFeedback["classificacao"];

const OPCOES: { valor: Classificacao; rotulo: string }[] = [
  { valor: "util", rotulo: "Útil" },
  { valor: "incompleta", rotulo: "Incompleta" },
  { valor: "incorreta", rotulo: "Incorreta" },
];

/**
 * Bloco de avaliação da resposta. Cada interação só pode receber um feedback:
 * após o envio (201), o formulário é desabilitado e exibe agradecimento.
 */
export default function Feedback({ interacaoId }: Props) {
  const [classificacao, setClassificacao] = useState<Classificacao | null>(null);
  const [respostaAlternativa, setRespostaAlternativa] = useState("");
  const [fontesSugeridas, setFontesSugeridas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const precisaDetalhes =
    classificacao === "incompleta" || classificacao === "incorreta";

  async function enviar(valorEscolhido: Classificacao) {
    setClassificacao(valorEscolhido);

    // Para "útil" enviamos imediatamente; para os demais, aguardamos o botão de envio.
    if (valorEscolhido === "util") {
      await enviarFeedback(valorEscolhido);
    }
  }

  async function enviarFeedback(valor: Classificacao) {
    setEnviando(true);
    setErro(null);

    try {
      const corpo: RequisicaoFeedback = {
        interacao_id: interacaoId,
        classificacao: valor,
        ...(respostaAlternativa.trim()
          ? { resposta_alternativa: respostaAlternativa.trim() }
          : {}),
        ...(fontesSugeridas.trim()
          ? { fontes_sugeridas: fontesSugeridas.trim() }
          : {}),
      };

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });

      if (res.status === 201) {
        const dados: RespostaFeedback = await res.json();
        if (dados.status === "recebido_para_curadoria") {
          setEnviado(true);
        }
      } else {
        const dados: RespostaErro = await res.json();
        setErro(dados.erro?.mensagem ?? "Não foi possível enviar o feedback agora.");
      }
    } catch {
      setErro("Não foi possível enviar o feedback agora. Verifique sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        Obrigado pela avaliação. Seu retorno entra na fila de curadoria humana e
        não altera o acervo automaticamente.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-creme-200 pt-3 dark:border-verde-900">
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Esta resposta foi útil?
      </p>
      <div
        role="group"
        aria-label="Avaliação da resposta"
        className="mt-2 flex gap-2"
      >
        {OPCOES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => enviar(opcao.valor)}
            disabled={enviando}
            aria-pressed={classificacao === opcao.valor}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              classificacao === opcao.valor
                ? "border-verde-950 bg-verde-950 text-white dark:border-creme-100 dark:bg-creme-100 dark:text-verde-950"
                : "border-creme-200 text-neutral-700 hover:bg-creme-100 dark:border-verde-800 dark:text-neutral-300 dark:hover:bg-verde-800"
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {precisaDetalhes && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Opcional: contribuições passam por curadoria humana antes de qualquer
            uso no acervo.
          </p>

          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Proposta de resposta alternativa
            <textarea
              value={respostaAlternativa}
              onChange={(e) => setRespostaAlternativa(e.target.value.slice(0, 3000))}
              maxLength={3000}
              rows={4}
              className="mt-1 w-full rounded-md border border-creme-200 bg-white p-2 text-sm text-verde-950 focus:border-verde-700 focus:outline-none dark:border-verde-800 dark:bg-verde-900 dark:text-neutral-100"
              placeholder="Como você redigiria esta resposta com base nas fontes do acervo?"
            />
            <span className="mt-1 block text-right text-xs text-neutral-500">
              {respostaAlternativa.length}/3000
            </span>
          </label>

          <label className="block text-sm text-neutral-700 dark:text-neutral-300">
            Fontes sugeridas
            <input
              type="text"
              value={fontesSugeridas}
              onChange={(e) => setFontesSugeridas(e.target.value)}
              className="mt-1 w-full rounded-md border border-creme-200 bg-white p-2 text-sm text-verde-950 focus:border-verde-700 focus:outline-none dark:border-verde-800 dark:bg-verde-900 dark:text-neutral-100"
              placeholder="Ex.: documento, autor, link"
            />
          </label>

          <button
            type="button"
            onClick={() => enviarFeedback(classificacao)}
            disabled={enviando}
            className="rounded-md border border-verde-950 bg-verde-950 px-4 py-1.5 text-sm font-medium text-white hover:bg-verde-800 disabled:opacity-60 dark:border-creme-100 dark:bg-creme-100 dark:text-verde-950 dark:hover:bg-creme-200"
          >
            {enviando ? "Enviando..." : "Enviar feedback"}
          </button>
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}
