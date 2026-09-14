import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontes = path.join(raiz, "agentes", "especialistas");
const claude = path.join(raiz, ".claude", "agents");
const openCode = path.join(raiz, ".opencode", "agents");
const codex = path.join(raiz, ".codex", "agents");

const papeis = {
  "arquiteto-backend": {
    claudeTools: "Read, Grep, Glob, Write, Edit, Bash",
    codexEffort: "medium",
  },
  "cientista-de-dados": {
    claudeTools: "Read, Grep, Glob, Write, Edit, Bash",
    codexEffort: "medium",
  },
  "curador-historiador": {
    claudeTools: "Read, Grep, Glob, Write",
    codexEffort: "high",
  },
  "designer-frontend": {
    claudeTools: "Read, Grep, Glob, Write, Edit, Bash",
    codexEffort: "medium",
  },
  "engenheiro-de-dados": {
    claudeTools: "Read, Grep, Glob, Write, Edit, Bash",
    codexEffort: "medium",
  },
};

function lerFrente(texto) {
  const encontrado = texto.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  if (!encontrado) throw new Error("Arquivo de agente sem frontmatter válido.");

  const cabecalho = Object.fromEntries(
    encontrado[1]
      .split("\n")
      .map((linha) => linha.match(/^([\w-]+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, chave, valor]) => [chave, valor]),
  );
  return { ...cabecalho, corpo: encontrado[2] };
}

function normalizarCorpo(corpo) {
  return corpo.replace(
    /## Compatibilidade dual-harness\n[\s\S]*?\n\nEscopo:/,
    `## Coordenação entre harnesses
- Estas instruções são a fonte comum dos agentes de Claude Code, OpenCode e Codex. Não as altere diretamente nos diretórios específicos: atualize este arquivo e execute \`node scripts/gerar-agentes-harness.mjs\`.
- Antes de agir, leia \`CLAUDE.md\` e os documentos indicados neste papel. Em caso de conflito, a constituição e o contrato da API prevalecem.
- Não execute ações destrutivas, migrações, downloads ou operações caras sem que a sessão principal confirme o plano em português simples.
- Não delegue trabalho a outro agente: a sessão principal coordena as dependências e limita o paralelismo a tarefas realmente independentes.

Escopo:`,
  );
}

function escaparToml(valor) {
  return valor.replaceAll('"', '\\"');
}

async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

await Promise.all([mkdir(fontes, { recursive: true }), mkdir(codex, { recursive: true })]);

for (const [nome, papel] of Object.entries(papeis)) {
  const arquivoFonte = path.join(fontes, `${nome}.md`);
  if (!(await existe(arquivoFonte))) {
    const anterior = lerFrente(await readFile(path.join(claude, `${nome}.md`), "utf8"));
    const fonte = `---\nname: ${anterior.name}\ndescription: ${anterior.description}\n---\n\n${normalizarCorpo(anterior.corpo)}`;
    await writeFile(arquivoFonte, fonte);
  }

  const agente = lerFrente(await readFile(arquivoFonte, "utf8"));
  const cabecalhoClaude = `---\nname: ${agente.name}\ndescription: ${agente.description}\ntools: ${papel.claudeTools}\nmodel: claude-sonnet-5\n---\n\n`;
  const cabecalhoOpenCode = `---\nname: ${agente.name}\ndescription: ${agente.description}\nmode: subagent\nmodel: openrouter/deepseek/deepseek-v4-flash-0731\n---\n\n`;
  const agenteCodex = `name = "${agente.name}"\ndescription = "${escaparToml(agente.description)}"\nmodel = "gpt-5.6-terra"\nmodel_reasoning_effort = "${papel.codexEffort}"\nsandbox_mode = "workspace-write"\ndeveloper_instructions = """\n${agente.corpo.trim()}\n"""\n`;

  await Promise.all([
    writeFile(path.join(claude, `${nome}.md`), cabecalhoClaude + agente.corpo),
    writeFile(path.join(openCode, `${nome}.md`), cabecalhoOpenCode + agente.corpo),
    writeFile(path.join(codex, `${nome}.toml`), agenteCodex),
  ]);
}

console.log(`Agentes gerados a partir de ${path.relative(raiz, fontes)}.`);
