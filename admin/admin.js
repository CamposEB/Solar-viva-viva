'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include', ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

async function apiForm(path, formData) {
  const res = await fetch(path, { method: 'POST', credentials: 'include', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

const fmtData = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = iso.split('T')[0].split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
};

const estado = { usuario: null, comunicados: [], promocoes: [], midia: [], galeria: [], letreiro: null };

async function verificarSessao() {
  try {
    const d = await api('/api/auth/me');
    estado.usuario = d.usuario;
    mostrarApp();
    carregarTudo();
  } catch {
    mostrarLogin();
  }
}

function mostrarLogin() {
  $('#login-view').hidden = false;
  $('#app-view').hidden = true;
  $('#login-form').elements.usuario.focus();
}

function mostrarApp() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#app-user-nome').textContent = estado.usuario || '';
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget, erroEl = $('#login-erro'), btn = form.querySelector('button[type="submit"]');
  erroEl.textContent = ''; btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario: form.elements.usuario.value.trim(), senha: form.elements.senha.value }),
    });
    await verificarSessao(); form.reset();
  } catch (err) { erroEl.textContent = err.message; }
  finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});

$('#logout-btn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  location.reload();
});

$$('.app-nav__btn').forEach((btn) => btn.addEventListener('click', () => ativarTab(btn.dataset.tab)));
function ativarTab(nome) {
  $$('.app-nav__btn').forEach((b) => b.classList.toggle('ativo', b.dataset.tab === nome));
  $$('[data-painel]').forEach((p) => (p.hidden = p.dataset.painel !== nome));
}

async function carregarTudo() {
  await Promise.all([carregarComunicados(), carregarPromocoes(), carregarMidia(), carregarLetreiro(), carregarGaleria()]);
}

/* COMUNICADOS */
async function carregarComunicados() {
  try {
    const d = await api('/api/comunicados?todos=1');
    estado.comunicados = d.itens || []; renderComunicados(); atualizarStats();
  } catch (e) { console.warn(e); }
}

function renderComunicados() {
  const lista = $('#comunicados-lista');
  if (!estado.comunicados.length) { lista.innerHTML = '<p class="form-erro">Nenhum comunicado ainda.</p>'; return; }
  lista.innerHTML = estado.comunicados.map((c) => `
    <li class="item-admin ${c.ativo ? '' : 'item-admin--inativo'} ${c.destaque ? 'item-admin--destaque' : ''}">
      <div class="item-admin__cab"><div>
        <div class="item-admin__titulo">${escapar(c.titulo)}</div>
        <div class="item-admin__meta">
          ${c.destaque ? '<span class="tag">Destaque</span>' : ''}
          ${!c.ativo ? '<span class="tag tag--off">Inativo</span>' : ''}
          <span>Publicado: ${fmtData(c.publicado_em)}</span>
        </div>
      </div></div>
      <p class="item-admin__desc">${escapar(c.descricao)}</p>
      <div class="item-admin__acoes">
        <button class="btn btn--ghost" data-editar-comunicado="${c.id}">Editar</button>
        <button class="btn btn--perigo" data-excluir-comunicado="${c.id}">Excluir</button>
      </div>
    </li>`).join('');
  lista.querySelectorAll('[data-editar-comunicado]').forEach((b) => b.addEventListener('click', () => abrirFormComunicado(Number(b.dataset.editarComunicado))));
  lista.querySelectorAll('[data-excluir-comunicado]').forEach((b) => b.addEventListener('click', () => excluirComunicado(Number(b.dataset.excluirComunicado))));
}

