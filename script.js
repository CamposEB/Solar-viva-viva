'use strict';

/* ===== CONFIGURAÇÃO CENTRAL ===== */
const CONFIG = {
  whatsapp: {
    numero: '5521992424254',
    mensagemPadrao: 'Olá! Quero um orçamento para uma festa no Solar Viva Viva, em Marambaia.',
  },
  animacoes: true,
  scrollspy: true,
};

/* ===== FOTOS DA GALERIA (Fallback Padrão) ===== */
const FOTOS = [
  { src: 'assets/piscina-por-do-sol.jpg', alt: 'Piscina iluminada e salão com lustres ao entardecer', legenda: 'Piscina e salão' },
  { src: 'assets/fachada-noite.jpg',      alt: 'Fachada do castelo à noite, com portão de madeira e brasão', legenda: 'A fachada à noite' },
  { src: 'assets/cerimonia-jardim.jpg',   alt: 'Cadeiras brancas e tapete para cerimônia no jardim', legenda: 'Cerimônia no jardim' },
];

/* ===== HELPERS ===== */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduzirMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== WHATSAPP — preenche todos os links [data-wa] ===== */
function initWhatsApp() {
  const { numero, mensagemPadrao } = CONFIG.whatsapp;
  $$('[data-wa]').forEach((el) => {
    const mensagem = el.dataset.waMensagem || mensagemPadrao;
    el.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
}

/* ===== HEADER — fundo ao rolar ===== */
function initHeader() {
  const header = $('.header');
  if (!header) return;
  const atualizar = () => header.classList.toggle('header--scrolled', window.scrollY > 24);
  atualizar();
  window.addEventListener('scroll', atualizar, { passive: true });
}

/* ===== MENU MOBILE ===== */
function initMobileMenu() {
  const toggle = $('.menu-toggle');
  const nav    = $('.nav');
  if (!toggle || !nav) return;

  const desktop = window.matchMedia('(min-width: 1024px)');

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
  $$('.nav__lista a, .nav__cta', nav).forEach((link) => link.addEventListener('click', fechar));

  document.addEventListener('keydown', (e) => {
    if (!nav.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      fechar();
      toggle.focus();
      return;
    }
    if (e.key === 'Tab') {
      const focaveis = [toggle, ...$$('a[href]', nav)];
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  });

  const aoMudarLargura = (e) => { if (e.matches) fechar(); };
  desktop.addEventListener
    ? desktop.addEventListener('change', aoMudarLargura)
    : desktop.addListener(aoMudarLargura);
}

/* ===== PROGRESSO DE LEITURA ===== */
function initScrollProgress() {
  const barra = $('#scroll-progress');
  if (!barra) return;
  let rafId = null;
  const atualizar = () => {
    const altura = document.documentElement.scrollHeight - window.innerHeight;
    const progresso = altura > 0 ? Math.min(1, window.scrollY / altura) : 0;
    barra.style.transform = `scaleX(${progresso})`;
    rafId = null;
  };
  const agendar = () => {
    if (rafId === null) rafId = requestAnimationFrame(atualizar);
  };
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  atualizar();
}

/* ===== REVELAÇÃO AO ROLAR ===== */
function initReveal() {
  const alvos = $$('[data-reveal]');
  const mostrarTudo = () => alvos.forEach((el) => el.classList.add('is-visible'));

  if (!CONFIG.animacoes || reduzirMovimento() || !('IntersectionObserver' in window)) {
    mostrarTudo();
    return;
  }

  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const el = entrada.target;
        const irmaos = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'));
        const indice = Math.max(0, irmaos.indexOf(el));
        el.style.transitionDelay = `${Math.min(indice, 4) * 0.08}s`;
        el.classList.add('is-visible');
        setTimeout(() => { el.style.transitionDelay = ''; }, 1400);
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );
  alvos.forEach((el) => observer.observe(el));
}

/* ===== ABAS DE EVENTOS ===== */
function initTabs() {
  const lista = $('.abas');
  const abas = $$('.aba');
  const paineis = $$('.painel');
  const indicador = $('.abas__indicador');
  if (!lista || !abas.length || !paineis.length) return;

  const vertical = window.matchMedia('(min-width: 900px)');

  const posicionarIndicador = (aba) => {
    if (!indicador || !aba) return;
    indicador.style.setProperty('--x', `${aba.offsetLeft}px`);
    indicador.style.setProperty('--y', `${aba.offsetTop}px`);
    indicador.style.setProperty('--w', `${aba.offsetWidth}px`);
    indicador.style.setProperty('--h', `${aba.offsetHeight}px`);
  };
  const orientar = () => {
    lista.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
  };
  const centralizarNoMobile = (aba) => {
    if (vertical.matches) return;
    const wrap = aba.closest('.abas-wrap');
    if (!wrap) return;
    wrap.scrollTo({
      left: aba.offsetLeft - (wrap.clientWidth - aba.offsetWidth) / 2,
      behavior: reduzirMovimento() ? 'auto' : 'smooth',
    });
  };

  const ativar = (indice, { focar = false, rolar = true } = {}) => {
    abas.forEach((aba, i) => {
      const ativo = i === indice;
      aba.setAttribute('aria-selected', ativo ? 'true' : 'false');
      aba.tabIndex = ativo ? 0 : -1;
      if (ativo && focar) aba.focus({ preventScroll: true });
    });
    paineis.forEach((painel, i) => { painel.hidden = i !== indice; });
    posicionarIndicador(abas[indice]);
    if (rolar) centralizarNoMobile(abas[indice]);
  };

  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => ativar(i));
    aba.addEventListener('keydown', (e) => {
      let novo = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') novo = (i + 1) % abas.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') novo = (i - 1 + abas.length) % abas.length;
      else if (e.key === 'Home') novo = 0;
      else if (e.key === 'End') novo = abas.length - 1;
      if (novo !== null) {
        e.preventDefault();
        ativar(novo, { focar: true });
      }
    });
  });

  $$('[data-aba]').forEach((link) => {
    link.addEventListener('click', () => {
      const i = abas.findIndex((a) => a.id === `tab-${link.dataset.aba}`);
      if (i >= 0) ativar(i, { rolar: false });
    });
  });

  const reposicionar = () => {
    orientar();
    posicionarIndicador(abas.find((a) => a.getAttribute('aria-selected') === 'true'));
  };

  orientar();
  const inicial = abas.findIndex((a) => a.getAttribute('aria-selected') === 'true');
  ativar(inicial >= 0 ? inicial : 0, { rolar: false });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reposicionar);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reposicionar, 120);
  });
}

