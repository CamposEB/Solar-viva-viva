var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/_utils.js
var JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}
__name(json, "json");
function error(mensagem, status = 400) {
  return json({ erro: mensagem }, status);
}
__name(error, "error");
async function hashSenha(senha) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(senha));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashSenha, "hashSenha");
async function verificarSenha(senha, hashArmazenado) {
  const hashCalculado = await hashSenha(senha);
  return hashCalculado === hashArmazenado;
}
__name(verificarSenha, "verificarSenha");
function gerarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(gerarToken, "gerarToken");
function lerCookie(request, nome) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|; )${nome}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
__name(lerCookie, "lerCookie");
function cookieSessao(token, maxAge) {
  return `sessao=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
__name(cookieSessao, "cookieSessao");
function cookieLimpar() {
  return `sessao=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
__name(cookieLimpar, "cookieLimpar");
async function adminAtual(request, env) {
  const token = lerCookie(request, "sessao");
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
__name(adminAtual, "adminAtual");
async function exigirAdmin(request, env) {
  const admin = await adminAtual(request, env);
  if (!admin) return { erro: error("N\xE3o autorizado.", 401) };
  return { admin };
}
__name(exigirAdmin, "exigirAdmin");
function validarOrigem(request) {
  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return false;
  return true;
}
__name(validarOrigem, "validarOrigem");

// api/auth/login.js
var MAX_TENTATIVAS = 5;
var BLOQUEIO_MINUTOS = 15;
var SESSION_MAX_AGE = 7 * 24 * 60 * 60;
async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const usuario = String(body.usuario || "").trim();
  const senha = String(body.senha || "");
  if (!usuario || !senha) return error("Informe usu\xE1rio e senha.");
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const tent = await env.DB.prepare(
    `SELECT tentativas, bloqueado_ate FROM login_tentativas WHERE ip = ?`
  ).bind(ip).first();
  if (tent?.bloqueado_ate) {
    const bloqueado = (/* @__PURE__ */ new Date(tent.bloqueado_ate + "Z")).getTime();
    if (Date.now() < bloqueado) {
      return error("Muitas tentativas. Tente novamente em alguns minutos.", 429);
    }
  }
  const admin = await env.DB.prepare(
    `SELECT id, usuario, senha_hash FROM admins WHERE usuario = ?`
  ).bind(usuario).first();
  const ok = admin ? await verificarSenha(senha, admin.senha_hash) : false;
  if (!ok) {
    const novas = (tent?.tentativas || 0) + 1;
    const bloqueadoAte = novas >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MINUTOS * 6e4).toISOString().slice(0, 19).replace("T", " ") : null;
    await env.DB.prepare(`
      INSERT INTO login_tentativas (ip, tentativas, bloqueado_ate) VALUES (?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET tentativas = excluded.tentativas, bloqueado_ate = excluded.bloqueado_ate
    `).bind(ip, novas, bloqueadoAte).run();
    return error("Usu\xE1rio ou senha inv\xE1lidos.", 401);
  }
  await env.DB.prepare(`DELETE FROM login_tentativas WHERE ip = ?`).bind(ip).run();
  await env.DB.prepare(`DELETE FROM sessoes WHERE expira_em <= datetime('now')`).run();
  const token = gerarToken();
  await env.DB.prepare(`
    INSERT INTO sessoes (token, admin_id, expira_em)
    VALUES (?, ?, datetime('now', '+${SESSION_MAX_AGE} seconds'))
  `).bind(token, admin.id).run();
  return json({ ok: true, usuario: admin.usuario }, 200, {
    "Set-Cookie": cookieSessao(token, SESSION_MAX_AGE)
  });
}
__name(onRequestPost, "onRequestPost");

// api/auth/logout.js
async function onRequestPost2({ request, env }) {
  const token = lerCookie(request, "sessao");
  if (token) {
    await env.DB.prepare(`DELETE FROM sessoes WHERE token = ?`).bind(token).run();
  }
  return json({ ok: true }, 200, { "Set-Cookie": cookieLimpar() });
}
__name(onRequestPost2, "onRequestPost");

