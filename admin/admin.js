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

const estado = { 
  usuario: null, comunicados: [], promocoes: [], midia: [], galeria: [], 
  depoimentos: [], faq: [], letreiro: null, configuracoes: null 
};

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
  
  const nomeFormatado = estado.usuario ? estado.usuario.charAt(0).toUpperCase() + estado.usuario.slice(1) : '';
  $('#app-user-nome').textContent = nomeFormatado;
  
  const tituloDash = $('[data-painel="dashboard"] h2');
  if (tituloDash) tituloDash.textContent = `Bem-vinda, ${nomeFormatado}!`;
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
  await Promise.all([
    carregarComunicados(), carregarPromocoes(), carregarMidia(), 
    carregarGaleria(), carregarLetreiro(), carregarDepoimentos(), 
    carregarTextos(), carregarContatos(), carregarTextosEventos(), carregarFaq()
  ]);
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

/* DEPOIMENTOS */
async function carregarDepoimentos() {
  try {
    const d = await api('/api/depoimentos?todos=1');
    estado.depoimentos = d.itens || [];
    renderDepoimentos();
  } catch (e) { console.warn(e); }
}

function renderDepoimentos() {
  const lista = $('#depoimentos-lista');
  if (!estado.depoimentos.length) { lista.innerHTML = '<p class="form-erro">Nenhum depoimento ainda.</p>'; return; }
  lista.innerHTML = estado.depoimentos.map((d) => `
    <li class="item-admin ${d.ativo ? '' : 'item-admin--inativo'}">
      <div class="item-admin__cab">
        <div>
          <div class="item-admin__titulo">${escapar(d.nome)} ${d.tipo_evento ? `(${escapar(d.tipo_evento)})` : ''}</div>
          <div class="item-admin__meta">${!d.ativo ? '<span class="tag tag--off">Oculto</span>' : ''}</div>
        </div>
      </div>
      <p class="item-admin__desc">"${escapar(d.texto)}"</p>
      <div class="item-admin__acoes">
        <button class="btn btn--ghost" data-editar-depoimento="${d.id}">Editar</button>
        <button class="btn btn--perigo" data-excluir-depoimento="${d.id}">Excluir</button>
      </div>
    </li>`).join('');
  lista.querySelectorAll('[data-editar-depoimento]').forEach((b) => b.addEventListener('click', () => abrirFormDepoimento(Number(b.dataset.editarDepoimento))));
  lista.querySelectorAll('[data-excluir-depoimento]').forEach((b) => b.addEventListener('click', () => excluirDepoimento(Number(b.dataset.excluirDepoimento))));
}

