/* =========================================================
   COOKIE CONSENT — Banner LGPD
   ========================================================= */

'use strict';

(function() {

    const STORAGE_KEY = 'seyn_cookie_consent';
    const VERSION = '1.0';

    /* Se já aceitou/recusou, não mostra o banner */
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

    /* Salva a decisão do usuário */
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

    /* Cria o HTML do banner */
    function criarBanner() {

        const banner = document.createElement('div');
        banner.id = 'cookieBanner';
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

    /* Fecha o banner */
    function fecharBanner() {
        const banner = document.getElementById('cookieBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(function() {
                banner.remove();
            }, 400);
        }
    }

    /* Modal de personalização */
    function abrirModalPersonalizar() {

        const modal = document.createElement('div');
        modal.id = 'cookieModal';
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

    /* Aqui você ativa scripts de analytics (Google Analytics, etc) */
    function ativarCookiesAnaliticos() {
        console.log('[cookies] Cookies analíticos ativados');
        /* 
        if (typeof gtag === 'function') {
            gtag('consent', 'update', { analytics_storage: 'granted' });
        }
        */
    }

    /* Inicializa */
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