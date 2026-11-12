import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get('todos') === '1';

  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r = await env.DB.prepare(`
      SELECT g.*, m.chave AS midia_chave 
      FROM galeria g JOIN midia m ON m.id = g.midia_id 
      ORDER BY g.ordem ASC, g.id DESC
    `).all();
    return json({ itens: r.results || [] });
  }

  const r = await env.DB.prepare(`
    SELECT g.*, m.chave AS midia_chave 
    FROM galeria g JOIN midia m ON m.id = g.midia_id 
    WHERE g.ativo = 1 
    ORDER BY g.ordem ASC, g.id DESC
  `).all();
  return json({ itens: r.results || [] });
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  if (!b.midia_id) return error('Imagem obrigatória.');

  const r = await env.DB.prepare(`
    INSERT INTO galeria (midia_id, legenda, ordem, ativo)
    VALUES (?, ?, ?, ?)
  `).bind(
    b.midia_id,
    b.legenda ? String(b.legenda).trim() : null,
    parseInt(b.ordem, 10) || 0,
    b.ativo === false ? 0 : 1
  ).run();

  return json({ ok: true, id: r.meta.last_row_id });
}