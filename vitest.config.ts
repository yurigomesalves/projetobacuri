import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Os testes rodam em ambiente Node (as rotas de API executam no servidor)
// e nunca acessam rede: Supabase, embeddings e LLM são substituídos por
// dublês em tests/apoio/.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mesmo alias do tsconfig.json ("@/*" -> raiz do projeto).
      "@": path.dirname(fileURLToPath(import.meta.url)),
    },
  },
});
