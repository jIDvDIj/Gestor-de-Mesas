document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = event.target.username.value;
    const password = event.target.password.value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = ''; // Limpa mensagens de erro anteriores

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Armazena os dados do usuário no localStorage para uso em outras páginas
            localStorage.setItem('user', JSON.stringify(data.user));
            // Redireciona para a página de mesas
            window.location.href = 'mesas.html';
        } else {
            errorMessage.textContent = data.message || 'Usuário ou senha inválidos.';
        }
    } catch (error) {
        console.error('Erro ao tentar fazer login:', error);
        errorMessage.textContent = 'Não foi possível conectar ao servidor. Tente novamente mais tarde.';
    }
});
