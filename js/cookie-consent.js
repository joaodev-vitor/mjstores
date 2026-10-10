/* =========================================================
   COOKIE CONSENT — Banner LGPD (com detecção de tema)
   ========================================================= */

'use strict';

(function() {

    const STORAGE_KEY = 'seyn_cookie_consent';
    const VERSION = '1.0';

    /* =========================================================
       DETECÇÃO DE TEMA
       Aplica o data-tema atual no elemento pra herdar CSS
       ========================================================= */
    function obterTemaAtual() {
        return document.documentElement.getAttribute('data-tema')
            || document.body.getAttribute('data-tema')
            || 'escuro';
    }

    function aplicarTemaNoElemento(elemento) {
        if (!elemento) return;
        elemento.setAttribute('data-tema', obterTemaAtual());
    }

    /* Escuta mudanças de tema (clique no botão sol/lua) */
    function observarMudancaDeTema(callback) {
        const observer = new MutationObserver(function() {
            callback(obterTemaAtual());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-tema']
        });

        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['data-tema']
            });
        }

        return observer;
    }

    /* =========================================================
       STORAGE
       ========================================================= */
    function jaDecidiu() {
        try {
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (!salvo) return false;
            const dados = JSON.parse(salvo);
            return dados && dados.versao === VERSION;
        } catch (e) {
            return false;
        }
    }

    function salvarDecisao(decisao) {
        const dados = {
            versao: VERSION,
            decisao: decisao,
            data: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
        } catch (e) {}
    }

    /* =========================================================
       BANNER PRINCIPAL
       ========================================================= */
    function criarBanner() {

        const banner = document.createElement('div');
        banner.id = 'cookieBanner';

        /* ✅ Aplica o tema atual no próprio banner */
        aplicarTemaNoElemento(banner);

        banner.innerHTML = `
            <div class="cookie-banner-inner">
                <div class="cookie-banner-text">
                    <strong>🍪 Este site usa cookies</strong>
                    <p>Usamos cookies para melhorar sua experiência, analisar o tráfego e personalizar conteúdo.
                    Você pode aceitar todos, recusar os não essenciais ou personalizar suas preferências.
                    Saiba mais na nossa <a href="privacidade.html" target="_blank">Política de Privacidade</a>.</p>
                </div>
                <div class="cookie-banner-actions">
                    <button type="button" class="cookie-btn cookie-btn-reject" data-acao="recusar">Recusar não essenciais</button>
                    <button type="button" class="cookie-btn cookie-btn-custom" data-acao="personalizar">Personalizar</button>
                    <button type="button" class="cookie-btn cookie-btn-accept" data-acao="aceitar">Aceitar todos</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        /* ✅ Escuta mudanças de tema e atualiza o banner em tempo real */
        observarMudancaDeTema(function(novoTema) {
            banner.setAttribute('data-tema', novoTema);
        });

        /* Registra cliques */
        banner.querySelectorAll('[data-acao]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const acao = this.getAttribute('data-acao');

                if (acao === 'personalizar') {
                    abrirModalPersonalizar();
                    return;
                }

                salvarDecisao(acao);
                fecharBanner();

                if (acao === 'aceitar') {
                    ativarCookiesAnaliticos();
                }
            });
        });

        /* Animação de entrada */
        setTimeout(function() {
            banner.classList.add('show');
        }, 1000);
    }

    /* =========================================================
       FECHAR BANNER
       ========================================================= */
    function fecharBanner() {
        const banner = document.getElementById('cookieBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(function() {
                banner.remove();
            }, 400);
        }
    }

    /* =========================================================
       MODAL DE PERSONALIZAÇÃO
       ========================================================= */
    function abrirModalPersonalizar() {

        const modal = document.createElement('div');
        modal.id = 'cookieModal';

        /* ✅ Aplica o tema atual no modal também */
        aplicarTemaNoElemento(modal);

        modal.innerHTML = `
            <div class="cookie-modal-backdrop"></div>
            <div class="cookie-modal-box">
                <h3>Personalizar cookies</h3>
                <p>Escolha quais categorias de cookies você aceita.</p>

                <div class="cookie-cat">
                    <div class="cookie-cat-info">
                        <strong>Essenciais</strong>
                        <small>Necessários para login, carrinho e funcionamento do site. Não podem ser desativados.</small>
                    </div>
                    <span class="cookie-cat-status">Sempre ativos</span>
                </div>

                <div class="cookie-cat">
                    <div class="cookie-cat-info">
                        <strong>Analíticos</strong>
                        <small>Ajudam a entender como os visitantes usam o site (páginas mais vistas, tempo de permanência).</small>
                    </div>
                    <label class="cookie-switch">
                        <input type="checkbox" id="optAnaliticos" checked>
                        <span class="cookie-slider"></span>
                    </label>
                </div>

                <div class="cookie-cat">
                    <div class="cookie-cat-info">
                        <strong>Marketing</strong>
                        <small>Usados para exibir anúncios personalizados e medir a eficácia de campanhas.</small>
                    </div>
                    <label class="cookie-switch">
                        <input type="checkbox" id="optMarketing">
                        <span class="cookie-slider"></span>
                    </label>
                </div>

                <div class="cookie-modal-actions">
                    <button type="button" class="cookie-btn cookie-btn-reject" id="modalRecusar">Recusar todos</button>
                    <button type="button" class="cookie-btn cookie-btn-accept" id="modalSalvar">Salvar preferências</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        /* ✅ Escuta mudanças de tema e atualiza o modal em tempo real */
        observarMudancaDeTema(function(novoTema) {
            modal.setAttribute('data-tema', novoTema);
        });

        setTimeout(function() { modal.classList.add('show'); }, 50);

        /* Fechar ao clicar no backdrop */
        modal.querySelector('.cookie-modal-backdrop').addEventListener('click', function() {
            modal.remove();
        });

        /* Recusar todos */
        modal.querySelector('#modalRecusar').addEventListener('click', function() {
            salvarDecisao('recusar');
            modal.remove();
            fecharBanner();
        });

        /* Salvar personalizado */
        modal.querySelector('#modalSalvar').addEventListener('click', function() {
            const analiticos = document.getElementById('optAnaliticos').checked;
            const marketing = document.getElementById('optMarketing').checked;

            salvarDecisao({
                tipo: 'personalizado',
                analiticos: analiticos,
                marketing: marketing
            });

            modal.remove();
            fecharBanner();

            if (analiticos) ativarCookiesAnaliticos();
        });
    }

    /* =========================================================
       ANALYTICS (placeholder)
       ========================================================= */
    function ativarCookiesAnaliticos() {
        console.log('[cookies] Cookies analíticos ativados');
        /*
        if (typeof gtag === 'function') {
            gtag('consent', 'update', { analytics_storage: 'granted' });
        }
        */
    }

    /* =========================================================
       INIT
       ========================================================= */
    function init() {
        if (jaDecidiu()) return;
        criarBanner();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();