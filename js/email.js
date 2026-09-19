/* =========================================================
   EMAIL.JS — Notificações por e-mail (EmailJS)
   v7 — adiciona e-mail pro admin em novo reembolso
   ========================================================= */

'use strict';

/* =========================================================
   ⚙️ CONFIGURAÇÃO
   ========================================================= */
const EMAILJS_CONFIG = {
    publicKey:        'KNDpGOBBNU1ZZtQhC',
    serviceId:        'service_t6woudm',
    templateId:       'template_03qg6x2',
    templateIdAdmin:  'template_03qg6x2',   /* ← troca se criar um template só pro admin */
    adminEmail:       'mjstores.contato@gmail.com'
};


/* =========================================================
   INIT
   ========================================================= */
(function initEmailJS() {

    if (typeof emailjs === 'undefined') {
        console.warn('[email] EmailJS SDK não carregado');
        return;
    }

    if (EMAILJS_CONFIG.publicKey.includes('COLE_')) {
        console.warn('[email] EmailJS não configurado ainda');
        return;
    }

    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('[email] ✅ EmailJS pronto — conta MJ');
        console.log('[email] Admin será notificado em:', EMAILJS_CONFIG.adminEmail);
    } catch (e) {
        console.error('[email] Erro ao inicializar:', e);
    }

})();


/* =========================================================
   MAPA DE STATUS → textos + botão do e-mail (CLIENTE)
   ========================================================= */
const STATUS_EMAIL = {

    'aguardando_pagamento': {
        emoji:       '⏳',
        titulo:      'Aguardando confirmação de pagamento',
        mensagem:    'Recebemos seu pedido! Estamos aguardando a confirmação do pagamento pra começar a preparar tudo com cuidado.',
        botao_texto: 'Acompanhar pedido',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    },

    'pago': {
        emoji:       '💰',
        titulo:      'Pagamento confirmado — pedido em preparação',
        mensagem:    'Confirmamos o recebimento do seu pagamento! Seu pedido já entrou na fila de separação e nossa equipe está embalando cada peça com cuidado. Em breve você recebe um novo e-mail avisando quando ele sair para entrega.',
        botao_texto: 'Acompanhar pedido',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    },

    'processando': {
        emoji:       '📝',
        titulo:      'Seu pedido está sendo processado',
        mensagem:    'Estamos processando seu pedido. Em breve ele será preparado para envio.',
        botao_texto: 'Acompanhar pedido',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    },

    'preparando': {
        emoji:       '📦',
        titulo:      'Estamos separando o seu pedido',
        mensagem:    'Boas notícias! Seu pedido já entrou na fila de separação e está sendo embalado com cuidado. Em breve ele sai para entrega.',
        botao_texto: 'Acompanhar pedido',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    },

    'enviado': {
        emoji:       '🚚',
        titulo:      'Seu pedido saiu para entrega',
        mensagem:    'Seu pedido já está em rota! A transportadora foi acionada e o prazo começa a contar a partir de agora. Fique de olho no seu e-mail e telefone para eventuais avisos de entrega.',
        botao_texto: 'Acompanhar pedido',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    },

    'entregue': {
        emoji:       '✅',
        titulo:      'Pedido entregue',
        mensagem:    'Seu pedido chegou! Esperamos que você ame as peças. Se tiver qualquer problema, é só falar com a gente — e se quiser, deixe sua avaliação no site.',
        botao_texto: 'Avaliar produtos',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    },

    'cancelado': {
        emoji:       '💸',
        titulo:      'Pedido cancelado — acompanhe seu reembolso',
        mensagem:    'Confirmamos o cancelamento do seu pedido. A solicitação de reembolso foi aberta automaticamente e nossa equipe vai analisar em até 3 dias úteis. Você pode acompanhar o status do reembolso a qualquer momento na sua conta, na aba "Meus pedidos".',
        botao_texto: 'Acompanhar reembolso',
        botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
    }
};


/* =========================================================
   GERAR HTML DOS ITENS
   ========================================================= */
