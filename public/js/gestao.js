document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.cargo !== 'gerente') {
        window.location.href = 'login.html';
        return;
    }

    // Gerenciamento de Mesas
    const addMesaForm = document.getElementById('add-mesa-form');
    const mesaNumeroInput = document.getElementById('mesa-numero');
    const mesasList = document.getElementById('mesas-list');

    let mesas = [
        { id: 1, numero: 1 },
        { id: 2, numero: 2 },
        { id: 3, numero: 3 },
        { id: 4, numero: 4 },
        { id: 5, numero: 5 },
    ];

    function renderMesas() {
        mesasList.innerHTML = '';
        mesas.forEach(mesa => {
            const li = document.createElement('li');
            li.textContent = `Mesa ${mesa.numero}`;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remover';
            removeButton.onclick = () => {
                mesas = mesas.filter(m => m.id !== mesa.id);
                renderMesas();
            };
            li.appendChild(removeButton);
            mesasList.appendChild(li);
        });
    }

    addMesaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newMesa = {
            id: Date.now(),
            numero: parseInt(mesaNumeroInput.value),
        };
        mesas.push(newMesa);
        renderMesas();
        mesaNumeroInput.value = '';
    });

    // Gerenciamento de Funcionários
    const addFuncionarioForm = document.getElementById('add-funcionario-form');
    const funcionarioNomeInput = document.getElementById('funcionario-nome');
    const funcionarioSenhaInput = document.getElementById('funcionario-senha');
    const funcionariosList = document.getElementById('funcionarios-list');

    let funcionarios = [
        { id: 1, nome: 'funcionario1' },
    ];

    function renderFuncionarios() {
        funcionariosList.innerHTML = '';
        funcionarios.forEach(func => {
            const li = document.createElement('li');
            li.textContent = func.nome;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remover';
            removeButton.onclick = () => {
                funcionarios = funcionarios.filter(f => f.id !== func.id);
                renderFuncionarios();
            };
            li.appendChild(removeButton);
            funcionariosList.appendChild(li);
        });
    }

    addFuncionarioForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newFuncionario = {
            id: Date.now(),
            nome: funcionarioNomeInput.value,
        };
        funcionarios.push(newFuncionario);
        renderFuncionarios();
        funcionarioNomeInput.value = '';
        funcionarioSenhaInput.value = '';
    });

    // --- Gerenciamento de Produtos ---
    const addProdutoForm = document.getElementById('add-produto-form');
    const produtoNomeInput = document.getElementById('produto-nome');
    const produtoPrecoInput = document.getElementById('produto-preco');
    const produtosList = document.getElementById('produtos-list');

    async function carregarProdutos() {
        try {
            const response = await fetch('http://localhost:3000/api/produtos');
            const produtos = await response.json();
            renderProdutos(produtos);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            produtosList.innerHTML = '<li>Não foi possível carregar os produtos.</li>';
        }
    }

    function renderProdutos(produtos) {
        produtosList.innerHTML = '';
        produtos.forEach(produto => {
            const li = document.createElement('li');
            li.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)}`;
            // TODO: Implementar a remoção no backend e no frontend
            // const removeButton = document.createElement('button');
            // removeButton.textContent = 'Remover';
            // li.appendChild(removeButton);
            produtosList.appendChild(li);
        });
    }

    addProdutoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = produtoNomeInput.value;
        const preco = parseFloat(produtoPrecoInput.value);

        try {
            const response = await fetch('http://localhost:3000/api/produtos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, preco }),
            });
            if (response.ok) {
                carregarProdutos(); // Recarrega a lista
                produtoNomeInput.value = '';
                produtoPrecoInput.value = '';
            } else {
                alert('Erro ao adicionar produto.');
            }
        } catch (error) {
            console.error('Erro ao adicionar produto:', error);
            alert('Falha na comunicação com o servidor.');
        }
    });

    renderMesas();
    renderFuncionarios();
    carregarProdutos();
});
