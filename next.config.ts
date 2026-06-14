import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transformers.js (embedding da consulta — ADR-007) carrega binários
  // nativos do ONNX Runtime; não pode ser empacotado pelo bundler.
  serverExternalPackages: ["@huggingface/transformers"],

  // O rastreador de arquivos da Vercel não detecta os binários nativos do
  // ONNX Runtime (libonnxruntime.so.1) como dependência do /api/chat, e a
  // rota falha em produção sem eles. Inclui a pasta inteira explicitamente.
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
