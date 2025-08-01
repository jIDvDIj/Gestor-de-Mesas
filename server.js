const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Para parsear o corpo das requisições em JSON

// Conexão com o banco de dados
const db = new sqlite3.Database('./db/database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Rota de teste
app.get('/', (req, res) => {
    res.send('Backend do Restaurante está funcionando!');
});

// --- Endpoints da API ---

// Endpoint de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const sql = 'SELECT * FROM usuarios WHERE nome = ? AND senha = ?';
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor.' });
        }
        if (row) {
            res.json({
                success: true,
                user: {
                    username: row.nome,
                    cargo: row.cargo,
                },
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }
    });
});

// Endpoint para processar pagamento
app.post('/api/pagamentos', (req, res) => {
    const { itemIds } = req.body;

    if (!itemIds || itemIds.length === 0) {
        return res.status(400).json({ error: 'É necessário fornecer os IDs dos itens.' });
    }

    const placeholders = itemIds.map(() => '?').join(',');
    const sql = `UPDATE itens_comanda SET pago = 1 WHERE id IN (${placeholders})`;

    db.run(sql, itemIds, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao processar pagamento.' });
        }
        res.json({ success: true, message: 'Pagamento processado com sucesso.' });
    });
});

// Endpoint para adicionar um item à comanda
app.post('/api/comandas/:comandaId/itens', (req, res) => {
    const { comandaId } = req.params;
    const { produtoId, quantidade } = req.body;

    if (!produtoId || !quantidade) {
        return res.status(400).json({ error: 'Produto e quantidade são obrigatórios.' });
    }

    const sql = 'INSERT INTO itens_comanda (comanda_id, produto_id, quantidade) VALUES (?, ?, ?)';
    db.run(sql, [comandaId, produtoId, quantidade], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao adicionar item.' });
        }
        res.status(201).json({ id: this.lastID });
    });
});

// Endpoint para buscar os itens de uma comanda
app.get('/api/comandas/:mesaId', (req, res) => {
    const { mesaId } = req.params;

    // Primeiro, encontra ou cria uma comanda aberta para a mesa
    const findOrCreateComandaSql = `
        INSERT INTO comandas (mesa_id, fechada)
        SELECT ?, 0
        WHERE NOT EXISTS (SELECT 1 FROM comandas WHERE mesa_id = ? AND fechada = 0);
    `;

    db.run(findOrCreateComandaSql, [mesaId, mesaId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao gerenciar comanda.' });
        }

        const getComandaIdSql = 'SELECT id FROM comandas WHERE mesa_id = ? AND fechada = 0';
        db.get(getComandaIdSql, [mesaId], (err, comanda) => {
            if (err || !comanda) {
                return res.status(500).json({ error: 'Comanda não encontrada.' });
            }

            const getItensSql = `
                SELECT ic.id, ic.quantidade, ic.pago, p.nome, p.preco
                FROM itens_comanda ic
                JOIN produtos p ON ic.produto_id = p.id
                WHERE ic.comanda_id = ?`;

            db.all(getItensSql, [comanda.id], (err, itens) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar itens da comanda.' });
                }
                res.json({ comandaId: comanda.id, itens: itens });
            });
        });
    });
});

// Endpoint para buscar todos os produtos
app.get('/api/produtos', (req, res) => {
    const sql = 'SELECT * FROM produtos ORDER BY nome';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor.' });
        }
        res.json(rows);
    });
});

// Endpoint para adicionar um novo produto
app.post('/api/produtos', (req, res) => {
    const { nome, preco } = req.body;
    if (!nome || !preco) {
        return res.status(400).json({ error: 'Nome e preço são obrigatórios.' });
    }

    const sql = 'INSERT INTO produtos (nome, preco) VALUES (?, ?)';
    db.run(sql, [nome, preco], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao adicionar produto.' });
        }
        res.status(201).json({ id: this.lastID, nome, preco });
    });
});

// Endpoint para buscar todas as mesas
app.get('/api/mesas', (req, res) => {
    const sql = 'SELECT * FROM mesas ORDER BY numero';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor.' });
        }
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
