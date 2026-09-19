/* =========================================================
   WHATSAPP-FLOAT.JS — Botão flutuante do WhatsApp
   ========================================================= */

'use strict';

(function () {

    if (document.body.classList.contains('app')) return;

    var NUMERO = '5511993890188';
    var MENSAGEM = 'Olá! Quero mais informações.';
    var TOOLTIP = 'Esclareça suas dúvidas';

    var link = 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(MENSAGEM);

    var style = document.createElement('style');
    style.textContent = `
        .wa-float {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 60px;
            height: 60px;
            display: grid;
            place-items: center;
            background: #25D366;
            color: #fff;
            border-radius: 50%;
            box-shadow: 0 8px 24px rgba(37, 211, 102, .4), 0 4px 12px rgba(0, 0, 0, .3);
            cursor: pointer;
            text-decoration: none;
            z-index: 900;
            transition: transform .3s cubic-bezier(.22, 1, .36, 1), box-shadow .3s;
            animation: waPulse 2.5s ease-in-out infinite;
        }

        .wa-float:hover {
            transform: scale(1.08) translateY(-2px);
            box-shadow: 0 12px 32px rgba(37, 211, 102, .55), 0 6px 16px rgba(0, 0, 0, .35);
            animation: none;
        }

        .wa-float svg {
            width: 30px;
            height: 30px;
            fill: #fff;
            display: block;
        }

        .wa-float-tooltip {
            position: absolute;
            right: calc(100% + 14px);
            top: 50%;
            transform: translateY(-50%) translateX(8px);
            padding: 10px 16px;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: .8rem;
            font-weight: 600;
            letter-spacing: .02em;
            color: #04060b;
            background: #f5f7ff;
            border-radius: 8px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity .3s, transform .3s;
            box-shadow: 0 8px 20px rgba(0, 0, 0, .3);
        }

        .wa-float-tooltip::after {
            content: "";
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-left-color: #f5f7ff;
        }

        .wa-float:hover .wa-float-tooltip {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
        }

        @keyframes waPulse {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(37, 211, 102, .4), 0 0 0 0 rgba(37, 211, 102, .5);
            }
            50% {
                box-shadow: 0 8px 24px rgba(37, 211, 102, .4), 0 0 0 14px rgba(37, 211, 102, 0);
            }
        }

        @media (max-width: 720px) {
            .wa-float {
                bottom: 18px;
                right: 18px;
                width: 54px;
                height: 54px;
            }
            .wa-float svg {
                width: 26px;
                height: 26px;
            }
            .wa-float-tooltip {
                display: none;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .wa-float { animation: none; }
        }
    `;
    document.head.appendChild(style);

    var btn = document.createElement('a');
    btn.href = link;
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.className = 'wa-float';
    btn.setAttribute('aria-label', 'Falar no WhatsApp');

    btn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
        '</svg>' +
        '<span class="wa-float-tooltip">' + TOOLTIP + '</span>';

    document.body.appendChild(btn);

})();