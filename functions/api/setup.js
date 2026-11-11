import { json, error, hashSenha } from './_utils.js';

export async function onRequestPost({ request, env }) {
  if (!env.SETUP_SECRET) return error('Setup desabilitado (defina SETUP_SECRET).', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  if (String(b.segredo || '') !== env.SETUP_SECRET) return error('Segredo inválido.', 403);

  const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admins`).first();
  if (count && count.n > 0) return error('Já existe administrador cadastrado.', 403);

  const usuario = String(b.usuario || '').trim();
  const senha   = String(b.senha || '');
  if (usuario.length < 3) return error('Usuário muito curto (mín. 3).');
  if (senha.length   < 8) return error('Senha muito curta (mín. 8).');

  const hash = await hashSenha(senha);
  await env.DB.prepare(`INSERT INTO admins (usuario, senha_hash) VALUES (?, ?)`).bind(usuario, hash).run();
  return json({ ok: true });
}