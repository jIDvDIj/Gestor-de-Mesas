document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.cargo !== 'gerente') {
        window.location.href = 'login.html';
        return;
    }

    // --- Gerenciamento de Mesas ---
    const addMesaForm = document.getElementById('add-mesa-form');
    const mesaNumeroInput = document.getElementById('mesa-numero');
    const mesasList = document.getElementById('mesas-list');

    async function carregarMesas() {
        try {
            const response = await fetch('http://localhost:3000/api/mesas');
            const mesas = await response.json();
            renderMesas(mesas);
        } catch (error) {
            console.error('Erro ao carregar mesas:', error);
        }
    }

    function renderMesas(mesas) {
        mesasList.innerHTML = '';
        mesas.forEach(mesa => {
            const li = document.createElement('li');
            li.innerHTML = `<span>Mesa ${mesa.numero}</span>`;

            const linkButton = document.createElement('button');
            linkButton.textContent = 'Gerar Link';
            linkButton.onclick = () => {
                const url = `${window.location.origin}/public/comanda.html?mesa=${mesa.id}`;
                prompt(`Link de acesso para a Mesa ${mesa.numero}:`, url);
            };

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remover';
            removeButton.onclick = () => removerMesa(mesa.id);

            const divBotoes = document.createElement('div');
            divBotoes.appendChild(linkButton);
            divBotoes.appendChild(removeButton);
            li.appendChild(divBotoes);

            mesasList.appendChild(li);
        });
    }

    addMesaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const numero = parseInt(mesaNumeroInput.value);
        try {
            await fetch('http://localhost:3000/api/mesas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero }),
            });
            mesaNumeroInput.value = '';
            carregarMesas();
        } catch (error) {
            console.error('Erro ao adicionar mesa:', error);
        }
    });

    async function removerMesa(id) {
        if (confirm(`Tem certeza que deseja remover a mesa ${id}?`)) {
            try {
                await fetch(`http://localhost:3000/api/mesas/${id}`, { method: 'DELETE' });
                carregarMesas();
            } catch (error) {
                console.error('Erro ao remover mesa:', error);
            }
        }
    }

    // --- Gerenciamento de Funcionários ---
    const addFuncionarioForm = document.getElementById('add-funcionario-form');
    const funcionarioNomeInput = document.getElementById('funcionario-nome');
    const funcionarioSenhaInput = document.getElementById('funcionario-senha');
    const funcionarioCargoSelect = document.getElementById('funcionario-cargo');
    const funcionariosList = document.getElementById('funcionarios-list');

    async function carregarFuncionarios() {
        try {
            const response = await fetch('http://localhost:3000/api/usuarios');
            const funcionarios = await response.json();
            renderFuncionarios(funcionarios);
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
        }
    }

    function renderFuncionarios(funcionarios) {
        funcionariosList.innerHTML = '';
        funcionarios.forEach(func => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${func.nome} - <strong>${func.cargo}</strong></span>
                <div>
                    <button class="edit-btn" data-id="${func.id}" data-cargo="${func.cargo}">Editar Cargo</button>
                    <button class="delete-btn" data-id="${func.id}">Remover</button>
                </div>
            `;
            funcionariosList.appendChild(li);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', editarUsuario));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', removerFuncionario));
    }

    addFuncionarioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = funcionarioNomeInput.value;
        const senha = funcionarioSenhaInput.value;
        const cargo = funcionarioCargoSelect.value;

        try {
            await fetch('http://localhost:3000/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, senha, cargo }),
            });
            funcionarioNomeInput.value = '';
            funcionarioSenhaInput.value = '';
            carregarFuncionarios();
        } catch (error) {
            console.error('Erro ao adicionar funcionário:', error);
        }
    });

    async function editarUsuario(event) {
        const id = event.target.dataset.id;
        const nomeAtual = event.target.parentElement.parentElement.querySelector('span').textContent.split(' - ')[0];

        const novoNome = prompt('Novo nome:', nomeAtual);
        if (!novoNome) return;

        const novaSenha = prompt('Nova senha (deixe em branco para não alterar):');

        let novoCargo = prompt('Novo cargo (funcionario ou gerente):', event.target.dataset.cargo);
        while(novoCargo && novoCargo !== 'funcionario' && novoCargo !== 'gerente') {
            novoCargo = prompt('Cargo inválido. Digite "funcionario" ou "gerente":');
        }
        if (!novoCargo) return;

        const data = { nome: novoNome, cargo: novoCargo };
        if (novaSenha) {
            data.senha = novaSenha;
        }

        try {
            await fetch(`http://localhost:3000/api/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            carregarFuncionarios();
        } catch (error) {
            console.error('Erro ao editar usuário:', error);
        }
    }

    async function removerFuncionario(event) {
        const id = event.target.dataset.id;
        if (confirm('Tem certeza que deseja remover este funcionário?')) {
            try {
                await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' });
                carregarFuncionarios();
            } catch (error) {
                console.error('Erro ao remover funcionário:', error);
            }
        }
    }

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

    // --- Relatórios ---
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio-btn');
    const relatorioResultadoDiv = document.getElementById('relatorio-resultado');

    gerarRelatorioBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/api/relatorio-vendas');
            const relatorio = await response.json();

            let html = `<h4>Total Geral: R$ ${relatorio.totalGeral.toFixed(2)}</h4><ul>`;
            relatorio.detalhes.forEach(detalhe => {
                html += `<li>${detalhe.forma_pagamento}: R$ ${detalhe.total_vendido.toFixed(2)}</li>`;
            });
            html += '</ul>';

            relatorioResultadoDiv.innerHTML = html;
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            relatorioResultadoDiv.innerHTML = '<p>Não foi possível gerar o relatório.</p>';
        }
    });

    carregarMesas();
    carregarFuncionarios();
    carregarProdutos();
});
