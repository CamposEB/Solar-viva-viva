import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get('todos') === '1';

  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r = await env.DB.prepare(
      `SELECT * FROM comunicados ORDER BY destaque DESC, COALESCE(publicado_em, '0000-00-00') DESC, id DESC`
    ).all();
    return json({ itens: r.results || [] });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const r = await env.DB.prepare(`
    SELECT * FROM comunicados
    WHERE ativo = 1
      AND (publicado_em IS NULL OR publicado_em <= ?)
      AND (encerra_em  IS NULL OR encerra_em  >= ?)
    ORDER BY destaque DESC, COALESCE(publicado_em, '0000-00-00') DESC, id DESC
  `).bind(hoje, hoje).all();
  return json({ itens: r.results || [] });
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const titulo    = String(b.titulo || '').trim();
  const descricao = String(b.descricao || '').trim();
  if (titulo.length < 2)    return error('Título muito curto.');
  if (descricao.length < 2) return error('Descrição muito curta.');

  const r = await env.DB.prepare(`
    INSERT INTO comunicados (titulo, descricao, publicado_em, encerra_em, destaque, ativo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    titulo, descricao,
    b.publicado_em || null, b.encerra_em || null,
    b.destaque ? 1 : 0, b.ativo === false ? 0 : 1
  ).run();

  return json({ ok: true, id: r.meta.last_row_id });
}