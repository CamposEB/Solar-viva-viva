import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';
import { validarItem, conferirReferencias, statementsFotos } from '../_loja.js';

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const { v, fotos, erro: msg } = validarItem(b);
  if (msg) return error(msg);

  const existe = await env.DB.prepare('SELECT 1 AS ok FROM loja_itens WHERE id = ?').bind(id).first();
  if (!existe) return error('Item não encontrado.', 404);

  const ref = await conferirReferencias(env, v, fotos);
  if (ref) return error(ref);

  try {
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE loja_itens SET
          nome = ?, categoria_id = ?, tipo = ?, descricao = ?, preco_venda = ?, preco_aluguel = ?,
          unidade_aluguel = ?, tamanhos = ?, cor = ?, estoque = ?, ordem = ?, destaque = ?, ativo = ?,
          atualizado_em = datetime('now')
        WHERE id = ?
      `).bind(
        v.nome, v.categoria_id, v.tipo, v.descricao, v.preco_venda, v.preco_aluguel,
        v.unidade_aluguel, v.tamanhos, v.cor, v.estoque, v.ordem, v.destaque, v.ativo, id
      ),
      env.DB.prepare('DELETE FROM loja_fotos WHERE item_id = ?').bind(id),
      ...statementsFotos(env, id, fotos),
    ]);
    return json({ ok: true });
  } catch (e) {
    console.error('loja PUT', e);
    return error('Não foi possível salvar o item.', 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');

  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM loja_fotos WHERE item_id = ?').bind(id),
      env.DB.prepare('DELETE FROM loja_itens WHERE id = ?').bind(id),
    ]);
    return json({ ok: true });
  } catch (e) {
    console.error('loja DELETE', e);
    return error('Não foi possível excluir o item.', 500);
  }
}