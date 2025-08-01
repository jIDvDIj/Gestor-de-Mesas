document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mesaId = parseInt(urlParams.get('mesa'));
    const user = JSON.parse(localStorage.getItem('user'));

    if (!mesaId) {
        window.location.href = 'mesas.html';
        return;
    }

    const comandaTitle = document.getElementById('comanda-title');
    const comandaItensDiv = document.getElementById('comanda-itens');
    const totalComandaDiv = document.getElementById('total-comanda');
    const funcionarioControls = document.getElementById('funcionario-controls');
    const clienteControls = document.getElementById('cliente-controls');
    const addItemForm = document.getElementById('add-item-form');
    const produtoSelect = document.getElementById('produto-select');
    const pagarButton = document.getElementById('pagar-button');

    comandaTitle.textContent = `Comanda da Mesa ${mesaId}`;

    let comandaId = null;

    async function carregarComanda() {
        try {
            const response = await fetch(`http://localhost:3000/api/comandas/${mesaId}`);
            const data = await response.json();
            comandaId = data.comandaId;
            renderComanda(data.itens);
        } catch (error) {
            console.error('Erro ao carregar comanda:', error);
            comandaItensDiv.innerHTML = '<p>Não foi possível carregar a comanda.</p>';
        }
    }

    function renderComanda(itens) {
        comandaItensDiv.innerHTML = '';
        let total = 0;

        if (itens.length === 0) {
            comandaItensDiv.innerHTML = '<p>Nenhum item na comanda.</p>';
        }

        itens.forEach(item => {
            if (!item.pago) {
                const itemValor = item.preco * item.quantidade;
                total += itemValor;

                const itemElement = document.createElement('div');
                itemElement.className = 'comanda-item';
                itemElement.innerHTML = `
                    <input type="checkbox" data-item-id="${item.id}" data-item-valor="${itemValor}">
                    <span>${item.quantidade}x ${item.nome} - R$ ${itemValor.toFixed(2)}</span>
                `;

                if (user && user.cargo === 'funcionario') {
                    const removeButton = document.createElement('button');
                    removeButton.textContent = 'Remover';
                    // TODO: Adicionar lógica de remoção
                    itemElement.appendChild(removeButton);
                }
                comandaItensDiv.appendChild(itemElement);
            }
        });

        totalComandaDiv.textContent = `Total: R$ ${total.toFixed(2)}`;
    }

    async function carregarProdutosParaSelect() {
        try {
            const response = await fetch('http://localhost:3000/api/produtos');
            const produtos = await response.json();
            produtos.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id;
                option.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)}`;
                produtoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    if (user && user.cargo === 'funcionario') {
        funcionarioControls.style.display = 'block';
        clienteControls.style.display = 'none';
        await carregarProdutosParaSelect();
    }

    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const produtoId = produtoSelect.value;
        const quantidade = document.getElementById('item-quantidade').value;

        try {
            const response = await fetch(`http://localhost:3000/api/comandas/${comandaId}/itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ produtoId, quantidade }),
            });

            if (response.ok) {
                await carregarComanda(); // Recarrega a comanda para mostrar o novo item
                document.getElementById('item-quantidade').value = 1;
            } else {
                alert('Erro ao adicionar item.');
            }
        } catch (error) {
            console.error('Falha ao adicionar item:', error);
            alert('Erro de comunicação com o servidor.');
        }
    });

    pagarButton.addEventListener('click', () => {
        const selectedItems = [];
        const checkboxes = document.querySelectorAll('.comanda-item input[type="checkbox"]:checked');

        checkboxes.forEach(cb => {
            selectedItems.push(cb.dataset.itemId);
        });

        if (selectedItems.length > 0) {
            // Salva os itens no localStorage para a página de pagamento pegar
            localStorage.setItem('itensParaPagar', JSON.stringify(selectedItems));
            window.location.href = `pagamento.html?mesa=${mesaId}`;
        } else {
            alert('Selecione pelo menos um item para pagar.');
        }
    });

    await carregarComanda();
});
