document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mesaId = parseInt(urlParams.get('mesa'));
    const itensParaPagarIds = JSON.parse(localStorage.getItem('itensParaPagar'));

    if (!mesaId || !itensParaPagarIds || itensParaPagarIds.length === 0) {
        window.location.href = `comanda.html?mesa=${mesaId}`;
        return;
    }

    const itensAPagarDiv = document.getElementById('itens-a-pagar');
    const totalAPagarDiv = document.getElementById('total-a-pagar');
    const confirmarPagamentoButton = document.getElementById('confirmar-pagamento-button');

    let totalAPagar = 0;

    try {
        // Para obter os detalhes dos itens, buscamos a comanda inteira novamente.
        // Numa aplicação maior, poderíamos ter um endpoint específico para buscar itens por ID.
        const response = await fetch(`http://localhost:3000/api/comandas/${mesaId}`);
        const data = await response.json();
        const todosOsItens = data.itens;

        const itensFiltrados = todosOsItens.filter(item => itensParaPagarIds.includes(String(item.id)));

        itensAPagarDiv.innerHTML = '<h2>Itens a Pagar</h2>';
        itensFiltrados.forEach(item => {
            const itemValor = item.preco * item.quantidade;
            totalAPagar += itemValor;
            const itemElement = document.createElement('div');
            itemElement.textContent = `${item.quantidade}x ${item.nome} - R$ ${itemValor.toFixed(2)}`;
            itensAPagarDiv.appendChild(itemElement);
        });

        totalAPagarDiv.textContent = `Total a Pagar: R$ ${totalAPagar.toFixed(2)}`;

    } catch (error) {
        console.error('Erro ao buscar detalhes dos itens:', error);
        itensAPagarDiv.innerHTML = '<p>Erro ao carregar itens. Tente novamente.</p>';
        confirmarPagamentoButton.disabled = true;
    }

    confirmarPagamentoButton.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/api/pagamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: itensParaPagarIds }),
            });

            if (response.ok) {
                alert('Pagamento confirmado com sucesso!');
                localStorage.removeItem('itensParaPagar');
                window.location.href = `comanda.html?mesa=${mesaId}`;
            } else {
                alert('Ocorreu um erro ao processar o pagamento.');
            }
        } catch (error) {
            console.error('Falha ao confirmar pagamento:', error);
            alert('Erro de comunicação com o servidor.');
        }
    });
});
