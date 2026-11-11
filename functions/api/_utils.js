// Utilitários compartilhados por todas as Pages Functions.
// Arquivos começando com "_" são ignorados pelo roteador do Pages.

export const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

export function error(mensagem, status = 400) {
  return json({ erro: mensagem }, status);
}

const PBKDF2_ITER = 150000;

function b64FromBytes(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}

function bytesFromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function hashSenha(senha) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    key, 256
  );
  return `pbkdf2$${PBKDF2_ITER}$${b64FromBytes(salt)}$${b64FromBytes(bits)}`;
}

export async function verificarSenha(senha, hashArmazenado) {
  try {
    const [algo, iterStr, saltB64, hashB64] = String(hashArmazenado).split('$');
    if (algo !== 'pbkdf2') return false;
    const iter = parseInt(iterStr, 10) || PBKDF2_ITER;
    const salt = bytesFromB64(saltB64);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
      key, 256
    );
    return b64FromBytes(bits) === hashB64;
  } catch {
    return false;
  }
}

export function gerarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function lerCookie(request, nome) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|; )${nome}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function cookieSessao(token, maxAge) {
  return `sessao=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function cookieLimpar() {
  return `sessao=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function adminAtual(request, env) {
  const token = lerCookie(request, 'sessao');
  if (!token) return null;
  try {
    return await env.DB.prepare(`
      SELECT a.id, a.usuario
      FROM sessoes s JOIN admins a ON a.id = s.admin_id
      WHERE s.token = ? AND s.expira_em > datetime('now')
    `).bind(token).first();
  } catch {
    return null;
  }
}

export async function exigirAdmin(request, env) {
  const admin = await adminAtual(request, env);
  if (!admin) return { erro: error('Não autorizado.', 401) };
  return { admin };
}

export function validarOrigem(request) {
  const origin = request.headers.get('Origin');
  const host = request.headers.get('Host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return false;
  return true;
}