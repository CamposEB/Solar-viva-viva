'use strict';
/* ============================================================
   LOJA — catálogo de roupas e itens (venda e aluguel)
   Depende de admin.js: $, $$, api, apiForm, estado, escapar, carregarMidia
   ============================================================ */

const LOJA_MAX_FOTOS = 8;
const LOJA_MAX_BYTES = 5 * 1024 * 1024;
const LOJA_UNIDADES = { evento: 'por evento', dia: 'por dia', semana: 'por semana' };

estado.loja = [];
estado.lojaCategorias = [];
const lojaUI = { filtro: { q: '', cat: '', tipo: '', status: '' }, fotos: [], erro: '' };

/* ---------- utilidades ---------- */
const lojaBRL = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const lojaPreco = (v) => {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};
const lojaPrecoTexto = (n) => (n == null ? '' : String(n).replace('.', ','));
const lojaUrlFoto = (id) => (estado.midia.find((m) => m.id === id) || {}).url || '';
const lojaCategoriaNome = (id) => (estado.lojaCategorias.find((c) => c.id === id) || {}).nome || 'Sem categoria';
const lojaVende = (i) => i.tipo === 'venda' || i.tipo === 'ambos';
const lojaAluga = (i) => i.tipo === 'aluguel' || i.tipo === 'ambos';

function payloadLoja(i) {
  return {
    nome: i.nome, categoria_id: i.categoria_id || null, tipo: i.tipo, descricao: i.descricao || '',
    preco_venda: i.preco_venda ?? null, preco_aluguel: i.preco_aluguel ?? null,
    unidade_aluguel: i.unidade_aluguel || null, tamanhos: i.tamanhos || '', cor: i.cor || '',
    estoque: Number(i.estoque) || 0, ordem: Number(i.ordem) || 0,
    destaque: !!i.destaque, ativo: !!i.ativo, fotos: [...(i.fotos || [])],
  };
}

function salvarLoja(id, dados) {
  return api(id ? `/api/loja/${id}` : '/api/loja', { method: id ? 'PUT' : 'POST', body: JSON.stringify(dados) });
}

/* ---------- carregamento ---------- */
async function carregarLoja() {
  try {
    const [c, i] = await Promise.all([api('/api/loja-categorias'), api('/api/loja?todos=1')]);
    estado.lojaCategorias = c.itens || [];
    estado.loja = i.itens || [];
    lojaUI.erro = '';
  } catch (e) {
    console.warn(e);
    lojaUI.erro = e.message;
  }
  preencherSelectsLoja();
  renderLoja();
  renderCategoriasLoja();
}