/* ===== FAQ ===== */
function initFaq() {
  $$('.faq__item').forEach((det) => {
    const resumo = $('summary', det);
    const painel = $('.faq__resposta', det);
    if (!resumo || !painel) return;

    const opcoes = { duration: 320, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' };
    let anim = null;

    const encerrar = () => {
      if (anim) { anim.onfinish = null; anim.cancel(); anim = null; }
      painel.style.overflow = '';
      det.classList.remove('is-fechando');
    };
    const abrir = () => {
      det.open = true;
      painel.style.overflow = 'hidden';
      anim = painel.animate({ height: ['0px', `${painel.scrollHeight}px`] }, opcoes);
      anim.onfinish = encerrar;
    };
    const fechar = () => {
      const altura = painel.offsetHeight;
      det.classList.add('is-fechando');
      painel.style.overflow = 'hidden';
      anim = painel.animate({ height: [`${altura}px`, '0px'] }, opcoes);
      anim.onfinish = () => { det.open = false; encerrar(); };
    };

    resumo.addEventListener('click', (e) => {
      e.preventDefault();
      if (reduzirMovimento() || typeof painel.animate !== 'function') {
        det.open = !det.open;
        return;
      }
      const estavaFechando = det.classList.contains('is-fechando');
      encerrar();
      if (estavaFechando) abrir();
      else if (det.open) fechar();
      else abrir();
    });
  });
}

/* ===== GALERIA DINÂMICA ===== */
window.renderGaleria = function(fotos) {
  const secao = $('#galeria');
  const grid  = $('#galeria-grid');
  const itensNav = $$('[data-nav-galeria]');

  const mostrarGaleria = (visivel) => {
    if (secao) secao.classList.toggle('oculto', !visivel);
    itensNav.forEach((el) => el.classList.toggle('oculto', !visivel));
  };

  if (!fotos || !fotos.length) {
    mostrarGaleria(false);
    return;
  }

  mostrarGaleria(true);
  if (!grid) return;
  
  grid.innerHTML = ''; // Limpa a galeria padrão para injetar as dinâmicas

  fotos.forEach((foto) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'galeria__item';
    btn.dataset.caption = foto.legenda || foto.alt || '';
    btn.setAttribute('aria-label', `Ampliar foto: ${foto.alt || foto.legenda || 'galeria'}`);

    const img = document.createElement('img');
    img.src = foto.src;
    img.alt = foto.alt || foto.legenda || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      btn.style.display = 'none'; // Esconde a foto se ela for apagada do R2
    });
    btn.appendChild(img);

    if (foto.legenda) {
      const legenda = document.createElement('span');
      legenda.className = 'galeria__legenda';
      legenda.textContent = foto.legenda;
      btn.appendChild(legenda);
    }
    grid.appendChild(btn);
  });

  initLightbox();
};

