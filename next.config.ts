import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transformers.js (embedding da consulta — ADR-007) carrega binários
  // nativos do ONNX Runtime; não pode ser empacotado pelo bundler.
  serverExternalPackages: ["@huggingface/transformers"],
};

export default nextConfig;
