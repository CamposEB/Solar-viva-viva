import { json, lerCookie, cookieLimpar } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const token = lerCookie(request, 'sessao');
  if (token) {
    await env.DB.prepare(`DELETE FROM sessoes WHERE token = ?`).bind(token).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookieLimpar() });
}