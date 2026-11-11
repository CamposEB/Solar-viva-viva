import { json, error, exigirAdmin, validarOrigem } from './_utils.js';

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare(
    `SELECT texto, ativo, velocidade FROM letreiro WHERE id = 1`
  ).first();
  return json(row || { texto: '', ativo: 0, velocidade: 80 });
}

export async function onRequestPut({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }

  const texto = String(b.texto || '').trim();
  const ativo = b.ativo ? 1 : 0;
  let velocidade = parseInt(b.velocidade, 10);
  if (!Number.isFinite(velocidade)) velocidade = 80;
  velocidade = Math.max(20, Math.min(200, velocidade));

  await env.DB.prepare(`
    INSERT INTO letreiro (id, texto, ativo, velocidade, atualizado_em)
    VALUES (1, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      texto = excluded.texto, ativo = excluded.ativo,
      velocidade = excluded.velocidade, atualizado_em = excluded.atualizado_em
  `).bind(texto, ativo, velocidade).run();

  return json({ ok: true });
}