function gerarItensHTML(itens) {

    if (!itens || itens.length === 0) {
        return '';
    }

    var linhas = itens.map(function (item) {

        var nome = item.nome || 'Produto';
        var qtd = item.quantidade || 1;
        var preco = Number(item.preco || 0);
        var subtotal = preco * qtd;
        var imagem = item.imagem || '';

        return '<tr>' +
            '<td style="padding:14px 12px 14px 0; border-bottom:1px solid #1a212c; width:60px; vertical-align:top;">' +
                (imagem
                    ? '<img src="' + imagem + '" alt="" width="50" height="62" style="display:block; width:50px; height:62px; object-fit:cover; border-radius:6px; border:1px solid #1a212c;">'
                    : '<div style="width:50px; height:62px; background:#0b1120; border:1px solid #1a212c; border-radius:6px;"></div>') +
            '</td>' +
            '<td style="padding:14px 12px; border-bottom:1px solid #1a212c; vertical-align:top;">' +
                '<p style="margin:0 0 4px; font-family:Arial, sans-serif; font-size:14px; font-weight:600; color:#f5f7ff; line-height:1.3;">' + nome + '</p>' +
                '<p style="margin:0; font-family:Arial, sans-serif; font-size:12px; color:#5d6b83;">' + qtd + 'x · R$ ' + preco.toFixed(2).replace('.', ',') + '</p>' +
            '</td>' +
            '<td style="padding:14px 0 14px 12px; border-bottom:1px solid #1a212c; text-align:right; vertical-align:top; white-space:nowrap;">' +
                '<p style="margin:0; font-family:Georgia, serif; font-style:italic; font-size:15px; font-weight:700; color:#7fb0ff;">' +
                    'R$ ' + subtotal.toFixed(2).replace('.', ',') +
                '</p>' +
            '</td>' +
        '</tr>';
    }).join('');

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
        linhas +
    '</table>';
}


/* =========================================================
   ENVIAR E-MAIL — MUDANÇA DE STATUS DO PEDIDO (pro cliente)
   ========================================================= */
async function enviarEmailMudancaStatus(pedido, novoStatus, observacaoAdmin) {

    if (!pedido || !pedido.cliente || !pedido.cliente.email) {
        console.warn('[email] Pedido sem e-mail do cliente');
        return { ok: false, erro: 'Pedido sem e-mail' };
    }

    if (typeof emailjs === 'undefined') {
        console.warn('[email] EmailJS não disponível');
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var info = STATUS_EMAIL[novoStatus];
    if (!info) {
        console.warn('[email] Status sem template:', novoStatus);
        return { ok: false, erro: 'Status sem template' };
    }

    var mensagemFinal = observacaoAdmin ? observacaoAdmin : info.mensagem;

    var params = {
        to_email:      pedido.cliente.email,
        cliente_nome:  (pedido.cliente.nome || 'cliente'),
        numero_pedido: pedido.numero || '—',
        valor:         formatarMoedaEmail(pedido.total || 0),
        status:        novoStatus,
        status_label:  info.titulo,
        emoji:         info.emoji,
        titulo:        info.titulo,
        mensagem:      mensagemFinal,
        itens_html:    gerarItensHTML(pedido.itens),
        botao_texto:   info.botao_texto || 'Acompanhar pedido',
        botao_url:     info.botao_url   || 'https://artefatoos.netlify.app/minha-conta.html'
    };

    try {
        var resp = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            params
        );
        console.log('[email] ✅ Enviado cliente (' + novoStatus + '):', resp.status);
        return { ok: true };

    } catch (e) {
        console.error('[email] ❌ Erro ao enviar:', e);
        return {
            ok: false,
            erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido')
        };
    }
}


/* =========================================================
   ENVIAR E-MAIL — MUDANÇA DE STATUS DO REEMBOLSO (pro cliente)
   ========================================================= */
