/* =========================================================
   PIX.JS — Geração de QR Code PIX (BR Code / EMV)
   ========================================================= */

'use strict';


/* ---------------------------------------------------------
   CONFIGURAÇÃO PADRÃO (usada se o admin não configurar)
   --------------------------------------------------------- */

const PIX_CONFIG = {
    chave: 'contato@artefatos.com.br',
    nome: 'ARTEFATOS',
    cidade: 'SAO PAULO',
    descricao: '',
    txid: '***'
};


/* ---------------------------------------------------------
   GERAR PAYLOAD PIX (BR Code / EMV)
   --------------------------------------------------------- */

function gerarPayloadPix(valor, chave, nome, cidade, txid, descricao) {

    valor     = parseFloat(valor) || 0;
    chave     = chave     || PIX_CONFIG.chave;
    nome      = nome      || PIX_CONFIG.nome;
    cidade    = cidade    || PIX_CONFIG.cidade;
    txid      = txid      || PIX_CONFIG.txid;
    descricao = descricao || PIX_CONFIG.descricao;


    function tlv(id, value) {
        const str = String(value);
        const len = str.length.toString().padStart(2, '0');
        return id + len + str;
    }


    let merchant = '';

    merchant += tlv('00', 'br.gov.bcb.pix');
    merchant += tlv('01', chave);

    if (descricao) {
        merchant += tlv('02', descricao.slice(0, 72));
    }

    const merchantInfo = tlv('26', merchant);


    const txidLimpo = String(txid)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 25) || '***';

    const additionalData = tlv('62', tlv('05', txidLimpo));


    let payload = '';

    payload += tlv('00', '01');
    payload += merchantInfo;
    payload += tlv('52', '0000');
    payload += tlv('53', '986');
    payload += tlv('54', valor.toFixed(2));
    payload += tlv('58', 'BR');
    payload += tlv('59', nome.slice(0, 25));
    payload += tlv('60', cidade.slice(0, 15));
    payload += additionalData;
    payload += '6304';

    payload += crc16(payload);

    return payload;
}


/* ---------------------------------------------------------
   CRC16-CCITT
   --------------------------------------------------------- */

function crc16(str) {

    let crc = 0xFFFF;

    for (let i = 0; i < str.length; i++) {

        crc ^= str.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {

            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }

            crc &= 0xFFFF;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}


/* ---------------------------------------------------------
   RENDERIZA QR CODE NO CANVAS
   --------------------------------------------------------- */

function renderizarQRCode(canvas, payload) {

    if (!canvas) return;

    if (typeof QRCode === 'undefined') {
        console.warn('Biblioteca QRCode não carregada.');
        return;
    }

    QRCode.toCanvas(canvas, payload, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
            dark:  '#0a0f19',
            light: '#f5f7ff'
        }
    }, (err) => {
        if (err) console.error('Erro ao gerar QR Code:', err);
    });
}


/* ---------------------------------------------------------
   ABRE O MODAL PIX
   --------------------------------------------------------- */

function abrirPixModal(valor, txid) {

    const modal = document.getElementById('pixModal');

    if (!modal) return;

    /* Lê a configuração do painel admin (se existir) */
    var cfg = window.__config || {};

    var chave  = cfg.pixChave  || PIX_CONFIG.chave;
    var nome   = cfg.pixNome   || PIX_CONFIG.nome;
    var cidade = cfg.pixCidade || PIX_CONFIG.cidade;

    /* Gera payload */
    const payload = gerarPayloadPix(valor, chave, nome, cidade, txid);

    window.__pixPayloadAtual = payload;


    const valorEl = document.getElementById('pixValor');

    if (valorEl) {
        valorEl.textContent = Number(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }


    const canvas = document.getElementById('pixCanvas');
    renderizarQRCode(canvas, payload);


    const codigoEl = document.getElementById('pixCodigo');

    if (codigoEl) {
        codigoEl.textContent = payload;
    }


    modal.classList.add('open');
    document.body.style.overflow = 'hidden';


    iniciarCountdownPix(30 * 60);
}


/* ---------------------------------------------------------
   FECHA O MODAL PIX
   --------------------------------------------------------- */

function fecharPixModal() {

    const modal = document.getElementById('pixModal');

    if (!modal) return;

    modal.classList.remove('open');
    document.body.style.overflow = '';

    if (window.__pixCountdown) {
        clearInterval(window.__pixCountdown);
        window.__pixCountdown = null;
    }
}


/* ---------------------------------------------------------
   COUNTDOWN
   --------------------------------------------------------- */

function iniciarCountdownPix(segundos) {

    const el = document.getElementById('pixCountdown');

    if (!el) return;

    if (window.__pixCountdown) {
        clearInterval(window.__pixCountdown);
    }

    let restante = segundos;

    function atualizar() {

        const min = Math.floor(restante / 60);
        const sec = restante % 60;

        el.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

        if (restante <= 0) {

            clearInterval(window.__pixCountdown);

            el.textContent = 'Expirado';

            const aviso = document.getElementById('pixAviso');

            if (aviso) {
                aviso.textContent = 'Este QR Code expirou. Feche e gere novamente.';
                aviso.style.color = '#ef4444';
            }
        }

        restante--;
    }

    atualizar();

    window.__pixCountdown = setInterval(atualizar, 1000);
}


/* ---------------------------------------------------------
   COPIA O CÓDIGO PIX
   --------------------------------------------------------- */

function copiarCodigoPix() {

    const payload = window.__pixPayloadAtual;

    if (!payload) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(() => {
            feedbackCopia();
        }).catch(() => {
            copiarFallback(payload);
        });
    } else {
        copiarFallback(payload);
    }
}


function copiarFallback(texto) {

    const ta = document.createElement('textarea');

    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';

    document.body.appendChild(ta);

    ta.select();

    try {
        document.execCommand('copy');
        feedbackCopia();
    } catch (e) {
        console.warn('Falha ao copiar:', e);
    }

    document.body.removeChild(ta);
}


function feedbackCopia() {

    const btn = document.getElementById('pixCopiarBtn');
    const label = btn?.querySelector('span');

    if (label) {

        const original = label.textContent;

        label.textContent = 'Copiado!';

        if (btn) btn.classList.add('copied');

        setTimeout(() => {
            label.textContent = original;
            if (btn) btn.classList.remove('copied');
        }, 2000);
    }
}


/* ---------------------------------------------------------
   CONFIRMAÇÃO — "Já paguei"
   --------------------------------------------------------- */

function confirmarPagamentoPix() {

    const btn = document.getElementById('pixConfirmarBtn');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Verificando pagamento...';
    }

    setTimeout(() => {

        fecharPixModal();

        if (typeof window.finalizarPedidoAposPix === 'function') {
            window.finalizarPedidoAposPix();
        }

    }, 1500);
}


/* ---------------------------------------------------------
   EXPÕE GLOBALMENTE
   --------------------------------------------------------- */

window.PIX_CONFIG = PIX_CONFIG;
window.gerarPayloadPix = gerarPayloadPix;
window.renderizarQRCode = renderizarQRCode;
window.abrirPixModal = abrirPixModal;
window.fecharPixModal = fecharPixModal;
window.copiarCodigoPix = copiarCodigoPix;
window.confirmarPagamentoPix = confirmarPagamentoPix;