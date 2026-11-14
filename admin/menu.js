'use strict';
/* ============================================================
   MENU DO PAINEL — tela cheia, por categorias
   Depende de admin.js: $ e $$
   Para adicionar uma seção nova: inclua um item em MENU abaixo
   (o "tab" é o valor de data-painel da <section>).
   ============================================================ */
(function () {
  const MENU = [
    { rotulo: 'Início', tab: 'dashboard' },
    { rotulo: 'Loja', tab: 'loja' },
    {
      rotulo: 'Divulgação',
      itens: [
        { rotulo: 'Comunicados', tab: 'comunicados', desc: 'Avisos e novidades da casa' },
        { rotulo: 'Letreiro', tab: 'letreiro', desc: 'Faixa de avisos no topo do site' },
        { rotulo: 'Promoções', tab: 'promocoes', desc: 'Campanhas e ofertas' },
      ],
    },
    {
      rotulo: 'Conteúdo',
      itens: [
        { rotulo: 'Galeria', tab: 'galeria', desc: 'Fotos do espaço' },
        { rotulo: 'Depoimentos', tab: 'depoimentos', desc: 'Quem já celebrou no castelo' },
        { rotulo: 'Perguntas frequentes', tab: 'faq', desc: 'Dúvidas dos clientes' },
        { rotulo: 'Textos dos eventos', tab: 'eventos', desc: 'Casamentos, 15 anos, aniversários…' },
      ],
    },
    {
      rotulo: 'Site',
      itens: [
        { rotulo: 'Aparência e textos', tab: 'textos', desc: 'Tema visual e textos da página inicial' },
        { rotulo: 'Contatos', tab: 'contatos', desc: 'WhatsApp, endereço e redes sociais' },
        { rotulo: 'Mídia', tab: 'midia', desc: 'Biblioteca de imagens e vídeos' },
      ],
    },
  ];

  const overlay = $('#menu-overlay');
  const btnAbrir = $('#menu-abrir');
  const btnFechar = $('#menu-fechar');
  const principal = $('#menu-principal');
  const sub = $('#menu-sub');
  const rotulo = $('#menu-rotulo');
  if (!overlay || !btnAbrir || !principal || !sub) return;

  let atual = 'dashboard';

  function achar(tab) {
    for (const g of MENU) {
      if (g.tab === tab) return { grupo: g, item: g };
      for (const i of g.itens || []) if (i.tab === tab) return { grupo: g, item: i };
    }
    return null;
  }

  /* ---------- painéis ---------- */
  function mostrar(tab) {
    const a = achar(tab) || achar('dashboard');
    atual = a.item.tab;
    $$('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== atual; });
    rotulo.textContent = a.grupo === a.item ? a.item.rotulo : `${a.grupo.rotulo} › ${a.item.rotulo}`;
    document.title = `${a.item.rotulo} · Painel — Solar Viva Viva`;
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

  /* ---------- menu ---------- */
  function renderPrincipal() {
    principal.innerHTML = MENU.map((g, i) => {
      const ativo = g.tab === atual || (g.itens || []).some((x) => x.tab === atual);
      return `<li><button type="button" class="menu-link${ativo ? ' ativo' : ''}" data-grupo="${i}"${ativo ? ' aria-current="true"' : ''}>${g.rotulo}${g.itens ? '<span class="menu-link__seta" aria-hidden="true">›</span>' : ''}</button></li>`;
    }).join('');
  }

  function abrirSub(i) {
    const g = MENU[i];
    sub.innerHTML =
      '<button type="button" class="menu-voltar" data-voltar>‹ Menu</button>' +
      `<h2 class="menu-sub__titulo">${g.rotulo}</h2>` +
      '<ul class="menu-sub__lista">' +
      g.itens.map((x) => `<li><button type="button" class="menu-sub__item${x.tab === atual ? ' ativo' : ''}" data-tab="${x.tab}"><strong>${x.rotulo}</strong><small>${x.desc}</small></button></li>`).join('') +
      '</ul>';
    principal.hidden = true;
    sub.hidden = false;
    (sub.querySelector('.ativo') || sub.querySelector('.menu-sub__item')).focus();
  }

  function voltar() {
    sub.hidden = true;
    principal.hidden = false;
    (principal.querySelector('.ativo') || principal.querySelector('button')).focus();
  }

  function abrir() {
    renderPrincipal();
    principal.hidden = false;
    sub.hidden = true;
    overlay.hidden = false;
    document.body.classList.add('menu-aberto');
    btnAbrir.setAttribute('aria-expanded', 'true');
    (principal.querySelector('.ativo') || principal.querySelector('button')).focus();
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
    const grupo = e.target.closest('[data-grupo]');
    if (grupo) {
      const g = MENU[Number(grupo.dataset.grupo)];
      if (g.tab) navegar(g.tab); else abrirSub(Number(grupo.dataset.grupo));
      return;
    }
    const item = e.target.closest('[data-tab]');
    if (item) { navegar(item.dataset.tab); return; }
    if (e.target.closest('[data-voltar]')) { voltar(); return; }
    if (e.target.closest('#btn-perfil, #logout-btn')) fechar(false);
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
    if (e.key !== 'Tab') return;
    const focaveis = $$('button', overlay).filter((b) => b.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  window.addEventListener('popstate', sincronizar);
  window.addEventListener('hashchange', sincronizar);
  sincronizar();
})();