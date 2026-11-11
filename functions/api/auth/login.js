import { json, error, verificarSenha, gerarToken, cookieSessao } from '../_utils.js';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 dias em segundos

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return error('JSON inválido.'); }

  const usuario = String(body.usuario || '').trim();
  const senha   = String(body.senha || '');
  if (!usuario || !senha) return error('Informe usuário e senha.');

  const ip = request.headers.get('CF-Connecting-IP') || 'local';

  // Rate limit
  const tent = await env.DB.prepare(
    `SELECT tentativas, bloqueado_ate FROM login_tentativas WHERE ip = ?`
  ).bind(ip).first();

  if (tent?.bloqueado_ate) {
    const bloqueado = new Date(tent.bloqueado_ate + 'Z').getTime();
    if (Date.now() < bloqueado) {
      return error('Muitas tentativas. Tente novamente em alguns minutos.', 429);
    }
  }

  const admin = await env.DB.prepare(
    `SELECT id, usuario, senha_hash FROM admins WHERE usuario = ?`
  ).bind(usuario).first();

  const ok = admin ? await verificarSenha(senha, admin.senha_hash) : false;

  if (!ok) {
    const novas = (tent?.tentativas || 0) + 1;
    const bloqueadoAte = novas >= MAX_TENTATIVAS
      ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60000).toISOString().slice(0, 19).replace('T', ' ')
      : null;
    await env.DB.prepare(`
      INSERT INTO login_tentativas (ip, tentativas, bloqueado_ate) VALUES (?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET tentativas = excluded.tentativas, bloqueado_ate = excluded.bloqueado_ate
    `).bind(ip, novas, bloqueadoAte).run();
    return error('Usuário ou senha inválidos.', 401);
  }

  await env.DB.prepare(`DELETE FROM login_tentativas WHERE ip = ?`).bind(ip).run();
  await env.DB.prepare(`DELETE FROM sessoes WHERE expira_em <= datetime('now')`).run();

  const token = gerarToken();
  await env.DB.prepare(`
    INSERT INTO sessoes (token, admin_id, expira_em)
    VALUES (?, ?, datetime('now', '+${SESSION_MAX_AGE} seconds'))
  `).bind(token, admin.id).run();

  return json({ ok: true, usuario: admin.usuario }, 200, {
    'Set-Cookie': cookieSessao(token, SESSION_MAX_AGE),
  });
}