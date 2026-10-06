/* =========================================================
   EMAIL.JS — Notificações por e-mail (EmailJS)
   v14 — imagem com alt + background no item
   ========================================================= */

'use strict';

const EMAILJS_CONFIG = {
    publicKey: 'EIBy3OPd6ECXedKsS',
    serviceId: 'service_00vd97h',
    templateId: 'template_y049p9q',
    templateIdAdmin: 'template_mflfrhn',
    adminEmail: 'seyn.clothing@gmail.com'
};


/* =========================================================
   INIT
   ========================================================= */
(function initEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.warn('[email] EmailJS SDK não carregado');
        return;
    }
    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('[email] ✅ EmailJS pronto — Seyn clothing');
    } catch (e) {
        console.error('[email] Erro ao inicializar:', e);
    }
})();


/* =========================================================
   UTILITÁRIO
   ========================================================= */
function formatarMoedaEmail(v) {
    return Number(v || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/* Retorna o endereço já formatado com <br> — o template usa {{{ }}} */
function montarEnderecoCompleto(clienteOuEndereco) {
    if (!clienteOuEndereco) return '';

    var e = clienteOuEndereco.endereco || clienteOuEndereco;
    if (!e || !e.rua) return '';

    var linha1 = e.rua + (e.numero ? ', ' + e.numero : '') + (e.complemento ? ' - ' + e.complemento : '');
    var linha2 = e.bairro || '';
    var linha3 = (e.cidade || '') + (e.estado ? ' - ' + e.estado : '');
    var linha4 = e.cep ? 'CEP ' + e.cep : '';

    return [linha1, linha2, linha3, linha4]
        .filter(function (l) { return l && l.trim(); })
        .join('<br>');
}


/* =========================================================
   BUSCAR PEDIDO ORIGINAL — fallback quando refund tá vazio
   ========================================================= */
async function buscarPedidoOriginal(refund) {
    if (!refund || !refund.orderId) return null;
    if (!window.db) return null;

    try {
        var doc = await window.db.collection('orders').doc(refund.orderId).get();
        if (!doc.exists) return null;
        return doc.data();
    } catch (e) {
        console.warn('[email] Não deu pra buscar pedido original:', e);
        return null;
    }
}


/* =========================================================
   GERAR HTML DOS ITENS (com foto + alt + código)
   ========================================================= */
function gerarItensHTML(itens) {
    if (!itens || itens.length === 0) return '';

    var linhas = itens.map(function (item) {
        var codigo = item.id || item.codigo || item.sku || '—';
        var nome = item.nome || 'Produto';
        var qtd = item.quantidade || 1;
        var preco = Number(item.preco || 0);
        var subtotal = preco * qtd;
        var imagem = item.imagem || '';
        var altTexto = String(nome).replace(/"/g, '&quot;');

        return '<tr>' +
            '<td style="padding:14px 12px 14px 0; border-bottom:1px solid #1a212c; width:60px; vertical-align:top;">' +
                (imagem
                    ? '<img src="' + imagem + '" alt="' + altTexto + '" width="50" height="62" ' +
                      'style="display:block; width:50px; height:62px; object-fit:cover; ' +
                      'border-radius:6px; border:1px solid #1a212c; background:#0b1120;">'
                    : '<div style="width:50px; height:62px; background:#0b1120; border:1px solid #1a212c; border-radius:6px;"></div>') +
            '</td>' +
            '<td style="padding:14px 12px; border-bottom:1px solid #1a212c; vertical-align:top;">' +
                '<p style="margin:0 0 2px; font-family:Arial,sans-serif; font-size:9px; letter-spacing:2px; color:#5d6b83; text-transform:uppercase;">CÓD ' + codigo + '</p>' +
                '<p style="margin:0 0 4px; font-family:Arial,sans-serif; font-size:14px; font-weight:600; color:#f5f7ff; line-height:1.3;">' + nome + '</p>' +
                '<p style="margin:0; font-family:Arial,sans-serif; font-size:12px; color:#5d6b83;">' + qtd + 'x · R$ ' + preco.toFixed(2).replace('.', ',') + '</p>' +
            '</td>' +
            '<td style="padding:14px 0 14px 12px; border-bottom:1px solid #1a212c; text-align:right; vertical-align:top; white-space:nowrap;">' +
                '<p style="margin:0; font-family:Georgia,serif; font-style:italic; font-size:15px; font-weight:700; color:#7fb0ff;">' +
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
   MAPA DE STATUS
   ========================================================= */
const STATUS_EMAIL = {
    'aguardando_pagamento': {
        emoji: '⏳',
        titulo: 'Aguardando pagamento',
        mensagem: 'Recebemos seu pedido! Estamos aguardando a confirmação do pagamento.',
        botao_texto: 'Acompanhar pedido',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    },
    'pago': {
        emoji: '💰',
        titulo: 'Pagamento confirmado',
        mensagem: 'Confirmamos o recebimento do seu pagamento! Seu pedido já entrou na fila de separação.',
        botao_texto: 'Acompanhar pedido',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    },
    'processando': {
        emoji: '📝',
        titulo: 'Pedido em processamento',
        mensagem: 'Estamos processando seu pedido. Em breve ele será preparado para envio.',
        botao_texto: 'Acompanhar pedido',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    },
    'preparando': {
        emoji: '📦',
        titulo: 'Preparando seu pedido',
        mensagem: 'Boas notícias! Seu pedido já entrou na fila de separação e está sendo embalado com cuidado.',
        botao_texto: 'Acompanhar pedido',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    },
    'enviado': {
        emoji: '🚚',
        titulo: 'Seu pedido saiu para entrega',
        mensagem: 'Seu pedido já está em rota! A transportadora foi acionada.',
        botao_texto: 'Acompanhar pedido',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    },
    'entregue': {
        emoji: '✅',
        titulo: 'Pedido entregue',
        mensagem: 'Seu pedido chegou! Esperamos que você ame as peças.',
        botao_texto: 'Avaliar produtos',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    },
    'cancelado': {
        emoji: '💸',
        titulo: 'Pedido cancelado',
        mensagem: 'Confirmamos o cancelamento do seu pedido. A solicitação de reembolso foi aberta automaticamente.',
        botao_texto: 'Acompanhar reembolso',
        botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
    }
};


/* =========================================================
   ENVIAR — MUDANÇA DE STATUS (pro cliente)
   ========================================================= */
async function enviarEmailMudancaStatus(pedido, novoStatus, observacaoAdmin) {

    if (!pedido || !pedido.cliente || !pedido.cliente.email) {
        console.warn('[email] Pedido sem e-mail do cliente');
        return { ok: false, erro: 'Pedido sem e-mail' };
    }
    if (typeof emailjs === 'undefined') {
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var info = STATUS_EMAIL[novoStatus];
    if (!info) {
        console.warn('[email] Status sem template:', novoStatus);
        return { ok: false, erro: 'Status sem template' };
    }

    var mensagemFinal = observacaoAdmin ? observacaoAdmin : info.mensagem;

    var params = {
        to_email:          pedido.cliente.email,
        nome_cliente:      pedido.cliente.nome || 'cliente',
        pedido_id:         pedido.numero || pedido.id || '—',
        total:             formatarMoedaEmail(pedido.total || 0),
        lista_itens:       gerarItensHTML(pedido.itens),
        endereco_completo: montarEnderecoCompleto(pedido.cliente),
        pagamento:         pedido.pagamento || 'PIX',
        emoji:             info.emoji,
        titulo:            info.titulo,
        mensagem:          mensagemFinal,
        botao_texto:       info.botao_texto || 'Acompanhar pedido',
        botao_url:         info.botao_url || 'https://seynclothing.netlify.app/minha-conta.html',
        cliente_nome:      pedido.cliente.nome || 'cliente',
        numero_pedido:     pedido.numero || pedido.id || '—',
        valor:             formatarMoedaEmail(pedido.total || 0),
        itens_html:        gerarItensHTML(pedido.itens)
    };

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params);
        console.log('[email] ✅ Enviado cliente (' + novoStatus + '):', resp.status);
        return { ok: true };
    } catch (e) {
        console.error('[email] ❌ Erro ao enviar:', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido') };
    }
}


/* =========================================================
   ENVIAR — REEMBOLSO (pro cliente) — COM FALLBACK
   ========================================================= */
async function enviarEmailReembolso(refund, novoStatus, observacaoAdmin) {

    if (!refund || !refund.cliente || !refund.cliente.email) {
        console.warn('[email] Refund sem e-mail do cliente');
        return { ok: false, erro: 'Refund sem e-mail' };
    }

    if (typeof emailjs === 'undefined') {
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var pedidoOriginal = null;
    var precisaFallback = !refund.itens || refund.itens.length === 0 || !refund.valor;

    if (precisaFallback) {
        console.log('[email] Refund incompleto — buscando pedido original...');
        pedidoOriginal = await buscarPedidoOriginal(refund);
        if (pedidoOriginal) {
            console.log('[email] ✅ Pedido original encontrado:', pedidoOriginal.numero);
        }
    }

    var itens = (refund.itens && refund.itens.length) ? refund.itens
              : (pedidoOriginal && pedidoOriginal.itens) ? pedidoOriginal.itens : [];
    var valor = refund.valor || (pedidoOriginal && pedidoOriginal.total) || 0;
    var numeroPedido = refund.orderNumero || refund.orderId
                    || (pedidoOriginal && pedidoOriginal.numero) || '—';
    var nomeCliente = (refund.cliente && refund.cliente.nome)
                    || (pedidoOriginal && pedidoOriginal.cliente && pedidoOriginal.cliente.nome)
                    || (refund.cliente && refund.cliente.email ? refund.cliente.email.split('@')[0] : 'cliente');
    var enderecoCliente = (refund.cliente && refund.cliente.endereco)
                       || (pedidoOriginal && pedidoOriginal.cliente && pedidoOriginal.cliente.endereco)
                       || refund.cliente;

    var mapas = {
        'pendente': {
            emoji: '📩',
            titulo: 'Reembolso recebido',
            mensagem: 'Recebemos sua solicitação de reembolso. Nossa equipe vai analisar e responder em até 3 dias úteis.',
            botao_texto: 'Acompanhar reembolso',
            botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
        },
        'aprovado': {
            emoji: '✅',
            titulo: 'Reembolso aprovado',
            mensagem: 'Sua solicitação foi aprovada! O valor será devolvido em até 5 dias úteis.',
            botao_texto: 'Acompanhar reembolso',
            botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
        },
        'pago': {
            emoji: '💰',
            titulo: 'Reembolso pago',
            mensagem: 'O valor do reembolso já foi devolvido. Obrigado pela confiança.',
            botao_texto: 'Voltar à loja',
            botao_url: 'https://seynclothing.netlify.app/index.html'
        },
        'negado': {
            emoji: '⚠️',
            titulo: 'Reembolso negado',
            mensagem: 'Analisamos sua solicitação e infelizmente não foi possível aprovar.',
            botao_texto: 'Falar com o ateliê',
            botao_url: 'https://seynclothing.netlify.app/minha-conta.html'
        }
    };

    var info = mapas[novoStatus];
    if (!info) return { ok: false, erro: 'Status sem template' };

    var mensagemFinal = observacaoAdmin ? observacaoAdmin : info.mensagem;

    var params = {
        to_email:          refund.cliente.email,
        nome_cliente:      nomeCliente,
        pedido_id:         numeroPedido,
        total:             formatarMoedaEmail(valor),
        lista_itens:       gerarItensHTML(itens),
        endereco_completo: montarEnderecoCompleto(enderecoCliente),
        pagamento:         'Reembolso',
        emoji:             info.emoji,
        titulo:            info.titulo,
        mensagem:          mensagemFinal,
        botao_texto:       info.botao_texto || 'Acompanhar reembolso',
        botao_url:         info.botao_url   || 'https://seynclothing.netlify.app/minha-conta.html',
        cliente_nome:      nomeCliente,
        numero_pedido:     numeroPedido,
        valor:             formatarMoedaEmail(valor),
        itens_html:        gerarItensHTML(itens)
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
   ENVIAR — NOVO REEMBOLSO (pro admin) — COM FALLBACK
   ========================================================= */
async function enviarEmailAdminReembolso(refund) {

    if (!refund) return { ok: false, erro: 'Sem dados do reembolso' };
    if (typeof emailjs === 'undefined') return { ok: false, erro: 'EmailJS indisponível' };

    var pedidoOriginal = null;
    var precisaFallback = !refund.itens || refund.itens.length === 0;

    if (precisaFallback) {
        pedidoOriginal = await buscarPedidoOriginal(refund);
    }

    var itens = (refund.itens && refund.itens.length) ? refund.itens
              : (pedidoOriginal && pedidoOriginal.itens) ? pedidoOriginal.itens : [];
    var valor = refund.valor || (pedidoOriginal && pedidoOriginal.total) || 0;
    var numeroPedido = refund.orderNumero || refund.orderId
                    || (pedidoOriginal && pedidoOriginal.numero) || '—';

    var cliRefund = refund.cliente || {};
    var cliOriginal = (pedidoOriginal && pedidoOriginal.cliente) || {};

    var cli = {
        nome:     cliRefund.nome     || cliOriginal.nome     || '—',
        email:    cliRefund.email    || cliOriginal.email    || '—',
        telefone: cliRefund.telefone || cliOriginal.telefone || '—',
        endereco: cliRefund.endereco || cliOriginal.endereco || null
    };

    var valorFmt = formatarMoedaEmail(valor);
    var motivo = refund.motivo || 'não informado';
    var detalhes = refund.detalhes || '';

    var mensagemAdmin =
        '💸 NOVO REEMBOLSO SOLICITADO\n\n' +
        'Cliente: ' + cli.nome + '\n' +
        'E-mail: ' + cli.email + '\n' +
        'Telefone: ' + cli.telefone + '\n\n' +
        'Pedido: #' + numeroPedido + '\n' +
        'Valor: ' + valorFmt + '\n' +
        'Motivo: ' + motivo + '\n' +
        (detalhes ? 'Detalhes: ' + detalhes + '\n' : '') +
        '\nAcesse o painel pra aprovar ou negar.';

    var params = {
        to_email:          EMAILJS_CONFIG.adminEmail,
        nome_cliente:      cli.nome,
        pedido_id:         numeroPedido,
        total:             valorFmt,
        lista_itens:       gerarItensHTML(itens),
        endereco_completo: montarEnderecoCompleto(cli),
        pagamento:         'Reembolso',
        emoji:             '💸',
        titulo:            'Novo reembolso #' + numeroPedido,
        mensagem:          mensagemAdmin,
        botao_texto:       'Abrir painel',
        botao_url:         'https://seynclothing.netlify.app/admin.html?section=reembolsos',
        email_cliente:     cli.email,
        telefone_cliente:  cli.telefone,
        cliente_nome:      'Admin Seyn',
        numero_pedido:     numeroPedido,
        valor:             valorFmt,
        itens_html:        gerarItensHTML(itens)
    };

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateIdAdmin, params);
        console.log('[email] ✅ E-mail enviado pro ADMIN (reembolso):', resp.status);
        return { ok: true };
    } catch (e) {
        console.error('[email] ❌ Erro ao enviar pro admin:', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido') };
    }
}


/* =========================================================
   ENVIAR — NOVO PEDIDO (pro admin)
   ========================================================= */
async function enviarEmailNovoPedidoProAdmin(pedido) {

    if (!pedido) return { ok: false, erro: 'Pedido vazio' };
    if (typeof emailjs === 'undefined') return { ok: false, erro: 'EmailJS indisponível' };

    var cliente = pedido.cliente || {};
    var listaItens = gerarItensHTML(pedido.itens);
    var totalFmt = formatarMoedaEmail(pedido.total || 0);

    var params = {
        to_email:          EMAILJS_CONFIG.adminEmail,
        nome_cliente:      cliente.nome || 'Cliente',
        pedido_id:         pedido.numero || pedido.id || '-',
        total:             totalFmt,
        lista_itens:       listaItens,
        endereco_completo: montarEnderecoCompleto(cliente),
        pagamento:         pedido.pagamento || 'PIX',
        emoji:             '🛒',
        titulo:            'Novo pedido #' + (pedido.numero || pedido.id || '-'),
        mensagem:          'Você recebeu um novo pedido! Confira os detalhes abaixo.',
        botao_texto:       'Abrir painel',
        botao_url:         'https://seynclothing.netlify.app/admin.html',
        email_cliente:     cliente.email || '',
        telefone_cliente:  cliente.telefone || '',
        cliente_nome:      'Admin Seyn',
        numero_pedido:     pedido.numero || pedido.id || '-',
        valor:             totalFmt,
        itens_html:        listaItens
    };

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateIdAdmin, params);
        console.log('[email] ✅ Enviado admin (novo pedido):', resp.status);
        return { ok: true };
    } catch (e) {
        console.error('[email] ❌ Erro ao enviar pro admin:', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido') };
    }
}


/* =========================================================
   ENVIAR — CONFIRMAÇÃO (pro cliente)
   ========================================================= */
async function enviarEmailConfirmacaoProCliente(pedido) {

    if (!pedido || !pedido.cliente || !pedido.cliente.email) {
        return { ok: false, erro: 'Pedido sem e-mail' };
    }
    if (typeof emailjs === 'undefined') {
        return { ok: false, erro: 'EmailJS indisponível' };
    }

    var cliente = pedido.cliente;
    var listaItens = gerarItensHTML(pedido.itens);
    var totalFmt = formatarMoedaEmail(pedido.total || 0);

    var params = {
        to_email:          cliente.email,
        nome_cliente:      cliente.nome || 'Cliente',
        pedido_id:         pedido.numero || pedido.id || '-',
        total:             totalFmt,
        lista_itens:       listaItens,
        endereco_completo: montarEnderecoCompleto(cliente),
        pagamento:         pedido.pagamento || 'PIX',
        emoji:             '✅',
        titulo:            'Pedido confirmado',
        mensagem:          'Recebemos seu pedido! Em breve você receberá o código de rastreio.',
        botao_texto:       'Acompanhar pedido',
        botao_url:         'https://seynclothing.netlify.app/minha-conta.html',
        email_cliente:     cliente.email,
        cliente_nome:      cliente.nome || 'Cliente',
        numero_pedido:     pedido.numero || pedido.id || '-',
        valor:             totalFmt,
        itens_html:        listaItens
    };

    try {
        var resp = await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params);
        console.log('[email] ✅ Enviado cliente (confirmação):', resp.status);
        return { ok: true };
    } catch (e) {
        console.error('[email] ❌ Erro ao enviar pro cliente:', e);
        return { ok: false, erro: (e && e.text) ? e.text : (e && e.message ? e.message : 'Erro desconhecido') };
    }
}


/* =========================================================
   EXPÕE
   ========================================================= */
window.STATUS_EMAIL = STATUS_EMAIL;
window.EMAILJS_CONFIG = EMAILJS_CONFIG;
window.enviarEmailMudancaStatus = enviarEmailMudancaStatus;
window.enviarEmailReembolso = enviarEmailReembolso;
window.enviarEmailAdminReembolso = enviarEmailAdminReembolso;
window.enviarEmailNovoPedidoProAdmin = enviarEmailNovoPedidoProAdmin;
window.enviarEmailConfirmacaoProCliente = enviarEmailConfirmacaoProCliente;
window.gerarItensHTML = gerarItensHTML;
window.montarEnderecoCompleto = montarEnderecoCompleto;
window.buscarPedidoOriginal = buscarPedidoOriginal;