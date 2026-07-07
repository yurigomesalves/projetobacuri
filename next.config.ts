import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transformers.js (embedding da consulta — ADR-007) carrega binários
  // nativos do ONNX Runtime; não pode ser empacotado pelo bundler.
  serverExternalPackages: ["@huggingface/transformers"],

  // O rastreador de arquivos da Vercel não detecta os binários nativos do
  // ONNX Runtime (libonnxruntime.so.1) como dependência do /api/chat, e a
  // rota falha em produção sem eles. As funções da Vercel rodam em Linux
  // x64, e só usamos execução por CPU — inclui apenas esses binários
  // (o pacote completo, com CUDA/Windows/macOS, passa do limite de 250 MB).
  outputFileTracingIncludes: {
    "/api/chat": [
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime_providers_shared.so",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node",
    ],
  },

  // A antiga página /manifesto virou /sobre; redireciona links e marcadores
  // antigos para o novo endereço, sem quebrar nada já compartilhado.
  async redirects() {
    return [
      { source: "/manifesto", destination: "/sobre", permanent: true },
    ];
  },
};

export default nextConfig;
