import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const estado = JSON.parse(readFileSync(new URL('../.local/comunidade/status.json', import.meta.url), 'utf8'));
const url = new URL(estado.API_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '54321') {
  throw new Error('O ambiente de testes exige o Supabase local na porta 54321.');
}
if (!estado.ANON_KEY || !estado.SERVICE_ROLE_KEY) throw new Error('Credenciais locais ausentes.');
const processo = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3002', '--hostname', '127.0.0.1'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: estado.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: estado.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: estado.SERVICE_ROLE_KEY,
    BACURI_AMBIENTE_LOCAL: 'true', BACURI_COMUNIDADE_ATIVA: 'true',
    BACURI_OURO_CHAT_ATIVO: 'false', BACURI_CHAVE_COMPARTILHAMENTO: randomBytes(32).toString('hex'),
    LLM_PROVIDER: 'ollama', OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    OLLAMA_API_KEY: '', GROQ_API_KEY: '', OPENROUTER_API_KEY: '', OPENAI_API_KEY: '',
    VERCEL: '',
  },
});
processo.on('exit', codigo => { process.exitCode = codigo ?? 1; });
process.on('SIGINT', () => processo.kill('SIGINT'));
process.on('SIGTERM', () => processo.kill('SIGTERM'));
