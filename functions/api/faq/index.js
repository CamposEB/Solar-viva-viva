import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get('todos') === '1';
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r = await env.DB.prepare(`SELECT * FROM faq ORDER BY ordem ASC, id DESC`).all();
    return json({ itens: r.results || [] });
  }
  const r = await env.DB.prepare(`SELECT * FROM faq WHERE ativo = 1 ORDER BY ordem ASC, id DESC`).all();
  return json({ itens: r.results || [] });
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  if (!b.pergunta || !b.resposta) return error('Preencha pergunta e resposta.');
  const r = await env.DB.prepare(`INSERT INTO faq (pergunta, resposta, ordem, ativo) VALUES (?, ?, ?, ?)`).bind(String(b.pergunta).trim(), String(b.resposta).trim(), parseInt(b.ordem, 10) || 0, b.ativo === false ? 0 : 1).run();
  return json({ ok: true, id: r.meta.last_row_id });
}