/* =========================================================
   DIREITOS DO TITULAR — LGPD
   ========================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('formDireitosLGPD');
    if (!form) return;

    const btn = document.getElementById('btnEnviarSolicitacao');
    const msg = document.getElementById('formMsg');

    form.addEventListener('submit', async function(e) {

        e.preventDefault();

        const nome = document.getElementById('nomeTitular').value.trim();
        const email = document.getElementById('emailTitular').value.trim().toLowerCase();
        const telefone = document.getElementById('telefoneTitular').value.trim();
        const tipo = document.getElementById('tipoSolicitacao').value;
        const detalhes = document.getElementById('detalhesSolicitacao').value.trim();
        const consentimento = document.getElementById('consentimento').checked;

        /* Validação */
        if (!nome || !email || !tipo || !detalhes) {
            mostrarMsg('Por favor, preencha todos os campos obrigatórios.', 'erro');
            return;
        }

        if (!consentimento) {
            mostrarMsg('Você precisa marcar a declaração para prosseguir.', 'erro');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mostrarMsg('E-mail inválido. Verifique e tente novamente.', 'erro');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const solicitacao = {
            nome: nome,
            email: email,
            telefone: telefone,
            tipo: tipo,
            detalhes: detalhes,
            data: new Date().toISOString(),
            status: 'pendente',
            userAgent: navigator.userAgent,
            origem: 'formulario-lgpd'
        };

        try {

            /* Salva no Firestore (coleção lgpd_solicitacoes) */
            if (typeof db !== 'undefined') {
                await db.collection('lgpd_solicitacoes').add(solicitacao);
            }

            /* Salva no localStorage como backup */
            try {
                const lista = JSON.parse(localStorage.getItem('lgpd_solicitacoes') || '[]');
                lista.push(solicitacao);
                localStorage.setItem('lgpd_solicitacoes', JSON.stringify(lista));
            } catch (e) {}

            /* Envia e-mail para o DPO via EmailJS (se disponível) */
            if (typeof emailjs !== 'undefined' && window.EMAILJS_CONFIG) {
                try {
                    await emailjs.send(
                        window.EMAILJS_CONFIG.serviceId,
                        window.EMAILJS_CONFIG.templateId,
                        {
                            to_email: 'privacidade@seynclothing.com.br',
                            from_name: nome,
                            from_email: email,
                            telefone: telefone,
                            tipo_solicitacao: tipo,
                            detalhes: detalhes
                        }
                    );
                } catch (e) {
                    console.warn('[lgpd] E-mail não enviado:', e);
                }
            }

            mostrarMsg(
                '✅ Solicitação enviada com sucesso! Você receberá uma resposta em até 15 dias corridos no e-mail informado.',
                'ok'
            );

            form.reset();

        } catch (e) {
            console.error('[lgpd] Erro:', e);
            mostrarMsg('Erro ao enviar. Tente novamente ou envie um e-mail direto para privacidade@seynclothing.com.br', 'erro');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar solicitação';
        }
    });

    function mostrarMsg(texto, tipo) {
        msg.textContent = texto;
        msg.className = 'form-msg ' + tipo;
        msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

});