'use strict';

/* ============================================================
   SALÃO SOLAR VIVA VIVA — script.js
   Sem bibliotecas. Todo comportamento é opcional: a página
   funciona sem JS. Nada aqui esconde conteúdo nem bloqueia
   a navegação base.
   ============================================================ */

/* ------------------------------------------------------------
   CONFIGURAÇÃO CENTRAL
   ------------------------------------------------------------ */
const CONFIG = {
  whatsapp: {
    numero: '5521992424254',
    mensagemPadrao:
      'Olá! Vim pelo site do Salão Solar Viva Viva e gostaria de solicitar um orçamento.',
  },
  scrollspy: true,
};

/* ------------------------------------------------------------
   FOTOS DA GALERIA
   EDITAR AQUI: adicione fotos reais quando estiverem disponíveis.
   Enquanto o array estiver vazio, a seção Galeria fica OCULTA
   automaticamente e o <li> do menu é removido.

   Exemplo:
   const FOTOS = [
     { src: 'assets/foto1.jpg', alt: 'Salão interno com lustres', legenda: 'Salão interno' },
     { src: 'assets/foto2.jpg', alt: 'Área externa iluminada',   legenda: 'Área externa' },
   ];
   ------------------------------------------------------------ */
const FOTOS = [];

/* ------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduzirMovimento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   WHATSAPP — preenche todos os [data-wa]
   Se o JS estiver desligado, o href estático (wa.me sem texto)
   continua funcionando como fallback.
   ------------------------------------------------------------ */