function abrirFormComunicado(id) {
  const wrap = $('#comunicado-form-wrap'), form = $('#comunicado-form');
  wrap.hidden = false; form.reset(); $('#comunicado-erro').textContent = '';
  const hoje = new Date().toISOString().split('T')[0];
  if (id) {
    const c = estado.comunicados.find((x) => x.id === id); if (!c) return;
    form.elements.id.value = c.id; form.elements.titulo.value = c.titulo;
    form.elements.descricao.value = c.descricao; form.elements.publicado_em.value = c.publicado_em || hoje;
    form.elements.encerra_em.value = c.encerra_em || ''; form.elements.destaque.checked = !!c.destaque;
    form.elements.ativo.checked = !!c.ativo;
  } else { form.elements.id.value = ''; form.elements.publicado_em.value = hoje; form.elements.ativo.checked = true; }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function excluirComunicado(id) {
  if (!confirm('Excluir este comunicado?')) return;
  try { await api(`/api/comunicados/${id}`, { method: 'DELETE' }); await carregarComunicados(); } catch (e) { alert(e.message); }
}

$('[data-acao="novo-comunicado"]').addEventListener('click', () => abrirFormComunicado(null));
$('[data-acao="cancelar-comunicado"]').addEventListener('click', () => { $('#comunicado-form-wrap').hidden = true; });

$('#comunicado-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, erroEl = $('#comunicado-erro'); erroEl.textContent = '';
  const dados = { titulo: form.elements.titulo.value.trim(), descricao: form.elements.descricao.value.trim(), publicado_em: form.elements.publicado_em.value || null, encerra_em: form.elements.encerra_em.value || null, destaque: form.elements.destaque.checked, ativo: form.elements.ativo.checked };
  const id = form.elements.id.value ? Number(form.elements.id.value) : null;
  const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    if (id) await api(`/api/comunicados/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
    else await api('/api/comunicados', { method: 'POST', body: JSON.stringify(dados) });
    $('#comunicado-form-wrap').hidden = true; await carregarComunicados();
  } catch (err) { erroEl.textContent = err.message; } finally { btn.disabled = false; }
});

/* GALERIA */
async function carregarGaleria() {
  try {
    const d = await api('/api/galeria?todos=1');
    estado.galeria = d.itens || [];
    renderGaleria(); preencherSelectMidiaGaleria(); atualizarStats();
  } catch (e) { console.warn(e); }
}

function renderGaleria() {
  const lista = $('#galeria-lista');
  if (!estado.galeria.length) { lista.innerHTML = '<p class="form-erro">Nenhuma foto na galeria.</p>'; return; }
  lista.innerHTML = estado.galeria.map((g) => `
    <div class="midia-item ${g.ativo ? '' : 'item-admin--inativo'}">
      <img class="midia-item__thumb" src="/api/media/${g.midia_chave}" alt="">
      <div class="midia-item__info">
        <strong>${escapar(g.legenda || 'Sem legenda')}</strong>
        Ordem: ${g.ordem} ${!g.ativo ? '· Oculto' : ''}
      </div>
      <div class="midia-item__acoes">
        <button class="btn btn--ghost" data-editar-galeria="${g.id}">Editar</button>
        <button class="btn btn--perigo" data-excluir-galeria="${g.id}">Excluir</button>
      </div>
    </div>`).join('');
  lista.querySelectorAll('[data-editar-galeria]').forEach((b) => b.addEventListener('click', () => abrirFormGaleria(Number(b.dataset.editarGaleria))));
  lista.querySelectorAll('[data-excluir-galeria]').forEach((b) => b.addEventListener('click', () => excluirGaleria(Number(b.dataset.excluirGaleria))));
}

function preencherSelectMidiaGaleria() {
  const sel = $('#galeria-form').elements.midia_id;
  const atual = sel.value;
  sel.innerHTML = '<option value="">— Selecione —</option>' + estado.midia.filter((m) => m.tipo === 'imagem').map((m) => `<option value="${m.id}">${escapar(m.nome_original)}</option>`).join('');
  if (atual) sel.value = atual;
}

function abrirFormGaleria(id) {
  const wrap = $('#galeria-form-wrap'), form = $('#galeria-form');
  wrap.hidden = false; form.reset(); $('#galeria-erro').textContent = ''; preencherSelectMidiaGaleria();
  if (id) {
    const g = estado.galeria.find((x) => x.id === id); if (!g) return;
    form.elements.id.value = g.id; form.elements.midia_id.value = g.midia_id;
    form.elements.legenda.value = g.legenda || ''; form.elements.ordem.value = g.ordem || 0;
    form.elements.ativo.checked = !!g.ativo;
  } else { form.elements.id.value = ''; form.elements.ativo.checked = true; }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function excluirGaleria(id) {
  if (!confirm('Excluir esta foto da galeria?')) return;
  try { await api(`/api/galeria/${id}`, { method: 'DELETE' }); await carregarGaleria(); } catch (e) { alert(e.message); }
}

$('[data-acao="nova-galeria"]').addEventListener('click', () => abrirFormGaleria(null));
$('[data-acao="cancelar-galeria"]').addEventListener('click', () => { $('#galeria-form-wrap').hidden = true; });

$('#galeria-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, erroEl = $('#galeria-erro'); erroEl.textContent = '';
  const dados = {
    midia_id: Number(form.elements.midia_id.value) || null,
    legenda: form.elements.legenda.value.trim(),
    ordem: Number(form.elements.ordem.value) || 0,
    ativo: form.elements.ativo.checked,
  };
  const id = form.elements.id.value ? Number(form.elements.id.value) : null;
  const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    if (id) await api(`/api/galeria/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
    else await api('/api/galeria', { method: 'POST', body: JSON.stringify(dados) });
    $('#galeria-form-wrap').hidden = true; await carregarGaleria();
  } catch (err) { erroEl.textContent = err.message; } finally { btn.disabled = false; }
});

