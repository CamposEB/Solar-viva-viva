import { json, error, exigirAdmin, validarOrigem } from '../_utils.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB por arquivo
const MIMES_OK = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

export async function onRequestGet({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;

  const r = await env.DB.prepare(
    `SELECT * FROM midia ORDER BY criado_em DESC LIMIT 200`
  ).all();

  return json({
    itens: (r.results || []).map((m) => ({ ...m, url: `/api/media/${m.chave}` })),
  });
}

export async function onRequestPost({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error('Origem inválida.', 403);

  let form;
  try { form = await request.formData(); } catch { return error('Formulário inválido.'); }

  const arquivo = form.get('arquivo');
  if (!arquivo || typeof arquivo === 'string') return error('Arquivo ausente.');
  if (!MIMES_OK.has(arquivo.type)) return error(`Tipo não permitido: ${arquivo.type}`);
  if (arquivo.size > MAX_BYTES) return error(`Arquivo maior que ${MAX_BYTES / 1024 / 1024} MB.`);

  const ext = (arquivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const chave = `media_${crypto.randomUUID()}.${ext}`;

  const buffer = await arquivo.arrayBuffer();
  await env.BUCKET.put(chave, buffer, {
    httpMetadata: { contentType: arquivo.type },
  });

  const ins = await env.DB.prepare(`
    INSERT INTO midia (chave, nome_original, tipo, mime, tamanho)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    chave,
    arquivo.name,
    arquivo.type.startsWith('video') ? 'video' : 'imagem',
    arquivo.type,
    arquivo.size
  ).run();

  return json({ ok: true, id: ins.meta.last_row_id, chave, url: `/api/media/${chave}` });
}