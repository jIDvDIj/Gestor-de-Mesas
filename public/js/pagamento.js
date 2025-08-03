document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mesaId = parseInt(urlParams.get('mesa'));
    const pagamentoId = parseInt(urlParams.get('pagamentoId'));
    const modo = urlParams.get('modo');

    if (!mesaId || !pagamentoId || modo !== 'confirmacao') {
        window.location.href = `mesas.html`;
        return;
    }

    const mainContent = document.getElementById('pagamento-main');
    const title = document.getElementById('pagamento-title');
    title.textContent = `Confirmar Pagamento #${pagamentoId}`;

    document.getElementById('voltar-comanda-btn').onclick = () => {
        window.location.href = `comanda.html?mesa=${mesaId}`;
    };

    async function carregarDetalhesPagamento() {
        try {
            // A API de pagamentos pendentes busca todos, então vamos filtrar aqui
            const response = await fetch('/api/pagamentos-pendentes');
            const pagamentos = await response.json();
            const pagamentoAtual = pagamentos.find(p => p.id === pagamentoId);

            if (pagamentoAtual) {
                // Para pegar os itens, precisamos da comanda
                const comandaResponse = await fetch(`/api/comandas/${pagamentoAtual.comanda_id}`);
                const comandaData = await comandaResponse.json();
                renderPagamento(pagamentoAtual, comandaData.itens);
            } else {
                mainContent.innerHTML = '<p>Este pagamento não está mais pendente ou não existe.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do pagamento:', error);
            mainContent.innerHTML = '<p>Erro ao carregar dados.</p>';
        }
    }

    function renderPagamento(pagamento, todosOsItens) {
        mainContent.innerHTML = '';
        const pagamentoDiv = document.createElement('div');
        pagamentoDiv.className = 'pagamento-card-detalhe';

        const itensDoPagamento = todosOsItens.filter(item => item.pagamento_id === pagamento.id);
        let itensHtml = '<ul>';
        itensDoPagamento.forEach(item => {
            itensHtml += `<li>${item.quantidade}x ${item.nome}</li>`;
        });
        itensHtml += '</ul>';

        pagamentoDiv.innerHTML = `
            <h3>Mesa ${pagamento.mesa_numero}</h3>
            <p><strong>Cliente:</strong> ${pagamento.nome_cliente}</p>
            <p><strong>Valor Total:</strong> R$ ${pagamento.valor_total.toFixed(2)}</p>
            <p><strong>Forma de Pagamento:</strong> ${pagamento.forma_pagamento}</p>
            <h4>Itens Incluídos:</h4>
            ${itensHtml}
            <div class="botoes-confirmacao">
                <button class="confirmar-btn" data-pagamento-id="${pagamento.id}">Confirmar Pagamento</button>
                <button class="negar-btn" data-pagamento-id="${pagamento.id}">Negar Pagamento</button>
            </div>
        `;
        mainContent.appendChild(pagamentoDiv);

        document.querySelector('.confirmar-btn').addEventListener('click', confirmarPagamento);
        document.querySelector('.negar-btn').addEventListener('click', negarPagamento);
    }

    async function confirmarPagamento(event) {
        const pagamentoId = event.target.dataset.pagamentoId;
        try {
            const response = await fetch(`/api/confirmar-pagamento/${pagamentoId}`, { method: 'POST' });
            if (response.ok) {
                alert('Pagamento confirmado!');
                window.location.href = `fila-pagamentos.html`;
            } else {
                alert('Erro ao confirmar pagamento.');
            }
        } catch (error) {
            console.error('Falha ao confirmar pagamento:', error);
        }
    }

    async function negarPagamento(event) {
        const pagamentoId = event.target.dataset.pagamentoId;
        if (!confirm('Tem certeza que deseja negar este pagamento? Os itens voltarão para a comanda.')) {
            return;
        }
        try {
            const response = await fetch(`/api/negar-pagamento/${pagamentoId}`, { method: 'POST' });
            if (response.ok) {
                alert('Pagamento negado.');
                window.location.href = `fila-pagamentos.html`;
            } else {
                alert('Erro ao negar pagamento.');
            }
        } catch (error) {
            console.error('Falha ao negar pagamento:', error);
        }
    }

    await carregarDetalhesPagamento();
});