/* LETREIRO */
async function carregarLetreiro() {
  try {
    const d = await api('/api/letreiro'); estado.letreiro = d;
    const form = $('#letreiro-form');
    form.elements.texto.value = d.texto || ''; form.elements.velocidade.value = d.velocidade || 70; form.elements.ativo.checked = !!d.ativo;
  } catch (e) { console.warn(e); }
}

$('#letreiro-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, okEl = $('#letreiro-ok'); okEl.textContent = '';
  try {
    await api('/api/letreiro', { method: 'PUT', body: JSON.stringify({ texto: form.elements.texto.value.trim(), velocidade: parseInt(form.elements.velocidade.value, 10) || 70, ativo: form.elements.ativo.checked }) });
    okEl.textContent = 'Letreiro atualizado.'; setTimeout(() => (okEl.textContent = ''), 3000);
  } catch (err) { alert(err.message); }
});

/* PROMOÇÕES */
async function carregarPromocoes() {
  try {
    const d = await api('/api/promocoes?todos=1'); estado.promocoes = d.itens || [];
    renderPromocoes(); preencherSelectMidiaPromocao(); atualizarStats();
  } catch (e) { console.warn(e); }
}

function renderPromocoes() {
  const lista = $('#promocoes-lista');
  if (!estado.promocoes.length) { lista.innerHTML = '<p class="form-erro">Nenhuma promoção cadastrada.</p>'; return; }
  lista.innerHTML = estado.promocoes.map((p) => `
    <li class="item-admin ${p.ativo ? '' : 'item-admin--inativo'}">
      <div class="item-admin__cab"><div>
        <div class="item-admin__titulo">${escapar(p.titulo)}</div>
        <div class="item-admin__meta">
          ${!p.ativo ? '<span class="tag tag--off">Inativa</span>' : ''}
          <span>${fmtData(p.data_inicio)} → ${p.data_fim ? fmtData(p.data_fim) : 'sem término'}</span>
        </div>
      </div>${p.imagem_url ? `<img class="item-admin__img" src="${p.imagem_url}" alt="">` : ''}</div>
      ${p.descricao ? `<p class="item-admin__desc">${escapar(p.descricao)}</p>` : ''}
      <div class="item-admin__acoes">
        <button class="btn btn--ghost" data-editar-promocao="${p.id}">Editar</button>
        <button class="btn btn--perigo" data-excluir-promocao="${p.id}">Excluir</button>
      </div>
    </li>`).join('');
  lista.querySelectorAll('[data-editar-promocao]').forEach((b) => b.addEventListener('click', () => abrirFormPromocao(Number(b.dataset.editarPromocao))));
  lista.querySelectorAll('[data-excluir-promocao]').forEach((b) => b.addEventListener('click', () => excluirPromocao(Number(b.dataset.excluirPromocao))));
}

function preencherSelectMidiaPromocao() {
  const sel = $('#promocao-form').elements.imagem_id;
  const atual = sel.value;
  sel.innerHTML = '<option value="">— Nenhuma —</option>' + estado.midia.filter((m) => m.tipo === 'imagem').map((m) => `<option value="${m.id}">${escapar(m.nome_original)}</option>`).join('');
  if (atual) sel.value = atual;
}

