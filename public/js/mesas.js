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

    async function carregarMesas() {
        try {
            const response = await fetch('http://localhost:3000/api/mesas');
            const mesas = await response.json();

            // TODO: A lógica de status (livre/ocupada) precisará ser implementada no backend
            // Por enquanto, vamos simular o status no frontend
            mesas.forEach(mesa => {
                const mesaElement = document.createElement('div');
                // Simulação de status
                const status = Math.random() > 0.5 ? 'ocupada' : 'livre';
                mesaElement.className = `mesa ${status}`;
                mesaElement.textContent = `Mesa ${mesa.numero}`;
                mesaElement.dataset.mesaId = mesa.id;

                mesaElement.addEventListener('click', () => {
                    window.location.href = `comanda.html?mesa=${mesa.id}`;
                });
                mesasGrid.appendChild(mesaElement);
            });
        } catch (error) {
            console.error('Erro ao carregar mesas:', error);
            mesasGrid.innerHTML = '<p>Não foi possível carregar as mesas.</p>';
        }
    }

    carregarMesas();
});
