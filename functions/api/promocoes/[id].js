import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const titulo = String(b.titulo || '').trim();
  if (titulo.length < 2) return error('Título muito curto.');
  if (!b.data_inicio) return error('Data inicial obrigatória.');

  await env.DB.prepare(`
    UPDATE promocoes
    SET titulo = ?, descricao = ?, imagem_id = ?,
        data_inicio = ?, data_fim = ?, ativo = ?
    WHERE id = ?
  `).bind(
    titulo,
    b.descricao ? String(b.descricao).trim() : null,
    b.imagem_id ? parseInt(b.imagem_id, 10) : null,
    b.data_inicio,
    b.data_fim || null,
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
  await env.DB.prepare(`DELETE FROM promocoes WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}