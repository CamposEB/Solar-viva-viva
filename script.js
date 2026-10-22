'use strict';

/* ============================================================
   CONFIGURAÇÃO CENTRAL
   ============================================================ */
const CONFIG = {
  whatsapp: {
    numero: '5521992424254',
    mensagemPadrao:
      'Olá! Vi o site do Salão Solar Viva Viva e gostaria de solicitar um orçamento.',
  },
  animacoes: true,
  scrollspy: true,
};

/* ============================================================
   FOTOS DA GALERIA
   EDITAR AQUI: adicione fotos reais quando estiverem disponíveis.
   Enquanto o array estiver vazio, a seção Galeria fica OCULTA
   automaticamente e o <li> do menu é removido.

   Exemplo:
   const FOTOS = [
     { src: 'assets/foto1.jpg', alt: 'Salão interno com lustres', legenda: 'Salão interno' },
     { src: 'assets/foto2.jpg', alt: 'Área externa iluminada',   legenda: 'Área externa' },
   ];
   ============================================================ */
const FOTOS = [];

/* ============================================================
   HELPERS
   ============================================================ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduzirMovimento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   WHATSAPP — preenche todos os links [data-wa]
   ============================================================ */
function initWhatsApp() {
  const { numero, mensagemPadrao } = CONFIG.whatsapp;
  $$('[data-wa]').forEach((el) => {
    const mensagem = el.dataset.waMensagem || mensagemPadrao;
    el.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
}

/* ============================================================
   HEADER — fundo ao rolar
   ============================================================ */
function initHeader() {
  const header = $('.header');
  if (!header) return;
  const atualizar = () => {
    header.classList.toggle('header--scrolled', window.scrollY > 40);
  };
  atualizar();
  window.addEventListener('scroll', atualizar, { passive: true });
}

/* ============================================================
   MENU MOBILE
   ============================================================ */
function initMobileMenu() {
  const toggle = $('.menu-toggle');
  const nav    = $('.nav');
  if (!toggle || !nav) return;

  const fechar = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    document.body.style.overflow = '';
  };
  const abrir = () => {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';
  };

  toggle.addEventListener('click', () => {
    nav.classList.contains('is-open') ? fechar() : abrir();
  });
  $$('.nav__lista a, .nav__cta', nav).forEach((link) => {
    link.addEventListener('click', fechar);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      fechar();
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (
      nav.classList.contains('is-open') &&
      !nav.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      fechar();
    }
  });
}

/* ============================================================
   SCROLL PROGRESS
   ============================================================ */
function initScrollProgress() {
  const barra = $('#scroll-progress');
  if (!barra) return;
  let rafId = null;
  const atualizar = () => {
    const scrollTop = window.scrollY;
    const altura = document.documentElement.scrollHeight - window.innerHeight;
    const progresso = altura > 0 ? (scrollTop / altura) * 100 : 0;
    barra.style.width = `${progresso}%`;
    rafId = null;
  };
  const agendar = () => {
    if (rafId === null) rafId = requestAnimationFrame(atualizar);
  };
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  atualizar();
}

/* ============================================================
   REVELAÇÃO AO ROLAR
   ============================================================ */
function initReveal() {
  if (!CONFIG.animacoes || reduzirMovimento()) {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const el = entrada.target;
        const irmaos = Array.from(el.parentElement.children).filter((c) =>
          c.hasAttribute('data-reveal')
        );
        const indice = irmaos.indexOf(el);
        el.style.transitionDelay = `${Math.max(0, indice) * 0.08}s`;
        el.classList.add('is-visible');
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );
  $$('[data-reveal]').forEach((el) => observer.observe(el));
}

/* ============================================================
   ABAS DE EVENTOS
   ============================================================ */
function initTabs() {
  const abas = $$('.aba');
  const paineis = $$('.painel');
  const indicador = $('.abas__indicador');
  if (!abas.length || !paineis.length) return;

  const posicionarIndicador = (abaAtiva) => {
    if (!indicador || !abaAtiva) return;
    indicador.style.left  = `${abaAtiva.offsetLeft}px`;
    indicador.style.width = `${abaAtiva.offsetWidth}px`;
  };
  const ativar = (indice, focar = false) => {
    abas.forEach((aba, i) => {
      const ativo = i === indice;
      aba.setAttribute('aria-selected', ativo ? 'true' : 'false');
      aba.tabIndex = ativo ? 0 : -1;
      if (ativo && focar) aba.focus();
    });
    paineis.forEach((painel, i) => { painel.hidden = i !== indice; });
    posicionarIndicador(abas[indice]);
  };
  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => ativar(i));
    aba.addEventListener('keydown', (e) => {
      let novo = null;
      if (e.key === 'ArrowRight') novo = (i + 1) % abas.length;
      else if (e.key === 'ArrowLeft')  novo = (i - 1 + abas.length) % abas.length;
      else if (e.key === 'Home')       novo = 0;
      else if (e.key === 'End')        novo = abas.length - 1;
      if (novo !== null) {
        e.preventDefault();
        ativar(novo, true);
      }
    });
  });
  const inicial = abas.findIndex((a) => a.getAttribute('aria-selected') === 'true');
  ativar(inicial >= 0 ? inicial : 0);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const ativa = abas.find((a) => a.getAttribute('aria-selected') === 'true');
      posicionarIndicador(ativa);
    }, 150);
  });
}