function initGaleria() {
  window.renderGaleria(FOTOS);
}

/* ===== LIGHTBOX (Otimizado para Event Delegation) ===== */
function initLightbox() {
  const lightbox = $('#lightbox');
  const grid = $('#galeria-grid');
  if (!lightbox || !grid) return;

  const img       = $('#lightbox-img');
  const legenda   = $('#lightbox-legenda');
  const contador  = $('#lightbox-contador');
  const btnFechar = $('.lightbox__fechar', lightbox);
  const btnPrev   = $('.lightbox__nav--prev', lightbox);
  const btnNext   = $('.lightbox__nav--next', lightbox);

  let atual = 0;
  let focoAnterior = null;

  const pre = (indice) => {
    const itens = $$('.galeria__item');
    const item = itens[(indice + itens.length) % itens.length];
    const imgItem = item && $('img', item);
    if (imgItem) new Image().src = imgItem.currentSrc || imgItem.src;
  };

  const mostrar = (indice) => {
    const itens = $$('.galeria__item');
    atual = (indice + itens.length) % itens.length;
    const item = itens[atual];
    const imgItem = $('img', item);
    if (!imgItem) return;
    img.src = imgItem.currentSrc || imgItem.src;
    img.alt = imgItem.alt;
    legenda.textContent = item.dataset.caption || imgItem.alt;
    contador.textContent = itens.length > 1 ? `${atual + 1} / ${itens.length}` : '';
    pre(atual + 1);
    pre(atual - 1);
  };
  
  const abrir = (indice) => {
    const itens = $$('.galeria__item');
    if (itens.length === 1) { btnPrev.hidden = true; btnNext.hidden = true; }
    else { btnPrev.hidden = false; btnNext.hidden = false; }
    
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
  
  const proximo  = () => { if ($$('.galeria__item').length > 1) mostrar(atual + 1); };
  const anterior = () => { if ($$('.galeria__item').length > 1) mostrar(atual - 1); };

  // Event Delegation no Grid (funciona mesmo se o dynamic.js apagar/recriar as fotos)
  if (!grid.dataset.lbClick) {
    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.galeria__item');
      if (!item) return;
      const itens = $$('.galeria__item');
      const i = itens.indexOf(item);
      if (i >= 0) abrir(i);
    });
    grid.dataset.lbClick = 'true';
  }

  // Bind de eventos globais do Lightbox apenas uma vez
  if (!lightbox.dataset.lbBound) {
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
        const focaveis = [btnFechar, btnPrev, btnNext].filter((b) => !b.hidden);
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

    let touchStartX = 0;
    let touchStartY = 0;
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
    
    lightbox.dataset.lbBound = 'true';
  }
}

