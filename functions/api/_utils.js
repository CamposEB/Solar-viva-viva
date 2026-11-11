// Utilitários compartilhados por todas as Pages Functions.

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

// SOLUÇÃO DEFINITIVA: SHA-256 direto (instantâneo no Cloudflare)
export async function hashSenha(senha) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(senha));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verificarSenha(senha, hashArmazenado) {
  const hashCalculado = await hashSenha(senha);
  return hashCalculado === hashArmazenado;
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