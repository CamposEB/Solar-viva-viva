import { json, error, exigirAdmin, validarOrigem, hashSenha, verificarSenha } from '../_utils.js';

export async function onRequestPut({ request, env }) {
  const { erro, admin } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const senhaAtual = String(b.senha_atual || '');
  const senhaNova = String(b.senha_nova || '');

  if (senhaNova.length < 6) return error('A nova senha deve ter pelo menos 6 caracteres.');

  const dbAdmin = await env.DB.prepare(`SELECT senha_hash FROM admins WHERE id = ?`).bind(admin.id).first();
  const senhaCorreta = await verificarSenha(senhaAtual, dbAdmin.senha_hash);
  if (!senhaCorreta) return error('Senha atual incorreta.', 401);

  const novoHash = await hashSenha(senhaNova);
  await env.DB.prepare(`UPDATE admins SET senha_hash = ? WHERE id = ?`).bind(novoHash, admin.id).run();

  return json({ ok: true });
}