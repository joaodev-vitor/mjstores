/* =========================================================
   SCRIPT.JS — Funções globais do site
   Header, menu mobile, busca, reveal on scroll
   ========================================================= */

'use strict';


/* ---------------------------------------------------------
   TOAST GLOBAL (usado por todas as páginas) — com ícones
   --------------------------------------------------------- */
window.toast = function (msg, tipo) {

    tipo = tipo || 'info';

    var stack = document.getElementById('toastStack');

    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toastStack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
    }

    var icons = {
        success: '<path d="M20 6L9 17l-5-5"/>',
        error:   '<path d="M18 6L6 18M6 6l12 12"/>',
        warn:    '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
        info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    var icon = icons[tipo] || icons.info;

    var el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            icon +
        '</svg>' +
        '<span>' + msg + '</span>';

    stack.appendChild(el);

    setTimeout(function () {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(function () { el.remove(); }, 300);
    }, 3000);
};


/* ---------------------------------------------------------
   HEADER COMPACTADO AO ROLAR
   --------------------------------------------------------- */
const header = document.getElementById('header');

if (header) {

    window.addEventListener('scroll', () => {

        if (window.scrollY > 40) header.classList.add('scrolled');
        else header.classList.remove('scrolled');

    }, { passive: true });
}


/* ---------------------------------------------------------
   MENU MOBILE
   --------------------------------------------------------- */
function abrirMenu() {

    const nav = document.getElementById('nav');
    if (!nav) return;

    nav.classList.add('open');
    document.body.style.overflow = 'hidden';
}


function fecharMenu() {

    const nav = document.getElementById('nav');
    if (!nav) return;

    nav.classList.remove('open');
    document.body.style.overflow = '';
}


/* ---------------------------------------------------------
   BUSCA
   --------------------------------------------------------- */
function abrirBusca() {

    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const input = document.getElementById('searchInput');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}


function fecharBusca() {

    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    document.body.style.overflow = '';
}


function pesquisarProduto() {

    const input = document.getElementById('searchInput');
    if (!input) return;

    const termo = input.value.trim();

    if (!termo) {
        input.focus();
        return;
    }

    window.location.href = `busca.html?q=${encodeURIComponent(termo)}`;
}


/* ---------------------------------------------------------
   SUBMIT NO INPUT DE BUSCA (ENTER)
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchInput');

    if (searchInput) {

        searchInput.addEventListener('keydown', (e) => {

            if (e.key === 'Enter') {
                e.preventDefault();
                pesquisarProduto();
            }
        });
    }
});


/* ---------------------------------------------------------
   FECHAR COM ESC
   --------------------------------------------------------- */
document.addEventListener('keydown', (e) => {

    if (e.key === 'Escape') {
        fecharBusca();
        fecharMenu();
    }
});


/* ---------------------------------------------------------
   FECHAR BUSCA CLICANDO FORA DO BOX
   --------------------------------------------------------- */
document.addEventListener('click', (e) => {

    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    if (!overlay.classList.contains('open')) return;

    if (e.target === overlay) fecharBusca();
});


/* ---------------------------------------------------------
   REVEAL ON SCROLL
   --------------------------------------------------------- */
if ('IntersectionObserver' in window) {

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });

    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-mask')
        .forEach(el => observer.observe(el));
}


/* ---------------------------------------------------------
   EXPÕE GLOBALMENTE
   --------------------------------------------------------- */
window.abrirMenu = abrirMenu;
window.fecharMenu = fecharMenu;
window.abrirBusca = abrirBusca;
window.fecharBusca = fecharBusca;
window.pesquisarProduto = pesquisarProduto;


/* =========================================================
   CONTA NO HEADER — nome + dropdown
   ========================================================= */
(function () {

    if (!window.auth) return;

    auth.onAuthStateChanged(function (user) {

        var wrap     = document.querySelector('.conta-wrap');
        var btn      = document.getElementById('contaHeaderBtn') ||
                       document.querySelector('.conta-button');

        var nomeEl   = document.getElementById('contaNomeHeader');
        var fullEl   = document.getElementById('contaNomeFull');
        var emailEl  = document.getElementById('contaEmailHeader');
        var avatarEl = document.getElementById('contaAvatarHeader');

        if (!btn) return;

        if (user) {

            if (wrap) wrap.classList.add('logado');
            btn.classList.add('logado');
            btn.href = 'minha-conta.html';

            var nome = user.displayName ||
                       (user.email ? user.email.split('@')[0] : 'Cliente');

            if (nomeEl)   nomeEl.textContent = nome.split(' ')[0];
            if (fullEl)   fullEl.textContent = nome;
            if (emailEl)  emailEl.textContent = user.email || '';
            if (avatarEl) avatarEl.textContent = nome.charAt(0).toUpperCase();

        } else {

            if (wrap) wrap.classList.remove('logado');
            btn.classList.remove('logado');
            btn.href = 'login.html';

            if (nomeEl)  nomeEl.textContent = '';
        }
    });

    /* Abre/fecha dropdown */
    document.addEventListener('click', function (e) {

        var wrap = document.querySelector('.conta-wrap');
        if (!wrap) return;

        var btn = wrap.querySelector('.conta-button');

        if (btn && btn.contains(e.target)) {
            if (wrap.classList.contains('logado')) {
                e.preventDefault();
                wrap.classList.toggle('aberto');
            }
            return;
        }

        if (!wrap.contains(e.target)) wrap.classList.remove('aberto');
    });

    /* Fecha com ESC */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.conta-wrap.aberto')
                .forEach(function (w) { w.classList.remove('aberto'); });
        }
    });

})();