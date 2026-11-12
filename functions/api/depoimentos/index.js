import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get('todos') === '1';
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r = await env.DB.prepare(`SELECT * FROM depoimentos ORDER BY criado_em DESC`).all();
    return json({ itens: r.results || [] });
  }
  const r = await env.DB.prepare(`SELECT * FROM depoimentos WHERE ativo = 1 ORDER BY criado_em DESC LIMIT 20`).all();
  return json({ itens: r.results || [] });
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  const nome = String(b.nome || '').trim();
  const texto = String(b.texto || '').trim();
  if (nome.length < 2 || texto.length < 5) return error('Dados inválidos.');
  const r = await env.DB.prepare(`INSERT INTO depoimentos (nome, texto, tipo_evento, ativo) VALUES (?, ?, ?, ?)`).bind(nome, texto, b.tipo_evento ? String(b.tipo_evento).trim() : null, b.ativo === false ? 0 : 1).run();
  return json({ ok: true, id: r.meta.last_row_id });
}