function abrirFormDepoimento(id) {
  const wrap = $('#depoimento-form-wrap'), form = $('#depoimento-form');
  wrap.hidden = false; form.reset(); $('#depoimento-erro').textContent = '';
  if (id) {
    const d = estado.depoimentos.find((x) => x.id === id); if (!d) return;
    form.elements.id.value = d.id; form.elements.nome.value = d.nome;
    form.elements.texto.value = d.texto; form.elements.tipo_evento.value = d.tipo_evento || '';
    form.elements.ativo.checked = !!d.ativo;
  } else { form.elements.id.value = ''; form.elements.ativo.checked = true; }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function excluirDepoimento(id) {
  if (!confirm('Excluir este depoimento?')) return;
  try { await api(`/api/depoimentos/${id}`, { method: 'DELETE' }); await carregarDepoimentos(); } catch (e) { alert(e.message); }
}

$('[data-acao="novo-depoimento"]').addEventListener('click', () => abrirFormDepoimento(null));
$('[data-acao="cancelar-depoimento"]').addEventListener('click', () => { $('#depoimento-form-wrap').hidden = true; });

$('#depoimento-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, erroEl = $('#depoimento-erro'); erroEl.textContent = '';
  const dados = {
    nome: form.elements.nome.value.trim(), texto: form.elements.texto.value.trim(),
    tipo_evento: form.elements.tipo_evento.value.trim(), ativo: form.elements.ativo.checked,
  };
  const id = form.elements.id.value ? Number(form.elements.id.value) : null;
  const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    if (id) await api(`/api/depoimentos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
    else await api('/api/depoimentos', { method: 'POST', body: JSON.stringify(dados) });
    $('#depoimento-form-wrap').hidden = true; await carregarDepoimentos();
  } catch (err) { erroEl.textContent = err.message; } finally { btn.disabled = false; }
});

/* CONTATOS */
async function carregarContatos() {
  try {
    const d = await api('/api/configuracoes');
    const form = $('#contatos-form');
    form.elements.contato_whatsapp.value = d.contato_whatsapp || '';
    form.elements.contato_telefone.value = d.contato_telefone || '';
    form.elements.contato_instagram.value = d.contato_instagram || '';
    form.elements.contato_endereco.value = d.contato_endereco || '';
    form.elements.contato_horario.value = d.contato_horario || '';
  } catch (e) { console.warn(e); }
}

$('#contatos-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget, okEl = $('#contatos-ok'); okEl.textContent = '';
  try {
    await api('/api/configuracoes', {
      method: 'PUT',
      body: JSON.stringify({
        contato_whatsapp: form.elements.contato_whatsapp.value.trim(),
        contato_telefone: form.elements.contato_telefone.value.trim(),
        contato_instagram: form.elements.contato_instagram.value.trim(),
        contato_endereco: form.elements.contato_endereco.value.trim(),
        contato_horario: form.elements.contato_horario.value.trim(),
      }),
    });
    okEl.textContent = 'Contatos atualizados com sucesso.';
    setTimeout(() => (okEl.textContent = ''), 3000);
  } catch (err) { alert(err.message); }
});

/* TEXTOS EVENTOS */
async function carregarTextosEventos() {
  try {
    const d = await api('/api/configuracoes');
    const form = $('#eventos-form');
    const chaves = ['casamento', '15anos', 'aniversarios', 'formaturas', 'corporativos'];
    chaves.forEach(k => {
      form.elements[`ev_${k}_titulo`].value = d[`ev_${k}_titulo`] || '';
      form.elements[`ev_${k}_frase`].value = d[`ev_${k}_frase`] || '';
      form.elements[`ev_${k}_nota`].value = d[`ev_${k}_nota`] || '';
    });
  } catch (e) { console.warn(e); }
}

$('#eventos-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget, okEl = $('#eventos-ok'); okEl.textContent = '';
  const dados = {};
  Array.from(form.elements).forEach(el => {
    if (el.name) dados[el.name] = el.value.trim();
  });
  try {
    await api('/api/configuracoes', { method: 'PUT', body: JSON.stringify(dados) });
    okEl.textContent = 'Textos atualizados com sucesso.';
    setTimeout(() => (okEl.textContent = ''), 3000);
  } catch (err) { alert(err.message); }
});

/* FAQ */
async function carregarFaq() {
  try {
    const d = await api('/api/faq?todos=1');
    estado.faq = d.itens || [];
    renderFaq();
  } catch (e) { console.warn(e); }
}

function renderFaq() {
  const lista = $('#faq-lista');
  if (!estado.faq.length) { lista.innerHTML = '<p class="form-erro">Nenhuma pergunta cadastrada.</p>'; return; }
  lista.innerHTML = estado.faq.map((f) => `
    <li class="item-admin ${f.ativo ? '' : 'item-admin--inativo'}">
      <div class="item-admin__cab"><div>
        <div class="item-admin__titulo">${escapar(f.pergunta)}</div>
        <div class="item-admin__meta">${!f.ativo ? '<span class="tag tag--off">Oculto</span>' : ''} Ordem: ${f.ordem}</div>
      </div></div>
      <p class="item-admin__desc">${escapar(f.resposta)}</p>
      <div class="item-admin__acoes">
        <button class="btn btn--ghost" data-editar-faq="${f.id}">Editar</button>
        <button class="btn btn--perigo" data-excluir-faq="${f.id}">Excluir</button>
      </div>
    </li>`).join('');
  lista.querySelectorAll('[data-editar-faq]').forEach((b) => b.addEventListener('click', () => abrirFormFaq(Number(b.dataset.editarFaq))));
  lista.querySelectorAll('[data-excluir-faq]').forEach((b) => b.addEventListener('click', () => excluirFaq(Number(b.dataset.excluirFaq))));
}

function abrirFormFaq(id) {
  const wrap = $('#faq-form-wrap'), form = $('#faq-form');
  wrap.hidden = false; form.reset(); $('#faq-erro').textContent = '';
  if (id) {
    const f = estado.faq.find((x) => x.id === id); if (!f) return;
    form.elements.id.value = f.id; form.elements.pergunta.value = f.pergunta;
    form.elements.resposta.value = f.resposta; form.elements.ordem.value = f.ordem || 0;
    form.elements.ativo.checked = !!f.ativo;
  } else { form.elements.id.value = ''; form.elements.ativo.checked = true; }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function excluirFaq(id) {
  if (!confirm('Excluir esta pergunta?')) return;
  try { await api(`/api/faq/${id}`, { method: 'DELETE' }); await carregarFaq(); } catch (e) { alert(e.message); }
}

$('[data-acao="nova-faq"]').addEventListener('click', () => abrirFormFaq(null));
$('[data-acao="cancelar-faq"]').addEventListener('click', () => { $('#faq-form-wrap').hidden = true; });

$('#faq-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget, erroEl = $('#faq-erro'); erroEl.textContent = '';
  const dados = {
    pergunta: form.elements.pergunta.value.trim(), resposta: form.elements.resposta.value.trim(),
    ordem: parseInt(form.elements.ordem.value, 10) || 0, ativo: form.elements.ativo.checked,
  };
  const id = form.elements.id.value ? Number(form.elements.id.value) : null;
  const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    if (id) await api(`/api/faq/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
    else await api('/api/faq', { method: 'POST', body: JSON.stringify(dados) });
    $('#faq-form-wrap').hidden = true; await carregarFaq();
  } catch (err) { erroEl.textContent = err.message; } finally { btn.disabled = false; }
});

