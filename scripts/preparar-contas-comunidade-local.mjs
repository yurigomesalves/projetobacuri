import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const pasta = new URL('../.local/comunidade/', import.meta.url);
const estado = JSON.parse(readFileSync(new URL('status.json', pasta), 'utf8'));
const url = new URL(estado.API_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '54321') throw new Error('Somente banco local permitido.');
const banco = createClient(estado.API_URL, estado.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
function conferir({ data, error }) { if (error) throw error; return data; }
const existentes = conferir(await banco.auth.admin.listUsers()).users;
const contas = [];
for (const tag of ['participante_teste', 'curador_teste_1', 'curador_teste_2', 'curador_teste_3']) {
  const email = `${tag}@bacuri.test`;
  if (existentes.some(u => u.email === email)) continue;
  const senha = randomBytes(12).toString('base64url');
  const { user } = conferir(await banco.auth.admin.createUser({ email, password: senha, email_confirm: true }));
  conferir(await banco.rpc('comunidade_executar', { p_acao: 'salvar_perfil', p_ator: user.id,
    p_dados: { tag: `@${tag}`, nome_publico: tag, bio: 'Conta demonstrativa do ambiente local.', aceita_termos: true } }));
  if (tag.startsWith('curador')) conferir(await banco.from('curadores').insert({ user_id: user.id,
    nome: tag, email, papel: 'curador', organizacao: 'Ambiente local de testes' }));
  contas.push({ email, senha, papel: tag.startsWith('curador') ? 'curador de teste' : 'participante de teste' });
}
if (contas.length) {
  const arquivo = new URL('contas.json', pasta);
  let anteriores = []; try { anteriores = JSON.parse(readFileSync(arquivo, 'utf8')); } catch {}
  writeFileSync(arquivo, JSON.stringify([...anteriores, ...contas], null, 2), { mode: 0o600 });
}
console.log('Contas locais disponíveis em .local/comunidade/contas.json.');