/* ===== FORMULÁRIO → WHATSAPP ===== */
function initForm() {
  const form = $('#form-orcamento');
  if (!form) return;
  const status = $('#form-status');
  const { numero } = CONFIG.whatsapp;

  const doisDigitos = (n) => String(n).padStart(2, '0');
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;

  const campoData = form.elements['data-evento'];
  if (campoData) campoData.min = hoje;

  const formatarData = (valor) => {
    if (!valor) return '';
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const artigoEvento = {
    'Casamento': 'um casamento',
    '15 anos': 'uma festa de 15 anos',
    'Aniversário': 'um aniversário',
    'Formatura': 'uma formatura',
    'Evento corporativo': 'um evento corporativo',
    'Outro': 'um evento',
  };

  const regras = {
    'nome': (v) => (v.trim().length < 2 ? 'Diga como podemos te chamar.' : ''),
    'tipo-evento': (v) => (!v ? 'Escolha o tipo de festa.' : ''),
    'data-evento': (v) => (v && v < hoje ? 'Essa data já passou. Escolha hoje ou um dia à frente.' : ''),
    'convidados': (v) => {
      if (!v.trim()) return '';
      const n = Number(v);
      return !Number.isInteger(n) || n < 1 ? 'Use um número inteiro, a partir de 1.' : '';
    },
  };

  const validar = (el) => {
    const regra = regras[el.name];
    if (!regra) return true;
    const mensagem = regra(el.value);
    const campo = el.closest('.campo');
    const erro = $(`#erro-${el.id}`);
    const opcionalVazio = !el.required && !el.value.trim();

    if (campo) {
      campo.classList.toggle('campo--erro', Boolean(mensagem));
      campo.classList.toggle('campo--ok', !mensagem && !opcionalVazio);
    }
    if (erro) erro.textContent = mensagem;
    el.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
    return !mensagem;
  };

  const mostrarStatus = (texto, tipo, url) => {
    status.className = 'form__status' + (tipo ? ` form__status--${tipo}` : '');
    status.replaceChildren(document.createTextNode(texto));
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Abrir WhatsApp manualmente.';
      status.append(' ', link);
    }
  };

  const camposValidaveis = Object.keys(regras)
    .map((nome) => form.elements[nome])
    .filter(Boolean);

  camposValidaveis.forEach((el) => {
    el.addEventListener('blur', () => { if (el.value || el.required) validar(el); });
    const revalidar = () => {
      const campo = el.closest('.campo');
      if (campo && campo.classList.contains('campo--erro')) validar(el);
    };
    el.addEventListener('input', revalidar);
    el.addEventListener('change', () => validar(el));
  });

  let limparStatus;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(limparStatus);

    const invalidos = camposValidaveis.filter((el) => !validar(el));
    if (invalidos.length) {
      mostrarStatus('Falta algum dado nos campos marcados.', 'erro');
      invalidos[0].focus();
      return;
    }

    const nome = form.nome.value.trim();
    const tipo = form['tipo-evento'].value;
    const data = form['data-evento'].value;
    const conv = form.convidados.value.trim();
    const obs  = form.obs ? form.obs.value.trim() : '';

    let msg = `Olá! Meu nome é ${nome}. Quero um orçamento para ${artigoEvento[tipo] || 'um evento'} no Solar Viva Viva`;
    if (data) msg += `, na data ${formatarData(data)}`;
    if (conv) msg += `, para cerca de ${conv} convidados`;
    msg += '.';
    if (obs) msg += `\n${obs}`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;

    const ponte = document.createElement('a');
    ponte.href = url;
    ponte.target = '_blank';
    ponte.rel = 'noopener noreferrer';
    document.body.appendChild(ponte);
    ponte.click();
    ponte.remove();

    mostrarStatus('Abrindo o WhatsApp com a sua mensagem.', 'ok', url);
    limparStatus = setTimeout(() => mostrarStatus('', ''), 10000);
  });
}

/* ===== SCROLLSPY ===== */
function initScrollspy() {
  if (!CONFIG.scrollspy || !('IntersectionObserver' in window)) return;
  const links = $$('[data-nav]');
  if (!links.length) return;

  const alvos = new Map();
  $$('main > section[id]').forEach((secao) => {
    const destino = secao.dataset.navAlvo || `#${secao.id}`;
    if (links.some((l) => l.getAttribute('href') === destino)) alvos.set(secao, destino);
  });
  if (!alvos.size) return;

  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const destino = alvos.get(entrada.target);
        links.forEach((link) => {
          const ativo = link.getAttribute('href') === destino;
          link.classList.toggle('is-active', ativo);
          if (ativo) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  alvos.forEach((_, secao) => observer.observe(secao));
}

/* ===== ANO DO RODAPÉ ===== */
function initAno() {
  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();
}

/* ===== INICIALIZAÇÃO ===== */
function iniciar(fn) {
  try { fn(); } catch (erro) { console.error('Solar Viva Viva:', erro); }
}

document.addEventListener('DOMContentLoaded', () => {
  iniciar(initWhatsApp);
  iniciar(initHeader);
  iniciar(initMobileMenu);
  iniciar(initScrollProgress);
  iniciar(initReveal);
  iniciar(initTabs);
  iniciar(initFaq);
  iniciar(initGaleria);
  iniciar(initForm);
  iniciar(initScrollspy);
  iniciar(initAno);
});