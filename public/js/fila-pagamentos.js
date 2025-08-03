document.addEventListener('DOMContentLoaded', async () => {
    const filaContainer = document.getElementById('fila-container');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    async function carregarFila() {
        try {
            const response = await fetch('/api/pagamentos-pendentes');
            const pagamentos = await response.json();

            filaContainer.innerHTML = '';
            if (pagamentos.length === 0) {
                filaContainer.innerHTML = '<p>Nenhum pagamento pendente no momento.</p>';
                return;
            }

            pagamentos.forEach(pagamento => {
                const card = document.createElement('div');
                card.className = 'pagamento-card';
                card.innerHTML = `
                    <h3>Mesa ${pagamento.mesa_numero} - ${pagamento.nome_cliente}</h3>
                    <p><strong>Valor:</strong> R$ ${pagamento.valor_total.toFixed(2)}</p>
                    <p><strong>Forma:</strong> ${pagamento.forma_pagamento}</p>
                `;
                card.addEventListener('click', () => {
                    // Redireciona para a página de confirmação, passando o ID do pagamento
                    // e o ID da mesa para poder voltar corretamente.
                    window.location.href = `pagamento.html?mesa=${pagamento.mesa_numero}&pagamentoId=${pagamento.id}&modo=confirmacao`;
                });
                filaContainer.appendChild(card);
            });

        } catch (error) {
            console.error('Erro ao carregar fila de pagamentos:', error);
            filaContainer.innerHTML = '<p>Erro ao carregar os dados. Tente novamente.</p>';
        }
    }

    await carregarFila();
});
