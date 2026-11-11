import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const titulo    = String(b.titulo || '').trim();
  const descricao = String(b.descricao || '').trim();
  if (titulo.length < 2)    return error('Título muito curto.');
  if (descricao.length < 2) return error('Descrição muito curta.');

  await env.DB.prepare(`
    UPDATE comunicados
    SET titulo = ?, descricao = ?, publicado_em = ?, encerra_em = ?,
        destaque = ?, ativo = ?, atualizado_em = datetime('now')
    WHERE id = ?
  `).bind(
    titulo, descricao,
    b.publicado_em || null, b.encerra_em || null,
    b.destaque ? 1 : 0, b.ativo === false ? 0 : 1, id
  ).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  await env.DB.prepare(`DELETE FROM comunicados WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}