import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  const midia = await env.DB.prepare(`SELECT chave FROM midia WHERE id = ?`).bind(id).first();
  if (!midia) return error('Mídia não encontrada.', 404);

  await env.DB.prepare(`UPDATE promocoes SET imagem_id = NULL WHERE imagem_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM midia WHERE id = ?`).bind(id).run();

  try { await env.BUCKET.delete(midia.chave); } catch {}

  return json({ ok: true });
}