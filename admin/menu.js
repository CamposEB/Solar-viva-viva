'use strict';
/* ============================================================
   MENU DO PAINEL — Tela Cheia (Estilo Dashboard)
   Todas as opções visíveis de uma vez, divididas por categorias.
   ============================================================ */
(function () {
  const MENU = [
    {
      rotulo: 'Geral',
      itens: [
        { rotulo: 'Início', tab: 'dashboard' },
        { rotulo: 'Loja', tab: 'loja' }
      ]
    },
    {
      rotulo: 'Divulgação',
      itens: [
        { rotulo: 'Comunicados', tab: 'comunicados' },
        { rotulo: 'Letreiro', tab: 'letreiro' },
        { rotulo: 'Promoções', tab: 'promocoes' },
      ],
    },
    {
      rotulo: 'Conteúdo',
      itens: [
        { rotulo: 'Galeria', tab: 'galeria' },
        { rotulo: 'Depoimentos', tab: 'depoimentos' },
        { rotulo: 'FAQ', tab: 'faq' },
        { rotulo: 'Textos Eventos', tab: 'eventos' },
      ],
    },
    {
      rotulo: 'Configurações',
      itens: [
        { rotulo: 'Aparência', tab: 'textos' },
        { rotulo: 'Contatos', tab: 'contatos' },
        { rotulo: 'Mídia', tab: 'midia' },
      ],
    },
  ];

  const overlay = $('#menu-overlay');
  const btnAbrir = $('#menu-abrir');
  const btnFechar = $('#menu-fechar');
  const corpo = $('#menu-corpo');
  const rotulo = $('#menu-rotulo');
  if (!overlay || !btnAbrir || !corpo) return;

  let atual = 'dashboard';

  function achar(tab) {
    for (const g of MENU) {
      for (const i of g.itens) if (i.tab === tab) return i;
    }
    return null;
  }

  /* ---------- painéis ---------- */
  function mostrar(tab) {
    const item = achar(tab) || achar('dashboard');
    atual = item.tab;
    $$('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== atual; });
    rotulo.textContent = item.rotulo;
    document.title = `${item.rotulo} · Painel — Solar Viva Viva`;
  }

  function navegar(tab) {
    fechar(false);
    if (location.hash.slice(1) !== tab) history.pushState(null, '', '#' + tab);
    mostrar(tab);
    window.scrollTo({ top: 0 });
    const h = $(`[data-painel="${atual}"] h2`);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  function sincronizar() { mostrar(location.hash.slice(1) || 'dashboard'); }

  /* ---------- menu visual ---------- */
  function renderMenu() {
    let html = '<div class="menu-grid">';
    MENU.forEach(grupo => {
      html += `<div class="menu-coluna">
        <h3 class="menu-coluna__titulo">${grupo.rotulo}</h3>
        <ul class="menu-coluna__lista">`;
      grupo.itens.forEach(item => {
        const ativo = item.tab === atual;
        html += `<li><button type="button" class="menu-item${ativo ? ' ativo' : ''}" data-tab="${item.tab}">${item.rotulo}</button></li>`;
      });
      html += `</ul></div>`;
    });
    html += '</div>';
    corpo.innerHTML = html;
  }

  function abrir() {
    renderMenu();
    overlay.hidden = false;
    document.body.classList.add('menu-aberto');
    btnAbrir.setAttribute('aria-expanded', 'true');
    const botaoAtivo = overlay.querySelector('.menu-item.ativo');
    if (botaoAtivo) botaoAtivo.focus();
  }

  function fechar(devolverFoco = true) {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('menu-aberto');
    btnAbrir.setAttribute('aria-expanded', 'false');
    if (devolverFoco) btnAbrir.focus();
  }

  /* ---------- eventos ---------- */
  btnAbrir.addEventListener('click', abrir);
  btnFechar.addEventListener('click', () => fechar());

  overlay.addEventListener('click', (e) => {
    const item = e.target.closest('[data-tab]');
    if (item) { navegar(item.dataset.tab); return; }
    if (e.target.closest('#btn-perfil, #logout-btn')) fechar(false);
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); }
  });

  window.addEventListener('popstate', sincronizar);
  window.addEventListener('hashchange', sincronizar);
  sincronizar();
})();