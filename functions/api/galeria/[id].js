import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  if (!b.midia_id) return error('Imagem obrigatória.');

  await env.DB.prepare(`
    UPDATE galeria 
    SET midia_id = ?, legenda = ?, ordem = ?, ativo = ?
    WHERE id = ?
  `).bind(
    b.midia_id,
    b.legenda ? String(b.legenda).trim() : null,
    parseInt(b.ordem, 10) || 0,
    b.ativo === false ? 0 : 1,
    id
  ).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');
  
  await env.DB.prepare(`DELETE FROM galeria WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}