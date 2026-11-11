import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get('todos') === '1';

  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r = await env.DB.prepare(`
      SELECT p.*, m.chave AS midia_chave
      FROM promocoes p LEFT JOIN midia m ON m.id = p.imagem_id
      ORDER BY p.data_inicio DESC, p.id DESC
    `).all();
    return json({ itens: (r.results || []).map((p) => ({
      ...p, imagem_url: p.midia_chave ? `/api/media/${p.midia_chave}` : null,
    })) });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const r = await env.DB.prepare(`
    SELECT p.*, m.chave AS midia_chave
    FROM promocoes p LEFT JOIN midia m ON m.id = p.imagem_id
    WHERE p.ativo = 1 AND p.data_inicio <= ?
      AND (p.data_fim IS NULL OR p.data_fim >= ?)
    ORDER BY p.data_inicio DESC, p.id DESC
  `).bind(hoje, hoje).all();

  return json({ itens: (r.results || []).map((p) => ({
    ...p, imagem_url: p.midia_chave ? `/api/media/${p.midia_chave}` : null,
  })) });
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const titulo = String(b.titulo || '').trim();
  if (titulo.length < 2) return error('Título muito curto.');
  if (!b.data_inicio) return error('Data inicial obrigatória.');

  const r = await env.DB.prepare(`
    INSERT INTO promocoes (titulo, descricao, imagem_id, data_inicio, data_fim, ativo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    titulo,
    b.descricao ? String(b.descricao).trim() : null,
    b.imagem_id ? parseInt(b.imagem_id, 10) : null,
    b.data_inicio,
    b.data_fim || null,
    b.ativo === false ? 0 : 1
  ).run();

  return json({ ok: true, id: r.meta.last_row_id });
}