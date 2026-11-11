import { error } from '../_utils.js';

export async function onRequestGet({ env, params }) {
  const chave = params.chave;
  if (!chave) return error('Chave ausente.', 404);

  try {
    const obj = await env.BUCKET.get(chave);
    if (!obj) return error('Imagem não encontrada no R2.', 404);

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/octet-stream');
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(obj.body, { headers });
  } catch (err) {
    return error('Erro interno ao buscar mídia.', 500);
  }
}