// api/auth/me.js
async function onRequestGet({ request, env }) {
  const admin = await adminAtual(request, env);
  if (!admin) return json({ autenticado: false }, 401);
  return json({ autenticado: true, usuario: admin.usuario });
}
__name(onRequestGet, "onRequestGet");

// api/auth/senha.js
async function onRequestPut({ request, env }) {
  const { erro, admin } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const senhaAtual = String(b.senha_atual || "");
  const senhaNova = String(b.senha_nova || "");
  if (senhaNova.length < 6) return error("A nova senha deve ter pelo menos 6 caracteres.");
  const dbAdmin = await env.DB.prepare(`SELECT senha_hash FROM admins WHERE id = ?`).bind(admin.id).first();
  const senhaCorreta = await verificarSenha(senhaAtual, dbAdmin.senha_hash);
  if (!senhaCorreta) return error("Senha atual incorreta.", 401);
  const novoHash = await hashSenha(senhaNova);
  await env.DB.prepare(`UPDATE admins SET senha_hash = ? WHERE id = ?`).bind(novoHash, admin.id).run();
  return json({ ok: true });
}
__name(onRequestPut, "onRequestPut");

// api/comunicados/[id].js
async function onRequestPut2({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const titulo = String(b.titulo || "").trim();
  const descricao = String(b.descricao || "").trim();
  if (titulo.length < 2) return error("T\xEDtulo muito curto.");
  if (descricao.length < 2) return error("Descri\xE7\xE3o muito curta.");
  await env.DB.prepare(`
    UPDATE comunicados
    SET titulo = ?, descricao = ?, publicado_em = ?, encerra_em = ?,
        destaque = ?, ativo = ?, atualizado_em = datetime('now')
    WHERE id = ?
  `).bind(
    titulo,
    descricao,
    b.publicado_em || null,
    b.encerra_em || null,
    b.destaque ? 1 : 0,
    b.ativo === false ? 0 : 1,
    id
  ).run();
  return json({ ok: true });
}
__name(onRequestPut2, "onRequestPut");
async function onRequestDelete({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  await env.DB.prepare(`DELETE FROM comunicados WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
__name(onRequestDelete, "onRequestDelete");

// api/depoimentos/[id].js
async function onRequestPut3({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const nome = String(b.nome || "").trim();
  const texto = String(b.texto || "").trim();
  if (nome.length < 2 || texto.length < 5) return error("Dados inv\xE1lidos.");
  await env.DB.prepare(`UPDATE depoimentos SET nome = ?, texto = ?, tipo_evento = ?, ativo = ? WHERE id = ?`).bind(nome, texto, b.tipo_evento ? String(b.tipo_evento).trim() : null, b.ativo === false ? 0 : 1, id).run();
  return json({ ok: true });
}
__name(onRequestPut3, "onRequestPut");
async function onRequestDelete2({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  await env.DB.prepare(`DELETE FROM depoimentos WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
__name(onRequestDelete2, "onRequestDelete");

// api/faq/[id].js
async function onRequestPut4({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  if (!b.pergunta || !b.resposta) return error("Preencha pergunta e resposta.");
  await env.DB.prepare(`UPDATE faq SET pergunta = ?, resposta = ?, ordem = ?, ativo = ? WHERE id = ?`).bind(String(b.pergunta).trim(), String(b.resposta).trim(), parseInt(b.ordem, 10) || 0, b.ativo === false ? 0 : 1, id).run();
  return json({ ok: true });
}
__name(onRequestPut4, "onRequestPut");
async function onRequestDelete3({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  await env.DB.prepare(`DELETE FROM faq WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
__name(onRequestDelete3, "onRequestDelete");

// api/galeria/[id].js
async function onRequestPut5({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  if (!b.midia_id) return error("Imagem obrigat\xF3ria.");
  await env.DB.prepare(`
    UPDATE galeria 
    SET midia_id = ?, legenda = ?, ordem = ?, ativo = ?
    WHERE id = ?
  `).bind(
    b.midia_id,
    b.legenda ? String(b.legenda).trim() : null,
    parseInt(b.ordem, 10) || 0,
    b.ativo === false ? 0 : 1,
    id
  ).run();
  return json({ ok: true });
}
__name(onRequestPut5, "onRequestPut");
async function onRequestDelete4({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  await env.DB.prepare(`DELETE FROM galeria WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
__name(onRequestDelete4, "onRequestDelete");

// api/media/[chave].js
async function onRequestGet2({ env, params }) {
  const chave = params.chave;
  if (!chave) return error("Chave ausente.", 404);
  try {
    const obj = await env.BUCKET.get(chave);
    if (!obj) return error("Imagem n\xE3o encontrada no R2.", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/octet-stream");
    }
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(obj.body, { headers });
  } catch (err) {
    return error("Erro interno ao buscar m\xEDdia.", 500);
  }
}
__name(onRequestGet2, "onRequestGet");

// api/midia/[id].js
async function onRequestDelete5({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  const midia = await env.DB.prepare(`SELECT chave FROM midia WHERE id = ?`).bind(id).first();
  if (!midia) return error("M\xEDdia n\xE3o encontrada.", 404);
  await env.DB.prepare(`UPDATE promocoes SET imagem_id = NULL WHERE imagem_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM midia WHERE id = ?`).bind(id).run();
  try {
    await env.BUCKET.delete(midia.chave);
  } catch {
  }
  return json({ ok: true });
}
__name(onRequestDelete5, "onRequestDelete");

// api/promocoes/[id].js
async function onRequestPut6({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const titulo = String(b.titulo || "").trim();
  if (titulo.length < 2) return error("T\xEDtulo muito curto.");
  if (!b.data_inicio) return error("Data inicial obrigat\xF3ria.");
  await env.DB.prepare(`
    UPDATE promocoes
    SET titulo = ?, descricao = ?, imagem_id = ?,
        data_inicio = ?, data_fim = ?, ativo = ?
    WHERE id = ?
  `).bind(
    titulo,
    b.descricao ? String(b.descricao).trim() : null,
    b.imagem_id ? parseInt(b.imagem_id, 10) : null,
    b.data_inicio,
    b.data_fim || null,
    b.ativo === false ? 0 : 1,
    id
  ).run();
  return json({ ok: true });
}
__name(onRequestPut6, "onRequestPut");
async function onRequestDelete6({ request, env, params }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  const id = parseInt(params.id, 10);
  if (!id) return error("ID inv\xE1lido.");
  await env.DB.prepare(`DELETE FROM promocoes WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
__name(onRequestDelete6, "onRequestDelete");

// api/comunicados/index.js
async function onRequestGet3({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get("todos") === "1";
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r2 = await env.DB.prepare(
      `SELECT * FROM comunicados ORDER BY destaque DESC, COALESCE(publicado_em, '0000-00-00') DESC, id DESC`
    ).all();
    return json({ itens: r2.results || [] });
  }
  const hoje = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await env.DB.prepare(`
    SELECT * FROM comunicados
    WHERE ativo = 1
      AND (publicado_em IS NULL OR publicado_em <= ?)
      AND (encerra_em  IS NULL OR encerra_em  >= ?)
    ORDER BY destaque DESC, COALESCE(publicado_em, '0000-00-00') DESC, id DESC
  `).bind(hoje, hoje).all();
  return json({ itens: r.results || [] });
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost3({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const titulo = String(b.titulo || "").trim();
  const descricao = String(b.descricao || "").trim();
  if (titulo.length < 2) return error("T\xEDtulo muito curto.");
  if (descricao.length < 2) return error("Descri\xE7\xE3o muito curta.");
  const r = await env.DB.prepare(`
    INSERT INTO comunicados (titulo, descricao, publicado_em, encerra_em, destaque, ativo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    titulo,
    descricao,
    b.publicado_em || null,
    b.encerra_em || null,
    b.destaque ? 1 : 0,
    b.ativo === false ? 0 : 1
  ).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
__name(onRequestPost3, "onRequestPost");

// api/configuracoes.js
async function onRequestGet4({ env }) {
  const r = await env.DB.prepare(`SELECT chave, valor FROM configuracoes`).all();
  const config = {};
  (r.results || []).forEach((row) => {
    config[row.chave] = row.valor;
  });
  return json(config);
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPut7({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const stmt = env.DB.prepare(`INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`);
  for (const [chave, valor] of Object.entries(b)) {
    await stmt.bind(chave, String(valor)).run();
  }
  return json({ ok: true });
}
__name(onRequestPut7, "onRequestPut");

// api/depoimentos/index.js
async function onRequestGet5({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get("todos") === "1";
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r2 = await env.DB.prepare(`SELECT * FROM depoimentos ORDER BY criado_em DESC`).all();
    return json({ itens: r2.results || [] });
  }
  const r = await env.DB.prepare(`SELECT * FROM depoimentos WHERE ativo = 1 ORDER BY criado_em DESC LIMIT 20`).all();
  return json({ itens: r.results || [] });
}
__name(onRequestGet5, "onRequestGet");
async function onRequestPost4({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const nome = String(b.nome || "").trim();
  const texto = String(b.texto || "").trim();
  if (nome.length < 2 || texto.length < 5) return error("Dados inv\xE1lidos.");
  const r = await env.DB.prepare(`INSERT INTO depoimentos (nome, texto, tipo_evento, ativo) VALUES (?, ?, ?, ?)`).bind(nome, texto, b.tipo_evento ? String(b.tipo_evento).trim() : null, b.ativo === false ? 0 : 1).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
__name(onRequestPost4, "onRequestPost");

// api/faq/index.js
async function onRequestGet6({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get("todos") === "1";
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r2 = await env.DB.prepare(`SELECT * FROM faq ORDER BY ordem ASC, id DESC`).all();
    return json({ itens: r2.results || [] });
  }
  const r = await env.DB.prepare(`SELECT * FROM faq WHERE ativo = 1 ORDER BY ordem ASC, id DESC`).all();
  return json({ itens: r.results || [] });
}
__name(onRequestGet6, "onRequestGet");
async function onRequestPost5({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  if (!b.pergunta || !b.resposta) return error("Preencha pergunta e resposta.");
  const r = await env.DB.prepare(`INSERT INTO faq (pergunta, resposta, ordem, ativo) VALUES (?, ?, ?, ?)`).bind(String(b.pergunta).trim(), String(b.resposta).trim(), parseInt(b.ordem, 10) || 0, b.ativo === false ? 0 : 1).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
__name(onRequestPost5, "onRequestPost");

// api/galeria/index.js
async function onRequestGet7({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get("todos") === "1";
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r2 = await env.DB.prepare(`
      SELECT g.*, m.chave AS midia_chave 
      FROM galeria g JOIN midia m ON m.id = g.midia_id 
      ORDER BY g.ordem ASC, g.id DESC
    `).all();
    return json({ itens: r2.results || [] });
  }
  const r = await env.DB.prepare(`
    SELECT g.*, m.chave AS midia_chave 
    FROM galeria g JOIN midia m ON m.id = g.midia_id 
    WHERE g.ativo = 1 
    ORDER BY g.ordem ASC, g.id DESC
  `).all();
  return json({ itens: r.results || [] });
}
__name(onRequestGet7, "onRequestGet");
async function onRequestPost6({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  if (!b.midia_id) return error("Imagem obrigat\xF3ria.");
  const r = await env.DB.prepare(`
    INSERT INTO galeria (midia_id, legenda, ordem, ativo)
    VALUES (?, ?, ?, ?)
  `).bind(
    b.midia_id,
    b.legenda ? String(b.legenda).trim() : null,
    parseInt(b.ordem, 10) || 0,
    b.ativo === false ? 0 : 1
  ).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
__name(onRequestPost6, "onRequestPost");

// api/letreiro.js
async function onRequestGet8({ env }) {
  const row = await env.DB.prepare(
    `SELECT texto, ativo, velocidade FROM letreiro WHERE id = 1`
  ).first();
  return json(row || { texto: "", ativo: 0, velocidade: 80 });
}
__name(onRequestGet8, "onRequestGet");
async function onRequestPut8({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const texto = String(b.texto || "").trim();
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
__name(onRequestPut8, "onRequestPut");

// api/midia/index.js
var MAX_BYTES = 5 * 1024 * 1024;
var MIMES_OK = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "video/mp4"]);
async function onRequestGet9({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  const r = await env.DB.prepare(
    `SELECT * FROM midia ORDER BY criado_em DESC LIMIT 200`
  ).all();
  return json({
    itens: (r.results || []).map((m) => ({ ...m, url: `/api/media/${m.chave}` }))
  });
}
__name(onRequestGet9, "onRequestGet");
async function onRequestPost7({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let form;
  try {
    form = await request.formData();
  } catch {
    return error("Formul\xE1rio inv\xE1lido.");
  }
  const arquivo = form.get("arquivo");
  if (!arquivo || typeof arquivo === "string") return error("Arquivo ausente.");
  if (!MIMES_OK.has(arquivo.type)) return error(`Tipo n\xE3o permitido: ${arquivo.type}`);
  if (arquivo.size > MAX_BYTES) return error(`Arquivo maior que ${MAX_BYTES / 1024 / 1024} MB.`);
  const ext = (arquivo.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const chave = `media_${crypto.randomUUID()}.${ext}`;
  const buffer = await arquivo.arrayBuffer();
  await env.BUCKET.put(chave, buffer, {
    httpMetadata: { contentType: arquivo.type }
  });
  const ins = await env.DB.prepare(`
    INSERT INTO midia (chave, nome_original, tipo, mime, tamanho)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    chave,
    arquivo.name,
    arquivo.type.startsWith("video") ? "video" : "imagem",
    arquivo.type,
    arquivo.size
  ).run();
  return json({ ok: true, id: ins.meta.last_row_id, chave, url: `/api/media/${chave}` });
}
__name(onRequestPost7, "onRequestPost");

// api/promocoes/index.js
async function onRequestGet10({ request, env }) {
  const url = new URL(request.url);
  const todos = url.searchParams.get("todos") === "1";
  if (todos) {
    const { erro } = await exigirAdmin(request, env);
    if (erro) return erro;
    const r2 = await env.DB.prepare(`
      SELECT p.*, m.chave AS midia_chave
      FROM promocoes p LEFT JOIN midia m ON m.id = p.imagem_id
      ORDER BY p.data_inicio DESC, p.id DESC
    `).all();
    return json({ itens: (r2.results || []).map((p) => ({
      ...p,
      imagem_url: p.midia_chave ? `/api/media/${p.midia_chave}` : null
    })) });
  }
  const hoje = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await env.DB.prepare(`
    SELECT p.*, m.chave AS midia_chave
    FROM promocoes p LEFT JOIN midia m ON m.id = p.imagem_id
    WHERE p.ativo = 1 AND p.data_inicio <= ?
      AND (p.data_fim IS NULL OR p.data_fim >= ?)
    ORDER BY p.data_inicio DESC, p.id DESC
  `).bind(hoje, hoje).all();
  return json({ itens: (r.results || []).map((p) => ({
    ...p,
    imagem_url: p.midia_chave ? `/api/media/${p.midia_chave}` : null
  })) });
}
__name(onRequestGet10, "onRequestGet");
async function onRequestPost8({ request, env }) {
  const { erro } = await exigirAdmin(request, env);
  if (erro) return erro;
  if (!validarOrigem(request)) return error("Origem inv\xE1lida.", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  const titulo = String(b.titulo || "").trim();
  if (titulo.length < 2) return error("T\xEDtulo muito curto.");
  if (!b.data_inicio) return error("Data inicial obrigat\xF3ria.");
  const r = await env.DB.prepare(`
    INSERT INTO promocoes (titulo, descricao, imagem_id, data_inicio, data_fim, ativo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    titulo,
    b.descricao ? String(b.descricao).trim() : null,
    b.imagem_id ? parseInt(b.imagem_id, 10) : null,
    b.data_inicio,
    b.data_fim || null,
    b.ativo === false ? 0 : 1
  ).run();
  return json({ ok: true, id: r.meta.last_row_id });
}
__name(onRequestPost8, "onRequestPost");

// api/setup.js
async function onRequestPost9({ request, env }) {
  if (!env.SETUP_SECRET) return error("Setup desabilitado (defina SETUP_SECRET).", 403);
  let b;
  try {
    b = await request.json();
  } catch {
    return error("JSON inv\xE1lido.");
  }
  if (String(b.segredo || "") !== env.SETUP_SECRET) return error("Segredo inv\xE1lido.", 403);
  const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admins`).first();
  if (count && count.n > 0) return error("J\xE1 existe administrador cadastrado.", 403);
  const usuario = String(b.usuario || "").trim();
  const senha = String(b.senha || "");
  if (usuario.length < 3) return error("Usu\xE1rio muito curto (m\xEDn. 3).");
  if (senha.length < 8) return error("Senha muito curta (m\xEDn. 8).");
  const hash = await hashSenha(senha);
  await env.DB.prepare(`INSERT INTO admins (usuario, senha_hash) VALUES (?, ?)`).bind(usuario, hash).run();
  return json({ ok: true });
}
__name(onRequestPost9, "onRequestPost");

// api/site.js
async function onRequestGet11({ env }) {
  const hoje = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const [comunicados, letreiro, promocoes, galeria, depoimentos, configuracoes, faq] = await Promise.all([
    env.DB.prepare(`SELECT id, titulo, descricao, publicado_em, encerra_em, destaque FROM comunicados WHERE ativo = 1 AND (publicado_em IS NULL OR publicado_em <= ?) AND (encerra_em IS NULL OR encerra_em >= ?) ORDER BY destaque DESC, COALESCE(publicado_em, '0000-00-00') DESC, id DESC LIMIT 30`).bind(hoje, hoje).all(),
    env.DB.prepare(`SELECT texto, ativo, velocidade FROM letreiro WHERE id = 1`).first(),
    env.DB.prepare(`SELECT p.id, p.titulo, p.descricao, p.data_inicio, p.data_fim, m.id AS midia_id, m.chave AS midia_chave FROM promocoes p LEFT JOIN midia m ON m.id = p.imagem_id WHERE p.ativo = 1 AND p.data_inicio <= ? AND (p.data_fim IS NULL OR p.data_fim >= ?) ORDER BY p.data_inicio DESC, p.id DESC LIMIT 30`).bind(hoje, hoje).all(),
    env.DB.prepare(`SELECT g.legenda, m.chave AS midia_chave FROM galeria g JOIN midia m ON m.id = g.midia_id WHERE g.ativo = 1 ORDER BY g.ordem ASC, g.id DESC`).all(),
    env.DB.prepare(`SELECT nome, texto, tipo_evento FROM depoimentos WHERE ativo = 1 ORDER BY criado_em DESC LIMIT 20`).all(),
    env.DB.prepare(`SELECT chave, valor FROM configuracoes`).all(),
    env.DB.prepare(`SELECT id, pergunta, resposta FROM faq WHERE ativo = 1 ORDER BY ordem ASC, id DESC`).all()
  ]);
  const configObj = {};
  (configuracoes.results || []).forEach((c) => {
    configObj[c.chave] = c.valor;
  });
  return json({
    comunicados: comunicados.results || [],
    letreiro: letreiro || null,
    promocoes: (promocoes.results || []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao,
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
      imagem_url: p.midia_chave ? `/api/media/${p.midia_chave}` : null
    })),
    galeria: (galeria.results || []).map((g) => ({ url: `/api/media/${g.midia_chave}`, legenda: g.legenda })),
    depoimentos: depoimentos.results || [],
    faq: faq.results || [],
    configuracoes: configObj,
    atualizado_em: (/* @__PURE__ */ new Date()).toISOString()
  }, 200, { "Cache-Control": "public, max-age=20, s-maxage=20, stale-while-revalidate=60" });
}
__name(onRequestGet11, "onRequestGet");

// ../.wrangler/tmp/pages-QXljwq/functionsRoutes-0.002284292152017975.mjs
var routes = [
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/auth/senha",
    mountPath: "/api/auth",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/comunicados/:id",
    mountPath: "/api/comunicados",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/comunicados/:id",
    mountPath: "/api/comunicados",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/depoimentos/:id",
    mountPath: "/api/depoimentos",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/depoimentos/:id",
    mountPath: "/api/depoimentos",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut3]
  },
  {
    routePath: "/api/faq/:id",
    mountPath: "/api/faq",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/faq/:id",
    mountPath: "/api/faq",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut4]
  },
  {
    routePath: "/api/galeria/:id",
    mountPath: "/api/galeria",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete4]
  },
  {
    routePath: "/api/galeria/:id",
    mountPath: "/api/galeria",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut5]
  },
  {
    routePath: "/api/media/:chave",
    mountPath: "/api/media",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/midia/:id",
    mountPath: "/api/midia",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete5]
  },
  {
    routePath: "/api/promocoes/:id",
    mountPath: "/api/promocoes",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete6]
  },
  {
    routePath: "/api/promocoes/:id",
    mountPath: "/api/promocoes",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut6]
  },
  {
    routePath: "/api/comunicados",
    mountPath: "/api/comunicados",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/comunicados",
    mountPath: "/api/comunicados",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/configuracoes",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/configuracoes",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut7]
  },
  {
    routePath: "/api/depoimentos",
    mountPath: "/api/depoimentos",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/depoimentos",
    mountPath: "/api/depoimentos",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/faq",
    mountPath: "/api/faq",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/faq",
    mountPath: "/api/faq",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/galeria",
    mountPath: "/api/galeria",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/galeria",
    mountPath: "/api/galeria",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/letreiro",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/letreiro",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut8]
  },
  {
    routePath: "/api/midia",
    mountPath: "/api/midia",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/midia",
    mountPath: "/api/midia",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/promocoes",
    mountPath: "/api/promocoes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/promocoes",
    mountPath: "/api/promocoes",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/setup",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  },
  {
    routePath: "/api/site",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  }
];

// C:/Users/rafae/AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/rafae/AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function getOriginalPathPrefix(requestPath, normalizedPrefix) {
  let end = 0;
  for (let index = 0; index < normalizedPrefix.length; index++) {
    end++;
    if (normalizedPrefix[index] === "/") {
      while (requestPath[end] === "/") {
        end++;
      }
    }
  }
  return requestPath.slice(0, end);
}
__name(getOriginalPathPrefix, "getOriginalPathPrefix");
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  const normalizedRequestPath = requestPath.replace(/\/+/g, "/");
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath) || routeMatcher(normalizedRequestPath);
    const originalMountMatch = mountMatcher(requestPath);
    const mountMatchResult = originalMountMatch || mountMatcher(normalizedRequestPath);
    if (matchResult && mountMatchResult) {
      const path = originalMountMatch ? originalMountMatch.path : getOriginalPathPrefix(requestPath, mountMatchResult.path);
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error2) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error2;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