function initWhatsApp() {
  const { numero, mensagemPadrao } = CONFIG.whatsapp;
  $$('[data-wa]').forEach((el) => {
    const mensagem = el.dataset.waMensagem || mensagemPadrao;
    el.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
}

/* ------------------------------------------------------------
   HEADER — estado ao rolar
   ------------------------------------------------------------ */
function initHeader() {
  const header = $('.header');
  if (!header) return;
  const atualizar = () => {
    header.classList.toggle('header--scrolled', window.scrollY > 30);
  };
  atualizar();
  window.addEventListener('scroll', atualizar, { passive: true });
}

/* ------------------------------------------------------------
   MENU MOBILE
   ------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   BARRA DE PROGRESSO DE ROLAGEM
   ------------------------------------------------------------ */
function initScrollProgress() {
  const barra = $('#progresso');
  if (!barra) return;
  let rafId = null;
  const atualizar = () => {
    const doc = document.documentElement;
    const total = doc.scrollHeight - doc.clientHeight;
    const pct = total > 0 ? (doc.scrollTop / total) * 100 : 0;
    barra.style.width = `${pct}%`;
    rafId = null;
  };
  const agendar = () => {
    if (rafId === null) rafId = requestAnimationFrame(atualizar);
  };
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  atualizar();
}

/* ------------------------------------------------------------
   PARTÍCULAS DOURADAS (canvas fixo)
   24 no mobile, 48 no desktop. Pausa quando a aba está oculta.
   Respeita prefers-reduced-motion (não cria).
   ------------------------------------------------------------ */
function initParticulas() {
  if (reduzirMovimento()) return;
  const canvas = $('#particulas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let particulas = [];
  let rafId = null;
  let ativo = true;

  const contar = () =>
    window.matchMedia('(max-width: 767px)').matches ? 24 : 48;

  const novaParticula = () => ({
    x: Math.random() * W,
    y: H + Math.random() * 40,
    r: 0.6 + Math.random() * 1.6,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.12 + Math.random() * 0.35),
    alpha: 0.15 + Math.random() * 0.45,
    fase: Math.random() * Math.PI * 2,
    velFase: 0.008 + Math.random() * 0.012,
  });

  function redimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function repovoar() {
    particulas = Array.from({ length: contar() }, () => {
      const p = novaParticula();
      p.y = Math.random() * H;
      return p;
    });
  }

  function desenhar() {
    if (!ativo) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of particulas) {
      p.x += p.vx;
      p.y += p.vy;
      p.fase += p.velFase;
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.fase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(236, 210, 154, ${a.toFixed(3)})`;
      ctx.fill();

      // Reciclagem
      if (p.y < -20) {
        p.x = Math.random() * W;
        p.y = H + 10;
        p.alpha = 0.15 + Math.random() * 0.45;
      }
      if (p.x < -20) p.x = W + 10;
      if (p.x > W + 20) p.x = -10;
    }
    rafId = requestAnimationFrame(desenhar);
  }

  function parar() {
    ativo = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function iniciar() {
    ativo = true;
    if (!rafId) rafId = requestAnimationFrame(desenhar);
  }

  // Inicialização
  redimensionar();
  repovoar();
  iniciar();

  // Resize (com debounce)
  let tResize;
  window.addEventListener('resize', () => {
    clearTimeout(tResize);
    tResize = setTimeout(() => {
      redimensionar();
      repovoar();
    }, 200);
  });

  // Pausa quando a aba fica oculta
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) parar();
    else iniciar();
  });
}

/* ------------------------------------------------------------
   EVENTOS — pré-seleciona o tipo no formulário ao clicar
   O link em si já abre o WhatsApp em nova aba; aqui só deixamos
   o formulário pronto caso a pessoa volte depois.
   ------------------------------------------------------------ */
function initEventos() {
  const select = $('#tipo-evento');
  if (!select) return;
  $$('.evento-card').forEach((card) => {
    const tipo = card.dataset.evento;
    const btn  = $('.btn', card);
    if (!tipo || !btn) return;
    btn.addEventListener('click', () => {
      for (const opt of select.options) {
        if (opt.text.toLowerCase() === tipo.toLowerCase()) {
          select.value = opt.value;
          break;
        }
      }
    });
  });
}

/* ------------------------------------------------------------
   GALERIA DINÂMICA
   Sem FOTOS, oculta a seção e remove o item do menu.
   ------------------------------------------------------------ */
function initGaleria() {
  const secao = $('#galeria');
  const grid  = $('#galeria-grid');
  const liNav = $('[data-nav-galeria]');

  if (!FOTOS.length) {
    if (secao) secao.classList.add('oculto');
    if (liNav) liNav.classList.add('oculto');
    return;
  }
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

/* ------------------------------------------------------------
   LIGHTBOX
   ------------------------------------------------------------ */
function initLightbox() {
  const lightbox = $('#lightbox');
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
  const proximo  = () => mostrar(atual + 1);
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

  // Swipe
  let tx = 0, ty = 0;
  lightbox.addEventListener('touchstart', (e) => {
    tx = e.changedTouches[0].clientX;
    ty = e.changedTouches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? proximo() : anterior();
    }
  }, { passive: true });
}

/* ------------------------------------------------------------
   FORMULÁRIO → WHATSAPP
   ------------------------------------------------------------ */
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
    const nome = form.nome.value.trim();
    const tipo = form['tipo-evento'].value;
    const data = form['data-evento'].value;
    const conv = form.convidados.value.trim();

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

    let msg = `Olá! Meu nome é ${nome} e vim pelo site do Salão Solar Viva Viva. `;
    msg += `Gostaria de solicitar um orçamento para ${tipo.toLowerCase()}`;
    if (data) msg += `, previsto para ${formatarData(data)}`;
    if (conv) msg += `, com aproximadamente ${conv} convidados`;
    msg += '.';

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    status.textContent = 'Abrindo o WhatsApp…';
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => { status.textContent = ''; }, 3500);
  });
}

/* ------------------------------------------------------------
   SCROLLSPY — destaca o link da seção visível
   ------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   ANO DO RODAPÉ
   ------------------------------------------------------------ */
function initAno() {
  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();
}

/* ------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initWhatsApp();
  initHeader();
  initMobileMenu();
  initScrollProgress();
  initParticulas();
  initEventos();
  initGaleria();
  initForm();
  initScrollspy();
  initAno();
});