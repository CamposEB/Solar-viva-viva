import { json } from './_utils.js';

export async function onRequestGet({ env }) {
  const hoje = new Date().toISOString().slice(0, 10);

  const [comunicados, letreiro, promocoes] = await Promise.all([
    env.DB.prepare(`
      SELECT id, titulo, descricao, publicado_em, encerra_em, destaque
      FROM comunicados
      WHERE ativo = 1
        AND (publicado_em IS NULL OR publicado_em <= ?)
        AND (encerra_em  IS NULL OR encerra_em  >= ?)
      ORDER BY destaque DESC, COALESCE(publicado_em, '0000-00-00') DESC, id DESC
      LIMIT 30
    `).bind(hoje, hoje).all(),

    env.DB.prepare(`SELECT texto, ativo, velocidade FROM letreiro WHERE id = 1`).first(),

    env.DB.prepare(`
      SELECT p.id, p.titulo, p.descricao, p.data_inicio, p.data_fim,
             m.id AS midia_id, m.chave AS midia_chave
      FROM promocoes p LEFT JOIN midia m ON m.id = p.imagem_id
      WHERE p.ativo = 1
        AND p.data_inicio <= ?
        AND (p.data_fim IS NULL OR p.data_fim >= ?)
      ORDER BY p.data_inicio DESC, p.id DESC
      LIMIT 30
    `).bind(hoje, hoje).all(),
  ]);

  return json({
    comunicados: comunicados.results || [],
    letreiro: letreiro || null,
    promocoes: (promocoes.results || []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao,
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
      imagem_url: p.midia_chave ? `/api/media/${p.midia_chave}` : null,
    })),
    atualizado_em: new Date().toISOString(),
  }, 200, {
    'Cache-Control': 'public, max-age=20, s-maxage=20, stale-while-revalidate=60',
  });
}