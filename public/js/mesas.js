document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userInfo = document.getElementById('user-info');
    const logoutButton = document.getElementById('logout-button');
    const gestaoButton = document.getElementById('gestao-button');
    const mesasGrid = document.getElementById('mesas-grid');

    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    userInfo.textContent = `Usuário: ${user.username} (${user.cargo})`;

    if (user.cargo === 'gerente') {
        gestaoButton.style.display = 'block';
        gestaoButton.addEventListener('click', () => {
            window.location.href = 'gestao.html';
        });
    }

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });

    const filaPagamentosBtn = document.getElementById('fila-pagamentos-btn');

    async function carregarStatusMesas() {
        try {
            const response = await fetch('/api/status-mesas');
            const mesas = await response.json();

            mesasGrid.innerHTML = ''; // Limpa o grid
            let pagamentosPendentesCount = 0;

            mesas.forEach(mesa => {
                if (mesa.pagamento_pendente) {
                    pagamentosPendentesCount++;
                }
                const mesaElement = document.createElement('div');
                let statusClass = 'livre';
                if (mesa.pagamento_pendente) statusClass = 'pagamento-pendente';
                else if (mesa.ocupada) statusClass = 'ocupada';

                mesaElement.className = `mesa ${statusClass}`;
                mesaElement.textContent = `Mesa ${mesa.numero}`;
                mesaElement.dataset.mesaId = mesa.id;
                mesaElement.addEventListener('click', () => {
                    window.location.href = `comanda.html?mesa=${mesa.id}`;
                });
                mesasGrid.appendChild(mesaElement);
            });

            // Atualiza o botão da fila de pagamentos
            filaPagamentosBtn.textContent = `Fila de Pagamentos (${pagamentosPendentesCount})`;
            if (pagamentosPendentesCount > 0) {
                filaPagamentosBtn.classList.add('alerta');
            } else {
                filaPagamentosBtn.classList.remove('alerta');
            }

        } catch (error) {
            console.error('Erro ao carregar status das mesas:', error);
            mesasGrid.innerHTML = '<p>Não foi possível carregar as mesas.</p>';
        }
    }

    filaPagamentosBtn.addEventListener('click', () => {
        window.location.href = 'fila-pagamentos.html';
    });

    carregarStatusMesas();
    setInterval(carregarStatusMesas, 10000); // Atualiza a cada 10 segundos
});
