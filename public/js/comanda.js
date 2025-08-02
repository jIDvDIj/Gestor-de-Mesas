document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mesaId = parseInt(urlParams.get('mesa'));
    const user = JSON.parse(localStorage.getItem('user'));

    if (!mesaId) {
        window.location.href = 'mesas.html';
        return;
    }

    // Elementos da página
    const comandaTitle = document.getElementById('comanda-title');
    const comandaItensDiv = document.getElementById('comanda-itens');
    const totalComandaDiv = document.getElementById('total-comanda');
    const funcionarioControls = document.getElementById('funcionario-controls');
    const clienteControls = document.getElementById('cliente-controls');
    const addItemForm = document.getElementById('add-item-form');
    const produtoSelect = document.getElementById('produto-select');
    const solicitarPagamentoButton = document.getElementById('solicitar-pagamento-button');
    const formaPagamentoSelect = document.getElementById('forma-pagamento-select');
    const funcionarioView = document.getElementById('funcionario-view');

    comandaTitle.textContent = `Comanda da Mesa ${mesaId}`;
    let comandaData = {};

    async function carregarComanda() {
        try {
            const response = await fetch(`http://localhost:3000/api/comandas/${mesaId}`);
            comandaData = await response.json();
            renderComanda();
            verificarPagamentosPendentes();
        } catch (error) {
            console.error('Erro ao carregar comanda:', error);
            comandaItensDiv.innerHTML = '<p>Não foi possível carregar a comanda.</p>';
        }
    }

    function renderComanda() {
        comandaItensDiv.innerHTML = '';
        let totalPendente = 0;
        const itensFiltrados = comandaData.itens.filter(i => i.status === 'pendente' || i.status === 'pagamento_solicitado');

        if (itensFiltrados.length === 0) {
            comandaItensDiv.innerHTML = '<p>Nenhum item pendente na comanda.</p>';
        }

        itensFiltrados.forEach(item => {
            const itemValor = item.preco * item.quantidade;
            totalPendente += itemValor;
            const itemElement = document.createElement('div');
            itemElement.className = 'comanda-item';
            const isSelectable = item.status === 'pendente' && !user;

            let statusLabel = '';
            if (item.status === 'pagamento_solicitado') {
                statusLabel = ' (Aguardando Pagamento)';
            }

            itemElement.innerHTML = `
                <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" data-item-valor="${itemValor}" ${isSelectable ? '' : 'disabled'}>
                <span>${item.quantidade}x ${item.nome} - R$ ${itemValor.toFixed(2)}</span>
                <span class="status-label">${statusLabel}</span>
            `;

            if (user && item.status === 'pendente') {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remover';
                removeButton.className = 'remover-item-btn';
                removeButton.dataset.itemId = item.id;
                removeButton.onclick = removerItem;
                itemElement.appendChild(removeButton);
            }

            comandaItensDiv.appendChild(itemElement);
        });

        totalComandaDiv.textContent = `Total Pendente: R$ ${totalPendente.toFixed(2)}`;

        // Adiciona listener para calcular total selecionado
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', calcularTotalSelecionado);
        });
        calcularTotalSelecionado(); // Calcula o total inicial (que será 0)
    }

    function calcularTotalSelecionado() {
        let totalSelecionado = 0;
        const checkboxes = document.querySelectorAll('.item-checkbox:checked');
        checkboxes.forEach(cb => {
            totalSelecionado += parseFloat(cb.dataset.itemValor);
        });

        // Remove o elemento antigo se existir
        const totalSelecionadoDiv = document.getElementById('total-selecionado');
        if (totalSelecionadoDiv) {
            totalSelecionadoDiv.remove();
        }

        if (totalSelecionado > 0) {
            const div = document.createElement('div');
            div.id = 'total-selecionado';
            div.className = 'total-selecionado-dinamico';
            div.textContent = `Total Selecionado: R$ ${totalSelecionado.toFixed(2)}`;
            clienteControls.insertBefore(div, solicitarPagamentoButton);
        }
    }

    function verificarPagamentosPendentes() {
        if (user && comandaData.pagamentosPendentes && comandaData.pagamentosPendentes.length > 0) {
            funcionarioView.innerHTML = `
                <button id="ver-pagamentos-btn" class="alerta">
                    Pagamento Pendente (${comandaData.pagamentosPendentes.length})
                </button>
            `;
            document.getElementById('ver-pagamentos-btn').addEventListener('click', () => {
                window.location.href = `pagamento.html?mesa=${mesaId}&modo=confirmacao`;
            });
        } else {
            funcionarioView.innerHTML = '';
        }
    }

    async function carregarProdutosParaSelect() {
        try {
            const response = await fetch('http://localhost:3000/api/produtos');
            const produtos = await response.json();
            produtoSelect.innerHTML = '';
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

    // Lógica de visualização (Cliente vs Funcionário)
    if (user && (user.cargo === 'funcionario' || user.cargo === 'gerente')) {
        funcionarioControls.style.display = 'block';
        carregarProdutosParaSelect();
    } else {
        clienteControls.style.display = 'block';
        document.querySelector('button[onclick*="mesas.html"]').style.display = 'none'; // Esconde "Voltar para Mesas"
    }

    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const produtoId = produtoSelect.value;
        const quantidade = document.getElementById('item-quantidade').value;

        try {
            const response = await fetch(`http://localhost:3000/api/comandas/${comandaData.comandaId}/itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ produtoId, quantidade }),
            });

            if (response.ok) {
                await carregarComanda();
                document.getElementById('item-quantidade').value = 1;
            } else {
                alert('Erro ao adicionar item.');
            }
        } catch (error) {
            console.error('Falha ao adicionar item:', error);
        }
    });

    solicitarPagamentoButton.addEventListener('click', async () => {
        const selectedItems = [];
        let valorAPagar = 0;
        const checkboxes = document.querySelectorAll('.item-checkbox:checked');

        checkboxes.forEach(cb => {
            selectedItems.push(parseInt(cb.dataset.itemId));
            valorAPagar += parseFloat(cb.dataset.itemValor);
        });

        const nomeCliente = document.getElementById('nome-cliente-input').value;

        if (selectedItems.length === 0) {
            return alert('Selecione pelo menos um item para pagar.');
        }
        if (!nomeCliente) {
            return alert('Por favor, informe seu nome para o pagamento.');
        }

        const formaPagamento = formaPagamentoSelect.value;

        try {
            const response = await fetch('http://localhost:3000/api/solicitar-pagamento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comandaId: comandaData.comandaId,
                    itemIds: selectedItems,
                    formaPagamento: formaPagamento,
                    valorTotal: valorAPagar,
                    nomeCliente: nomeCliente
                }),
            });

            if (response.ok) {
                alert('Pagamento solicitado. Aguarde um funcionário confirmar.');
                await carregarComanda();
            } else {
                alert('Erro ao solicitar pagamento.');
            }
        } catch (error) {
            console.error('Falha ao solicitar pagamento:', error);
        }
    });

    // --- Polling para atualização automática ---
    let comandaHash = '';
    async function iniciarPolling() {
        try {
            const response = await fetch(`http://localhost:3000/api/comandas/${mesaId}/hash`);
            const data = await response.json();

            // Na primeira vez, apenas armazena o hash
            if (comandaHash === '') {
                comandaHash = data.hash;
            } else if (comandaHash !== data.hash) {
                // Se o hash mudou, recarrega a página para mostrar as atualizações
                location.reload();
            }
        } catch (error) {
            console.error('Erro no polling:', error);
        }
    }

    async function removerItem(event) {
        const itemId = event.target.dataset.itemId;
        if (confirm('Tem certeza que deseja remover este item?')) {
            try {
                const response = await fetch(`http://localhost:3000/api/itens-comanda/${itemId}`, { method: 'DELETE' });
                if (response.ok) {
                    await carregarComanda();
                } else {
                    const err = await response.json();
                    alert(`Erro: ${err.error}`);
                }
            } catch (error) {
                console.error('Erro ao remover item:', error);
            }
        }
    }

    await carregarComanda();
    setInterval(iniciarPolling, 5000); // Verifica a cada 5 segundos
});