/* APARÊNCIA E TEXTOS */
async function carregarTextos() {
  try {
    const d = await api('/api/configuracoes');
    estado.configuracoes = d;
    const form = $('#textos-form');
    
    const tema = d.tema_ativo || 'padrao';
    const radio = form.querySelector(`input[name="tema_ativo"][value="${tema}"]`);
    if (radio) radio.checked = true;
    
    form.elements.hero_titulo.value = d.hero_titulo || '';
    form.elements.hero_subtitulo.value = d.hero_subtitulo || '';
    form.elements.espaco_titulo.value = d.espaco_titulo || '';
    form.elements.espaco_texto_1.value = d.espaco_texto_1 || '';
    form.elements.espaco_texto_2.value = d.espaco_texto_2 || '';
  } catch (e) { console.warn(e); }
}

$('#textos-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget, okEl = $('#textos-ok');
  okEl.textContent = '';
  const temaSelecionado = form.querySelector('input[name="tema_ativo"]:checked').value;
  try {
    await api('/api/configuracoes', {
      method: 'PUT',
      body: JSON.stringify({
        tema_ativo: temaSelecionado,
        hero_titulo: form.elements.hero_titulo.value.trim(),
        hero_subtitulo: form.elements.hero_subtitulo.value.trim(),
        espaco_titulo: form.elements.espaco_titulo.value.trim(),
        espaco_texto_1: form.elements.espaco_texto_1.value.trim(),
        espaco_texto_2: form.elements.espaco_texto_2.value.trim(),
      }),
    });
    okEl.textContent = 'Aparência e textos atualizados com sucesso.';
    setTimeout(() => (okEl.textContent = ''), 3000);
  } catch (err) { alert(err.message); }
});

/* PERFIL */
$('#btn-perfil').addEventListener('click', () => {
  const modal = $('#perfil-modal');
  modal.hidden = false;
  modal.querySelector('form').reset();
  $('#perfil-erro').textContent = '';
  modal.querySelector('input').focus();
});

$('#btn-fechar-perfil').addEventListener('click', () => {
  $('#perfil-modal').hidden = true;
});

$('#perfil-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const erroEl = $('#perfil-erro');
  erroEl.textContent = '';
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;

  try {
    await api('/api/auth/senha', {
      method: 'PUT',
      body: JSON.stringify({
        senha_atual: form.elements.senha_atual.value,
        senha_nova: form.elements.senha_nova.value
      }),
    });
    alert('Senha alterada com sucesso!');
    $('#perfil-modal').hidden = true;
  } catch (err) {
    erroEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
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