function preencherSelectsLoja() {
  const opts = estado.lojaCategorias.map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`).join('');
  const filtro = $('#loja-filtro-cat'), fa = filtro.value;
  filtro.innerHTML = '<option value="">Todas as categorias</option><option value="0">Sem categoria</option>' + opts;
  filtro.value = fa;
  const sel = $('#loja-form').elements.categoria_id, sa = sel.value;
  sel.innerHTML = '<option value="">— Sem categoria —</option>' + opts;
  sel.value = sa;
}

/* ---------- lista ---------- */
function lojaFiltrados() {
  const { q, cat, tipo, status } = lojaUI.filtro;
  const termo = q.trim().toLowerCase();
  return estado.loja.filter((i) => {
    if (termo && !`${i.nome} ${i.descricao || ''} ${i.cor || ''} ${i.tamanhos || ''}`.toLowerCase().includes(termo)) return false;
    if (cat !== '' && Number(i.categoria_id || 0) !== Number(cat)) return false;
    if (tipo === 'venda' && !lojaVende(i)) return false;
    if (tipo === 'aluguel' && !lojaAluga(i)) return false;
    if (status === 'visivel' && !i.ativo) return false;
    if (status === 'oculto' && i.ativo) return false;
    if (status === 'esgotado' && Number(i.estoque) > 0) return false;
    if (status === 'destaque' && !i.destaque) return false;
    return true;
  });
}

function cardLoja(i) {
  const capa = lojaUrlFoto((i.fotos || [])[0]);
  const estoque = Number(i.estoque) || 0;
  const selos = [
    i.destaque ? '<span class="tag">Destaque</span>' : '',
    !i.ativo ? '<span class="tag tag--off">Oculto</span>' : '',
    estoque <= 0 ? '<span class="tag tag--off">Esgotado</span>' : '',
  ].join('');
  const precos = [
    lojaVende(i) && i.preco_venda != null ? `<span class="loja-preco"><small>Venda</small>${lojaBRL(i.preco_venda)}</span>` : '',
    lojaAluga(i) && i.preco_aluguel != null ? `<span class="loja-preco"><small>Aluguel ${LOJA_UNIDADES[i.unidade_aluguel] || ''}</small>${lojaBRL(i.preco_aluguel)}</span>` : '',
  ].join('');
  const meta = [i.tamanhos ? `Tam.: ${escapar(i.tamanhos)}` : '', i.cor ? `Cor: ${escapar(i.cor)}` : '', `Estoque: ${estoque}`].filter(Boolean).join(' · ');
  return `
  <li class="loja-item ${i.ativo ? '' : 'loja-item--inativo'}" data-id="${i.id}">
    <div class="loja-item__foto">
      ${capa ? `<img src="${escapar(capa)}" alt="" loading="lazy">` : '<div class="loja-item__vazio">Sem foto</div>'}
      <div class="loja-item__selos">${selos}</div>
    </div>
    <div class="loja-item__corpo">
      <span class="loja-item__cat">${escapar(lojaCategoriaNome(i.categoria_id))}</span>
      <h3 class="loja-item__nome">${escapar(i.nome)}</h3>
      <div class="loja-item__precos">${precos || '<span class="loja-item__cat">Sem preço</span>'}</div>
      <p class="loja-item__meta">${meta}</p>
    </div>
    <div class="loja-item__acoes">
      <button type="button" class="btn btn--ghost" data-loja-acao="editar">Editar</button>
      <button type="button" class="btn btn--ghost" data-loja-acao="ativo">${i.ativo ? 'Ocultar' : 'Exibir'}</button>
      <button type="button" class="btn btn--ghost" data-loja-acao="destaque">${i.destaque ? 'Tirar destaque' : 'Destacar'}</button>
      <button type="button" class="btn btn--perigo" data-loja-acao="excluir">Excluir</button>
    </div>
  </li>`;
}

function renderLoja() {
  const lista = $('#loja-lista'), resumo = $('#loja-resumo');
  const stat = $('#stat-loja');
  if (stat) stat.textContent = lojaUI.erro ? '—' : estado.loja.length;
  if (lojaUI.erro) {
    resumo.textContent = '';
    lista.innerHTML = `<li class="loja-vazio form-erro">Não foi possível carregar a loja (${escapar(lojaUI.erro)}). Verifique se a API da loja está publicada.</li>`;
    return;
  }
  const itens = lojaFiltrados();
  resumo.textContent = estado.loja.length ? `${itens.length} de ${estado.loja.length} ${estado.loja.length === 1 ? 'item' : 'itens'}` : '';
  if (!estado.loja.length) {
    lista.innerHTML = '<li class="loja-vazio">Nenhum item cadastrado ainda. Clique em “+ Novo item” para começar.</li>';
    return;
  }
  lista.innerHTML = itens.length ? itens.map(cardLoja).join('') : '<li class="loja-vazio">Nenhum item encontrado com esses filtros.</li>';
}

$('#loja-lista').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-loja-acao]');
  if (!b) return;
  const id = Number(b.closest('.loja-item').dataset.id);
  const item = estado.loja.find((x) => x.id === id);
  if (!item) return;
  const acao = b.dataset.lojaAcao;
  try {
    if (acao === 'editar') abrirFormLoja(item);
    else if (acao === 'ativo') { b.disabled = true; await salvarLoja(id, { ...payloadLoja(item), ativo: !item.ativo }); await carregarLoja(); }
    else if (acao === 'destaque') { b.disabled = true; await salvarLoja(id, { ...payloadLoja(item), destaque: !item.destaque }); await carregarLoja(); }
    else if (acao === 'excluir' && confirm(`Excluir “${item.nome}”? Esta ação não pode ser desfeita.`)) {
      await api(`/api/loja/${id}`, { method: 'DELETE' });
      await carregarLoja();
    }
  } catch (err) { alert(err.message); b.disabled = false; }
});

[['#loja-busca', 'q'], ['#loja-filtro-cat', 'cat'], ['#loja-filtro-tipo', 'tipo'], ['#loja-filtro-status', 'status']].forEach(([sel, chave]) => {
  $(sel).addEventListener('input', (e) => { lojaUI.filtro[chave] = e.target.value; renderLoja(); });
});

/* ---------- formulário do item ---------- */
function alternarPrecosLoja() {
  const t = $('#loja-form').elements.tipo.value;
  $$('#loja-form [data-preco]').forEach((el) => {
    el.hidden = (el.dataset.preco === 'venda' && t === 'aluguel') || (el.dataset.preco === 'aluguel' && t === 'venda');
  });
}

function abrirFormLoja(item) {
  const wrap = $('#loja-form-wrap'), form = $('#loja-form'), e = form.elements;
  $('#loja-cat-wrap').hidden = true;
  form.reset();
  $('#loja-erro').textContent = '';
  $('#loja-upload-status').textContent = '';
  preencherSelectsLoja();
  if (item) {
    e.id.value = item.id; e.nome.value = item.nome || '';
    e.categoria_id.value = item.categoria_id || ''; e.tipo.value = item.tipo || 'venda';
    e.preco_venda.value = lojaPrecoTexto(item.preco_venda); e.preco_aluguel.value = lojaPrecoTexto(item.preco_aluguel);
    e.unidade_aluguel.value = item.unidade_aluguel || 'evento';
    e.tamanhos.value = item.tamanhos || ''; e.cor.value = item.cor || '';
    e.estoque.value = item.estoque ?? 0; e.ordem.value = item.ordem || 0;
    e.descricao.value = item.descricao || '';
    e.destaque.checked = !!item.destaque; e.ativo.checked = !!item.ativo;
    lojaUI.fotos = (item.fotos || []).filter((id) => lojaUrlFoto(id));
  } else {
    e.id.value = ''; e.ativo.checked = true; e.estoque.value = 1;
    lojaUI.fotos = [];
  }
  $('#loja-form-titulo').textContent = item ? 'Editar item' : 'Novo item';
  alternarPrecosLoja();
  renderFotosLoja();
  wrap.hidden = false;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  e.nome.focus({ preventScroll: true });
}

$('#loja-btn-novo').addEventListener('click', () => abrirFormLoja(null));
$('#loja-form-cancelar').addEventListener('click', () => { $('#loja-form-wrap').hidden = true; });
$('#loja-form').elements.tipo.addEventListener('change', alternarPrecosLoja);

/* ---------- fotos do item ---------- */
function renderFotosLoja() {
  const ultimo = lojaUI.fotos.length - 1;
  $('#loja-fotos-sel').innerHTML = lojaUI.fotos.length
    ? lojaUI.fotos.map((id, i) => `
      <div class="foto-sel">
        <img src="${escapar(lojaUrlFoto(id))}" alt="Foto ${i + 1}">
        ${i === 0 ? '<span class="tag foto-sel__capa">Capa</span>' : ''}
        <div class="foto-sel__acoes">
          <button type="button" data-foto-mover="${i}" data-dir="-1" aria-label="Mover para antes" ${i === 0 ? 'disabled' : ''}>←</button>
          <button type="button" data-foto-mover="${i}" data-dir="1" aria-label="Mover para depois" ${i === ultimo ? 'disabled' : ''}>→</button>
          <button type="button" data-foto-remover="${i}" aria-label="Remover foto">×</button>
        </div>
      </div>`).join('')
    : '<p class="campo__ajuda">Nenhuma foto selecionada.</p>';

  const imagens = estado.midia.filter((m) => m.tipo === 'imagem');
  $('#loja-fotos-lib').innerHTML = imagens.length
    ? imagens.map((m) => {
        const sel = lojaUI.fotos.includes(m.id);
        return `<button type="button" class="foto-lib${sel ? ' sel' : ''}" data-foto-lib="${m.id}" aria-pressed="${sel}" title="${escapar(m.nome_original)}"><img src="${escapar(m.url)}" alt="${escapar(m.nome_original)}" loading="lazy"></button>`;
      }).join('')
    : '<p class="campo__ajuda">Nenhuma imagem na biblioteca de mídia.</p>';
}

$('#loja-fotos-sel').addEventListener('click', (e) => {
  const mover = e.target.closest('[data-foto-mover]'), rem = e.target.closest('[data-foto-remover]');
  if (mover) {
    const i = Number(mover.dataset.fotoMover), j = i + Number(mover.dataset.dir);
    if (j >= 0 && j < lojaUI.fotos.length) [lojaUI.fotos[i], lojaUI.fotos[j]] = [lojaUI.fotos[j], lojaUI.fotos[i]];
  } else if (rem) {
    lojaUI.fotos.splice(Number(rem.dataset.fotoRemover), 1);
  } else return;
  renderFotosLoja();
});

$('#loja-fotos-lib').addEventListener('click', (e) => {
  const b = e.target.closest('[data-foto-lib]');
  if (!b) return;
  const id = Number(b.dataset.fotoLib), pos = lojaUI.fotos.indexOf(id);
  if (pos >= 0) lojaUI.fotos.splice(pos, 1);
  else if (lojaUI.fotos.length >= LOJA_MAX_FOTOS) { $('#loja-erro').textContent = `Máximo de ${LOJA_MAX_FOTOS} fotos por item.`; return; }
  else lojaUI.fotos.push(id);
  $('#loja-erro').textContent = '';
  renderFotosLoja();
});

$('#loja-upload').addEventListener('change', async (e) => {
  const arquivos = Array.from(e.target.files || []);
  e.target.value = '';
  const erroEl = $('#loja-erro'), status = $('#loja-upload-status');
  erroEl.textContent = '';
  for (const arq of arquivos) {
    if (lojaUI.fotos.length >= LOJA_MAX_FOTOS) { erroEl.textContent = `Máximo de ${LOJA_MAX_FOTOS} fotos por item.`; break; }
    if (arq.size > LOJA_MAX_BYTES) { erroEl.textContent = `“${arq.name}” passa de 5 MB.`; continue; }
    status.textContent = `Enviando ${arq.name}…`;
    const antes = new Set(estado.midia.map((m) => m.id));
    try {
      const fd = new FormData();
      fd.append('arquivo', arq);
      await apiForm('/api/midia', fd);
      await carregarMidia();
      const novo = estado.midia.find((m) => !antes.has(m.id) && m.tipo === 'imagem');
      if (novo) lojaUI.fotos.push(novo.id);
      renderFotosLoja();
    } catch (err) { erroEl.textContent = err.message; }
  }
  status.textContent = '';
});

/* ---------- salvar item ---------- */
$('#loja-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const form = ev.currentTarget, el = form.elements, erroEl = $('#loja-erro');
  erroEl.textContent = '';
  const tipo = el.tipo.value;
  const venda = tipo !== 'aluguel' ? lojaPreco(el.preco_venda.value) : null;
  const aluguel = tipo !== 'venda' ? lojaPreco(el.preco_aluguel.value) : null;
  const estoque = parseInt(el.estoque.value, 10);
  const nome = el.nome.value.trim();
  let msg = '';
  if (nome.length < 2) msg = 'Informe o nome do item.';
  else if (tipo !== 'aluguel' && (venda === null || Number.isNaN(venda))) msg = 'Informe um preço de venda válido.';
  else if (tipo !== 'venda' && (aluguel === null || Number.isNaN(aluguel))) msg = 'Informe um preço de aluguel válido.';
  else if (!Number.isInteger(estoque) || estoque < 0) msg = 'O estoque deve ser um número inteiro (0 ou mais).';
  if (msg) { erroEl.textContent = msg; return; }

  const dados = {
    nome, categoria_id: el.categoria_id.value ? Number(el.categoria_id.value) : null, tipo,
    descricao: el.descricao.value.trim(), preco_venda: venda, preco_aluguel: aluguel,
    unidade_aluguel: tipo === 'venda' ? null : el.unidade_aluguel.value,
    tamanhos: el.tamanhos.value.trim(), cor: el.cor.value.trim(), estoque,
    ordem: parseInt(el.ordem.value, 10) || 0, destaque: el.destaque.checked, ativo: el.ativo.checked,
    fotos: [...lojaUI.fotos],
  };
  const id = el.id.value ? Number(el.id.value) : null;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await salvarLoja(id, dados);
    $('#loja-form-wrap').hidden = true;
    await carregarLoja();
  } catch (err) { erroEl.textContent = err.message; }
  finally { btn.disabled = false; }
});

/* ---------- categorias ---------- */
function renderCategoriasLoja() {
  const lista = $('#loja-cat-lista');
  if (!estado.lojaCategorias.length) { lista.innerHTML = '<li class="campo__ajuda">Nenhuma categoria cadastrada.</li>'; return; }
  lista.innerHTML = estado.lojaCategorias.map((c) => {
    const n = estado.loja.filter((i) => i.categoria_id === c.id).length;
    return `<li class="cat-item" data-id="${c.id}"><span>${escapar(c.nome)} <small>(${n} ${n === 1 ? 'item' : 'itens'})</small></span>
      <button type="button" class="btn btn--ghost btn--pequeno" data-cat-acao="editar">Editar</button>
      <button type="button" class="btn btn--perigo btn--pequeno" data-cat-acao="excluir">Excluir</button></li>`;
  }).join('');
}

function limparFormCategoria() {
  const f = $('#loja-cat-form');
  f.reset(); f.elements.id.value = '';
  $('#loja-cat-cancelar').hidden = true;
  $('#loja-cat-erro').textContent = '';
}

$('#loja-btn-categorias').addEventListener('click', () => {
  $('#loja-form-wrap').hidden = true;
  const wrap = $('#loja-cat-wrap');
  wrap.hidden = !wrap.hidden;
  if (!wrap.hidden) { limparFormCategoria(); renderCategoriasLoja(); $('#loja-cat-form').elements.nome.focus(); }
});
$('#loja-cat-fechar').addEventListener('click', () => { $('#loja-cat-wrap').hidden = true; });
$('#loja-cat-cancelar').addEventListener('click', limparFormCategoria);

$('#loja-cat-lista').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cat-acao]');
  if (!b) return;
  const id = Number(b.closest('.cat-item').dataset.id);
  const cat = estado.lojaCategorias.find((c) => c.id === id);
  if (!cat) return;
  if (b.dataset.catAcao === 'editar') {
    const f = $('#loja-cat-form');
    f.elements.id.value = cat.id; f.elements.nome.value = cat.nome;
    $('#loja-cat-cancelar').hidden = false;
    f.elements.nome.focus();
    return;
  }
  if (!confirm(`Excluir a categoria “${cat.nome}”? Os itens dela ficarão sem categoria.`)) return;
  try { await api(`/api/loja-categorias/${id}`, { method: 'DELETE' }); limparFormCategoria(); await carregarLoja(); }
  catch (err) { $('#loja-cat-erro').textContent = err.message; }
});

$('#loja-cat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, erroEl = $('#loja-cat-erro');
  erroEl.textContent = '';
  const nome = f.elements.nome.value.trim();
  if (nome.length < 2) { erroEl.textContent = 'Informe o nome da categoria.'; return; }
  const id = f.elements.id.value ? Number(f.elements.id.value) : null;
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api(id ? `/api/loja-categorias/${id}` : '/api/loja-categorias', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ nome }) });
    limparFormCategoria();
    await carregarLoja();
  } catch (err) { erroEl.textContent = err.message; }
  finally { btn.disabled = false; }
});