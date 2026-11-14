import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

function nomeCategoria(b) {
  const nome = String((b && b.nome) || '').trim();
  return nome.length >= 2 && nome.length <= 40 ? nome : null;
}

export async function onRequestGet({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  try {
    const r = await env.DB.prepare('SELECT id, nome FROM loja_categorias ORDER BY nome COLLATE NOCASE').all();
    return json({ itens: r.results || [] }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('categorias GET', e);
    return error('Loja indisponível. Confira se a migração do banco foi executada.', 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  const nome = nomeCategoria(b);
  if (!nome) return error('O nome da categoria deve ter de 2 a 40 caracteres.');

  try {
    const r = await env.DB.prepare('INSERT INTO loja_categorias (nome) VALUES (?)').bind(nome).run();
    return json({ ok: true, id: r.meta.last_row_id });
  } catch (e) {
    if (String(e && e.message).includes('UNIQUE')) return error('Já existe uma categoria com esse nome.', 409);
    console.error('categorias POST', e);
    return error('Não foi possível salvar a categoria.', 500);
  }
}