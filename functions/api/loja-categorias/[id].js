import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

function nomeValido(b) {
  const nome = String((b && b.nome) || '').trim();
  return nome.length >= 2 && nome.length <= 40 ? nome : null;
}

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  const nome = nomeValido(b);
  if (!nome) return error('O nome da categoria deve ter de 2 a 40 caracteres.');

  try {
    const r = await env.DB.prepare('UPDATE loja_categorias SET nome = ? WHERE id = ?').bind(nome, id).run();
    if (!r.meta.changes) return error('Categoria não encontrada.', 404);
    return json({ ok: true });
  } catch (e) {
    if (String(e && e.message).includes('UNIQUE')) return error('Já existe uma categoria com esse nome.', 409);
    console.error('categorias PUT', e);
    return error('Não foi possível salvar a categoria.', 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  try {
    // Os itens da categoria ficam "sem categoria"
    await env.DB.batch([
      env.DB.prepare('UPDATE loja_itens SET categoria_id = NULL WHERE categoria_id = ?').bind(id),
      env.DB.prepare('DELETE FROM loja_categorias WHERE id = ?').bind(id),
    ]);
    return json({ ok: true });
  } catch (e) {
    console.error('categorias DELETE', e);
    return error('Não foi possível excluir a categoria.', 500);
  }
}