async function enviarEmailReembolso(refund, novoStatus, observacaoAdmin) {

    if (!refund || !refund.cliente || !refund.cliente.email) {
        console.warn('[email] Refund sem e-mail do cliente');
        return { ok: false, erro: 'Refund sem e-mail' };
    }

    if (typeof emailjs === 'undefined') {
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var mapas = {
        'pendente': {
            emoji:       '📩',
            titulo:      'Solicitação de reembolso recebida',
            mensagem:    'Recebemos sua solicitação de reembolso. Nossa equipe vai analisar e responder em até 3 dias úteis.',
            botao_texto: 'Acompanhar reembolso',
            botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
        },
        'aprovado': {
            emoji:       '✅',
            titulo:      'Reembolso aprovado',
            mensagem:    'Sua solicitação foi aprovada! O valor será devolvido em até 5 dias úteis. Fique de olho no e-mail e na conta bancária.',
            botao_texto: 'Acompanhar reembolso',
            botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
        },
        'pago': {
            emoji:       '💰',
            titulo:      'Reembolso pago',
            mensagem:    'O valor do reembolso já foi devolvido. Obrigado pela confiança — esperamos te ver de novo em breve.',
            botao_texto: 'Voltar à loja',
            botao_url:   'https://artefatoos.netlify.app/index.html'
        },
        'negado': {
            emoji:       '⚠️',
            titulo:      'Reembolso negado',
            mensagem:    'Analisamos sua solicitação e infelizmente não foi possível aprovar. Entre em contato conosco pra entender melhor.',
            botao_texto: 'Falar com o ateliê',
            botao_url:   'https://artefatoos.netlify.app/minha-conta.html'
        }
    };

    var info = mapas[novoStatus];
    if (!info) {
        return { ok: false, erro: 'Status sem template' };
    }

    var mensagemFinal = observacaoAdmin ? observacaoAdmin : info.mensagem;

    var params = {
        to_email:      refund.cliente.email,
        cliente_nome:  (refund.cliente.nome || 'cliente'),
        numero_pedido: refund.orderNumero || '—',
        valor:         formatarMoedaEmail(refund.valor || 0),
        status:        novoStatus,
        status_label:  info.titulo,
        emoji:         info.emoji,
        titulo:        info.titulo,
        mensagem:      mensagemFinal,
        itens_html:    gerarItensHTML(refund.itens),
        botao_texto:   info.botao_texto || 'Acompanhar pedido',
        botao_url:     info.botao_url   || 'https://artefatoos.netlify.app/minha-conta.html'
    };

    try {
        var resp = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            params
        );
        console.log('[email] ✅ Enviado reembolso cliente:', resp.status);
        return { ok: true };

    } catch (e) {
        console.error('[email] ❌ Erro ao enviar reembolso:', e);
        return {
            ok: false,
            erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido')
        };
    }
}


/* =========================================================
   🆕 ENVIAR E-MAIL PRO ADMIN — NOVO REEMBOLSO SOLICITADO
   ========================================================= */
async function enviarEmailAdminReembolso(refund) {

    if (!refund) {
        console.warn('[email] enviarEmailAdminReembolso sem refund');
        return { ok: false, erro: 'Sem dados do reembolso' };
    }

    if (typeof emailjs === 'undefined') {
        console.warn('[email] EmailJS não disponível pro admin');
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var cli = refund.cliente || {};
    var valor = formatarMoedaEmail(refund.valor || 0);
    var pedidoNum = refund.orderNumero || '—';
    var motivo = refund.motivo || 'não informado';
    var detalhes = refund.detalhes || '';

    var mensagemAdmin =
        '💸 NOVO REEMBOLSO SOLICITADO\n\n' +
        'Cliente: ' + (cli.nome || '—') + '\n' +
        'E-mail: ' + (cli.email || '—') + '\n' +
        'Telefone: ' + (cli.telefone || '—') + '\n\n' +
        'Pedido: #' + pedidoNum + '\n' +
        'Valor: ' + valor + '\n' +
        'Motivo: ' + motivo + '\n' +
        (detalhes ? 'Detalhes: ' + detalhes + '\n' : '') +
        '\nAcesse o painel pra aprovar ou negar.';

    var params = {
        to_email:      EMAILJS_CONFIG.adminEmail,
        cliente_nome:  'Admin MJ',
        numero_pedido: pedidoNum,
        valor:         valor,
        status:        'reembolso_solicitado',
        status_label:  '💸 Novo reembolso solicitado',
        emoji:         '💸',
        titulo:        'Novo reembolso — Pedido #' + pedidoNum,
        mensagem:      mensagemAdmin,
        itens_html:    gerarItensHTML(refund.itens),
        botao_texto:   'Abrir painel administrativo',
        botao_url:     'https://artefatoos.netlify.app/admin.html?section=reembolsos'
    };

    try {
        var resp = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateIdAdmin,
            params
        );
        console.log('[email] ✅ E-mail enviado pro ADMIN:', resp.status);
        return { ok: true };

    } catch (e) {
        console.error('[email] ❌ Erro ao enviar pro admin:', e);
        return {
            ok: false,
            erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido')
        };
    }
}


/* =========================================================
   UTILITÁRIO
   ========================================================= */
function formatarMoedaEmail(v) {
    return Number(v || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


/* =========================================================
   EXPÕE
   ========================================================= */
window.STATUS_EMAIL                  = STATUS_EMAIL;
window.EMAILJS_CONFIG                = EMAILJS_CONFIG;
window.enviarEmailMudancaStatus      = enviarEmailMudancaStatus;
window.enviarEmailReembolso          = enviarEmailReembolso;
window.enviarEmailAdminReembolso     = enviarEmailAdminReembolso;