/* ============================================================
   GALERIA DINÂMICA
   ============================================================ */
function initGaleria() {
  const secao  = $('#galeria');
  const grid   = $('#galeria-grid');
  const liNav  = $('[data-nav-galeria]');

  // Sem fotos: oculta seção, remove o <li> do menu inteiro
  if (!FOTOS.length) {
    if (secao) secao.classList.add('oculto');
    if (liNav) liNav.classList.add('oculto');
    return;
  }

  // Com fotos: mostra tudo
  if (secao) secao.classList.remove('oculto');
  if (liNav) liNav.classList.remove('oculto');
  if (!grid) return;

  FOTOS.forEach((foto) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'galeria__item';
    btn.dataset.caption = foto.legenda || foto.alt;
    btn.setAttribute('aria-label', `Ampliar foto: ${foto.alt}`);
    btn.innerHTML = `
      <img src="${foto.src}" alt="${foto.alt}"
           loading="lazy" decoding="async"
           onerror="this.closest('.galeria__item').style.display='none'">
      <span class="galeria__legenda">${foto.legenda || ''}</span>
    `;
    grid.appendChild(btn);
  });

  initLightbox();
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
function initLightbox() {
  const lightbox  = $('#lightbox');
  if (!lightbox) return;

  const img       = $('#lightbox-img');
  const legenda   = $('#lightbox-legenda');
  const contador  = $('#lightbox-contador');
  const btnFechar = $('.lightbox__fechar', lightbox);
  const btnPrev   = $('.lightbox__nav--prev', lightbox);
  const btnNext   = $('.lightbox__nav--next', lightbox);
  const itens     = $$('.galeria__item');
  if (!itens.length) return;

  let atual = 0;
  let focoAnterior = null;

  const mostrar = (indice) => {
    atual = (indice + itens.length) % itens.length;
    const item = itens[atual];
    const imgItem = $('img', item);
    if (!imgItem) return;
    img.src = imgItem.src;
    img.alt = imgItem.alt;
    legenda.textContent = item.dataset.caption || imgItem.alt;
    contador.textContent = `${atual + 1} / ${itens.length}`;
  };
  const abrir = (indice) => {
    focoAnterior = document.activeElement;
    mostrar(indice);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    btnFechar.focus();
  };
  const fechar = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
  };
  const proximo = () => mostrar(atual + 1);
  const anterior = () => mostrar(atual - 1);

  itens.forEach((item, i) => item.addEventListener('click', () => abrir(i)));
  btnFechar.addEventListener('click', fechar);
  btnPrev.addEventListener('click', anterior);
  btnNext.addEventListener('click', proximo);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) fechar();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') fechar();
    if (e.key === 'ArrowRight') proximo();
    if (e.key === 'ArrowLeft')  anterior();
    if (e.key === 'Tab') {
      const focaveis = [btnFechar, btnPrev, btnNext];
      const idx = focaveis.indexOf(document.activeElement);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        focaveis[focaveis.length - 1].focus();
      } else if (!e.shiftKey && idx === focaveis.length - 1) {
        e.preventDefault();
        focaveis[0].focus();
      }
    }
  });
  let touchStartX = 0, touchStartY = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? proximo() : anterior();
    }
  }, { passive: true });
}

/* ============================================================
   FORMULÁRIO → WHATSAPP
   ============================================================ */
function initForm() {
  const form = $('#form-orcamento');
  if (!form) return;
  const status = $('#form-status');
  const { numero } = CONFIG.whatsapp;

  const formatarData = (valor) => {
    if (!valor) return '';
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome  = form.nome.value.trim();
    const tipo  = form['tipo-evento'].value;
    const data  = form['data-evento'].value;
    const conv  = form.convidados.value.trim();

    if (!nome) {
      status.textContent = 'Por favor, informe seu nome.';
      status.classList.add('form__status--erro');
      form.nome.focus();
      return;
    }
    if (!tipo) {
      status.textContent = 'Por favor, selecione o tipo de evento.';
      status.classList.add('form__status--erro');
      form['tipo-evento'].focus();
      return;
    }
    status.classList.remove('form__status--erro');

    let msg = `Olá! Meu nome é ${nome} e vi o site do Salão Solar Viva Viva. `;
    msg += `Gostaria de solicitar um orçamento para ${tipo.toLowerCase()}`;
    if (data) msg += `, previsto para ${formatarData(data)}`;
    if (conv) msg += `, com aproximadamente ${conv} convidados`;
    msg += '.';

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    status.textContent = 'Abrindo o WhatsApp…';
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
}

/* ============================================================
   SCROLLSPY
   ============================================================ */
function initScrollspy() {
  if (!CONFIG.scrollspy) return;
  const links = $$('[data-nav]');
  const secoes = links
    .map((link) => $(link.getAttribute('href')))
    .filter(Boolean);
  if (!links.length || !secoes.length) return;

  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const id = `#${entrada.target.id}`;
        links.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === id);
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  secoes.forEach((secao) => observer.observe(secao));
}

/* ============================================================
   ANO DO RODAPÉ
   ============================================================ */
function initAno() {
  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initWhatsApp();
  initHeader();
  initMobileMenu();
  initScrollProgress();
  initReveal();
  initTabs();
  initGaleria();
  initForm();
  initScrollspy();
  initAno();
});