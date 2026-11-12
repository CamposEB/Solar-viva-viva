import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  const id = parseInt(params.id, 10);
  let b;
  try { b = await request.json(); } catch { return error('JSON inválido.'); }
  if (!b.pergunta || !b.resposta) return error('Preencha pergunta e resposta.');
  await env.DB.prepare(`UPDATE faq SET pergunta = ?, resposta = ?, ordem = ?, ativo = ? WHERE id = ?`).bind(String(b.pergunta).trim(), String(b.resposta).trim(), parseInt(b.ordem, 10) || 0, b.ativo === false ? 0 : 1, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);
  const id = parseInt(params.id, 10);
  await env.DB.prepare(`DELETE FROM faq WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}