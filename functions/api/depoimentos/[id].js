import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');
  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  const nome = String(b.nome || '').trim();
  const texto = String(b.texto || '').trim();
  if (nome.length < 2 || texto.length < 5) return error('Dados inválidos.');
  await env.DB.prepare(`UPDATE depoimentos SET nome = ?, texto = ?, tipo_evento = ?, ativo = ? WHERE id = ?`).bind(nome, texto, b.tipo_evento ? String(b.tipo_evento).trim() : null, b.ativo === false ? 0 : 1, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  const id = parseInt(params.id, 10);
  if (!id) return error('ID inválido.');
  await env.DB.prepare(`DELETE FROM depoimentos WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}