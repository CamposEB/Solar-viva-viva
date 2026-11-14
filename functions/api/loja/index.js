import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';
import { validarItem, conferirReferencias, statementsFotos, listarFotos } from '../_loja.js';

export async function onRequestGet({ request, env }) {
  const todos = new URL(request.url).searchParams.get('todos') === '1';
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
  }

  try {
    const [itens, fotos] = await Promise.all([
      env.DB.prepare(`
        SELECT i.*, c.nome AS categoria_nome
        FROM loja_itens i LEFT JOIN loja_categorias c ON c.id = i.categoria_id
        ${todos ? '' : 'WHERE i.ativo = 1'}
        ORDER BY i.destaque DESC, i.ordem ASC, i.id DESC
      `).all(),
      listarFotos(env),
    ]);

    const lista = (itens.results || []).map((i) => {
      const f = fotos.get(i.id) || [];
      if (todos) {
        return { ...i, destaque: !!i.destaque, ativo: !!i.ativo, fotos: f.map((x) => x.midia_id) };
      }
      return {
        id: i.id,
        nome: i.nome,
        categoria_id: i.categoria_id,
        categoria: i.categoria_nome,
        tipo: i.tipo,
        descricao: i.descricao,
        preco_venda: i.preco_venda,
        preco_aluguel: i.preco_aluguel,
        unidade_aluguel: i.unidade_aluguel,
        tamanhos: i.tamanhos,
        cor: i.cor,
        destaque: !!i.destaque,
        disponivel: i.estoque > 0,
        fotos: f.map((x) => `/api/media/${x.chave}`),
      };
    });

    return json(
      { itens: lista },
      200,
      { 'Cache-Control': todos ? 'no-store' : 'public, max-age=20, s-maxage=20, stale-while-revalidate=60' }
    );
  } catch (e) {
    console.error('loja GET', e);
    return error('Loja indisponível. Confira se a migração do banco foi executada.', 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const { v, fotos, erro: msg } = validarItem(b);
  if (msg) return error(msg);
  const ref = await conferirReferencias(env, v, fotos);
  if (ref) return error(ref);

  try {
    const r = await env.DB.prepare(`
      INSERT INTO loja_itens
        (nome, categoria_id, tipo, descricao, preco_venda, preco_aluguel, unidade_aluguel,
         tamanhos, cor, estoque, ordem, destaque, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      v.nome, v.categoria_id, v.tipo, v.descricao, v.preco_venda, v.preco_aluguel, v.unidade_aluguel,
      v.tamanhos, v.cor, v.estoque, v.ordem, v.destaque, v.ativo
    ).run();

    const id = r.meta.last_row_id;
    if (fotos.length) await env.DB.batch(statementsFotos(env, id, fotos));
    return json({ ok: true, id });
  } catch (e) {
    console.error('loja POST', e);
    return error('Não foi possível salvar o item.', 500);
  }
}