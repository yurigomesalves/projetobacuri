import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const modelo = "Xenova/multilingual-e5-small";
const revisao = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
const arquivos = ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "onnx/model.onnx", "README.md"];
const pasta = resolve(".cache/modelos", modelo);

async function hash(caminho) {
  const sha = createHash("sha256");
  for await (const parte of createReadStream(caminho)) sha.update(parte);
  return sha.digest("hex");
}

if (!process.env.VERCEL && !process.argv.includes("--local")) {
  console.log("Modelo local: preparação dispensada fora da Vercel; use npm run preparar:embedding se necessário.");
} else {
  let anterior;
  try { anterior = JSON.parse(await readFile(resolve(pasta, "manifesto.json"), "utf8")); } catch { /* primeiro build */ }
  const registros = [];
  for (const arquivo of arquivos) {
    const caminho = resolve(pasta, arquivo);
    const registro = anterior?.revisao === revisao ? anterior.arquivos?.find((a) => a.arquivo === arquivo) : null;
    let valido = false;
    if (registro) {
      try { valido = await hash(caminho) === registro.sha256; } catch { /* baixar arquivo ausente */ }
    }
    if (!valido) {
      await mkdir(dirname(caminho), { recursive: true });
      const resposta = await fetch(`https://huggingface.co/${modelo}/resolve/${revisao}/${arquivo}`, { signal: AbortSignal.timeout(300_000) });
      if (!resposta.ok || !resposta.body) throw new Error(`Falha ao preparar ${arquivo}: HTTP ${resposta.status}`);
      await pipeline(Readable.fromWeb(resposta.body), createWriteStream(`${caminho}.part`));
      await rename(`${caminho}.part`, caminho);
    }
    registros.push({ arquivo, sha256: await hash(caminho) });
    console.log(`Modelo local: ${arquivo} ${valido ? "validado em cache" : "preparado"}`);
  }
  await writeFile(resolve(pasta, "manifesto.json"), JSON.stringify({ modelo, revisao, dtype: "fp32", arquivos: registros }, null, 2));
}
