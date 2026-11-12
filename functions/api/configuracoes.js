import { json, error, exigirAdmin, validarOrigem } from './_utils.js';

export async function onRequestGet({ env }) {
  const r = await env.DB.prepare(`SELECT chave, valor FROM configuracoes`).all();
  const config = {};
  (r.results || []).forEach(row => { config[row.chave] = row.valor; });
  return json(config);
}

export async function onRequestPut({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  const stmt = env.DB.prepare(`INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`);
  for (const [chave, valor] of Object.entries(b)) {
    await stmt.bind(chave, String(valor)).run();
  }
  return json({ ok: true });
}