function abrirFormPromocao(id) {
  const wrap = $('#promocao-form-wrap'), form = $('#promocao-form');
  wrap.hidden = false; form.reset(); $('#promocao-erro').textContent = ''; preencherSelectMidiaPromocao();
  const hoje = new Date().toISOString().split('T')[0];
  if (id) {
    const p = estado.promocoes.find((x) => x.id === id); if (!p) return;
    form.elements.id.value = p.id; form.elements.titulo.value = p.titulo; form.elements.descricao.value = p.descricao || '';
    form.elements.imagem_id.value = p.imagem_id || ''; form.elements.data_inicio.value = p.data_inicio || hoje;
    form.elements.data_fim.value = p.data_fim || ''; form.elements.ativo.checked = !!p.ativo;
  } else { form.elements.id.value = ''; form.elements.data_inicio.value = hoje; form.elements.ativo.checked = true; }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function excluirPromocao(id) {
  if (!confirm('Excluir esta promoção?')) return;
  try { await api(`/api/promocoes/${id}`, { method: 'DELETE' }); await carregarPromocoes(); } catch (e) { alert(e.message); }
}

$('[data-acao="nova-promocao"]').addEventListener('click', () => abrirFormPromocao(null));
$('[data-acao="cancelar-promocao"]').addEventListener('click', () => { $('#promocao-form-wrap').hidden = true; });

$('#promocao-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, erroEl = $('#promocao-erro'); erroEl.textContent = '';
  const dados = {
    titulo: form.elements.titulo.value.trim(), descricao: form.elements.descricao.value.trim(),
    imagem_id: form.elements.imagem_id.value ? Number(form.elements.imagem_id.value) : null,
    data_inicio: form.elements.data_inicio.value, data_fim: form.elements.data_fim.value || null, ativo: form.elements.ativo.checked,
  };
  const id = form.elements.id.value ? Number(form.elements.id.value) : null;
  const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    if (id) await api(`/api/promocoes/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
    else await api('/api/promocoes', { method: 'POST', body: JSON.stringify(dados) });
    $('#promocao-form-wrap').hidden = true; await carregarPromocoes();
  } catch (err) { erroEl.textContent = err.message; } finally { btn.disabled = false; }
});

/* MÍDIA */
async function carregarMidia() {
  try {
    const d = await api('/api/midia'); estado.midia = d.itens || [];
    renderMidia(); preencherSelectMidiaGaleria(); preencherSelectMidiaPromocao(); atualizarStats();
  } catch (e) { console.warn(e); }
}

function renderMidia() {
  const lista = $('#midia-lista');
  if (!estado.midia.length) { lista.innerHTML = '<p class="form-erro">Nenhum arquivo enviado.</p>'; return; }
  lista.innerHTML = estado.midia.map((m) => `
    <div class="midia-item">
      ${m.tipo === 'video' ? `<video class="midia-item__thumb" src="${m.url}" muted></video>` : `<img class="midia-item__thumb" src="${m.url}" alt="" loading="lazy">`}
      <div class="midia-item__info"><strong>${escapar(m.nome_original)}</strong>${(m.tamanho / 1024 / 1024).toFixed(2)} MB · ${m.tipo}</div>
      <div class="midia-item__acoes"><button class="btn btn--perigo" data-excluir-midia="${m.id}">Excluir</button></div>
    </div>`).join('');
  lista.querySelectorAll('[data-excluir-midia]').forEach((b) => b.addEventListener('click', () => excluirMidia(Number(b.dataset.excluirMidia))));
}

async function excluirMidia(id) {
  if (!confirm('Excluir este arquivo? Promoções e Galeria que o usam ficarão sem imagem.')) return;
  try { await api(`/api/midia/${id}`, { method: 'DELETE' }); await carregarMidia(); await carregarPromocoes(); await carregarGaleria(); } catch (e) { alert(e.message); }
}

$('#midia-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, erroEl = $('#midia-erro'), okEl = $('#midia-ok');
  erroEl.textContent = ''; okEl.textContent = '';
  const arq = form.elements.arquivo.files[0]; if (!arq) { erroEl.textContent = 'Selecione um arquivo.'; return; }
  const fd = new FormData(); fd.append('arquivo', arq);
  const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    await apiForm('/api/midia', fd); form.reset(); okEl.textContent = 'Arquivo enviado.';
    setTimeout(() => (okEl.textContent = ''), 3000); await carregarMidia();
  } catch (err) { erroEl.textContent = err.message; } finally { btn.disabled = false; }
});

function atualizarStats() {
  $('#stat-comunicados').textContent = estado.comunicados.length;
  $('#stat-promocoes').textContent = estado.promocoes.filter((p) => p.ativo).length;
  $('#stat-midia').textContent = estado.midia.length;
}

function escapar(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

verificarSessao();