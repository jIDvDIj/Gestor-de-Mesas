const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Para parsear o corpo das requisições em JSON
app.use(express.static('public')); // Servir arquivos estáticos da pasta public

// --- Configuração do Banco de Dados ---
// O caminho do banco de dados pode ser definido por uma variável de ambiente,
// o que é útil para ambientes de produção como o Render.
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'db', 'database.db');

// Garante que o diretório do banco de dados exista
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message, `(Caminho: ${dbPath})`);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Rota para a página inicial - serve o login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
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

// Endpoint para gerar relatório de vendas
app.get('/api/relatorio-vendas', (req, res) => {
    const sql = `
        SELECT
            forma_pagamento,
            SUM(valor_total) as total_vendido
        FROM pagamentos
        WHERE status = 'confirmado'
        GROUP BY forma_pagamento
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao gerar relatório.' });
        }

        const relatorio = {
            detalhes: rows,
            totalGeral: rows.reduce((acc, row) => acc + row.total_vendido, 0)
        };
        res.json(relatorio);
    });
});

// Endpoint para o FUNCIONÁRIO negar um pagamento
app.post('/api/negar-pagamento/:pagamentoId', (req, res) => {
    const { pagamentoId } = req.params;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // Reverte o status dos itens
        const updateItensSql = "UPDATE itens_comanda SET status = 'pendente', pagamento_id = NULL WHERE pagamento_id = ?";
        db.run(updateItensSql, [pagamentoId], function(err) {
            if (err) {
                db.run('ROLLBACK;');
                return res.status(500).json({ error: 'Erro ao reverter status dos itens.' });
            }

            // Deleta o registro de pagamento
            const deletePagamentoSql = "DELETE FROM pagamentos WHERE id = ?";
            db.run(deletePagamentoSql, [pagamentoId], function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ error: 'Erro ao deletar pagamento.' });
                }

                db.run('COMMIT;');
                res.json({ success: true, message: 'Pagamento negado com sucesso.' });
            });
        });
    });
});

// Endpoint para o CLIENTE solicitar um pagamento
app.post('/api/solicitar-pagamento', (req, res) => {
    const { comandaId, itemIds, formaPagamento, valorTotal, nomeCliente } = req.body;

    if (!comandaId || !itemIds || itemIds.length === 0 || !formaPagamento || !valorTotal || !nomeCliente) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios para solicitar o pagamento.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const insertPagamentoSql = `
            INSERT INTO pagamentos (comanda_id, forma_pagamento, status, valor_total, nome_cliente)
            VALUES (?, ?, 'pendente', ?, ?)
        `;
        db.run(insertPagamentoSql, [comandaId, formaPagamento, valorTotal, nomeCliente], function(err) {
            if (err) {
                db.run('ROLLBACK;');
                return res.status(500).json({ error: 'Erro ao criar registro de pagamento.' });
            }

            const pagamentoId = this.lastID;
            const placeholders = itemIds.map(() => '?').join(',');
            const updateItensSql = `
                UPDATE itens_comanda
                SET status = 'pagamento_solicitado', pagamento_id = ?
                WHERE id IN (${placeholders})
            `;

            db.run(updateItensSql, [pagamentoId, ...itemIds], function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ error: 'Erro ao atualizar status dos itens.' });
                }

                db.run('COMMIT;');
                res.status(201).json({ success: true, pagamentoId });
            });
        });
    });
});

// Endpoint para o FUNCIONÁRIO confirmar um pagamento
app.post('/api/confirmar-pagamento/:pagamentoId', (req, res) => {
    const { pagamentoId } = req.params;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        const updatePagamentoSql = "UPDATE pagamentos SET status = 'confirmado' WHERE id = ?";
        db.run(updatePagamentoSql, [pagamentoId], function(err) {
            if (err) {
                db.run('ROLLBACK;');
                return res.status(500).json({ error: 'Erro ao confirmar pagamento.' });
            }

            const updateItensSql = "UPDATE itens_comanda SET status = 'pago' WHERE pagamento_id = ?";
            db.run(updateItensSql, [pagamentoId], function(err) {
                if (err) {
                    db.run('ROLLBACK;');
                    return res.status(500).json({ error: 'Erro ao atualizar itens para pago.' });
                }

                db.run('COMMIT;');
                res.json({ success: true, message: 'Pagamento confirmado com sucesso.' });
            });
        });
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
                SELECT ic.id, ic.quantidade, ic.status, ic.pagamento_id, p.nome, p.preco
                FROM itens_comanda ic
                JOIN produtos p ON ic.produto_id = p.id
                WHERE ic.comanda_id = ?`;

            db.all(getItensSql, [comanda.id], (err, itens) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar itens.' });
                }

                const getPagamentosPendentesSql = `
                    SELECT * FROM pagamentos WHERE comanda_id = ? AND status = 'pendente'
                `;
                db.all(getPagamentosPendentesSql, [comanda.id], (err, pagamentos) => {
                    if (err) {
                        return res.status(500).json({ error: 'Erro ao buscar pagamentos pendentes.' });
                    }
                    res.json({ comandaId: comanda.id, itens: itens, pagamentosPendentes: pagamentos });
                });
            });
        });
    });
});

// Endpoint para remover um item da comanda
app.delete('/api/itens-comanda/:id', (req, res) => {
    const { id } = req.params;
    // Apenas permite deletar se o item ainda não foi pago ou solicitado
    const sql = "DELETE FROM itens_comanda WHERE id = ? AND status = 'pendente'";

    db.run(sql, id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(403).json({ error: 'Não é possível remover um item com pagamento solicitado ou já pago.' });
        }
        res.json({ deleted: this.changes });
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

// Endpoint para verificar status de todas as mesas
app.get('/api/status-mesas', (req, res) => {
    const sql = `
        SELECT
            m.id,
            m.numero,
            (SELECT COUNT(*) FROM itens_comanda ic JOIN comandas c ON ic.comanda_id = c.id WHERE c.mesa_id = m.id AND ic.status = 'pendente') > 0 as ocupada,
            (SELECT COUNT(*) FROM itens_comanda ic JOIN comandas c ON ic.comanda_id = c.id WHERE c.mesa_id = m.id AND ic.status = 'pagamento_solicitado') > 0 as pagamento_pendente
        FROM mesas m
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor.' });
        }
        res.json(rows);
    });
});

// Endpoint para verificar o estado de uma comanda com um hash
app.get('/api/comandas/:mesaId/hash', (req, res) => {
    const { mesaId } = req.params;
    const sql = `
        SELECT
            GROUP_CONCAT(ic.id || '-' || ic.status || '-' || ic.quantidade) as hash
        FROM itens_comanda ic
        JOIN comandas c ON ic.comanda_id = c.id
        WHERE c.mesa_id = ? AND c.fechada = 0
    `;
    db.get(sql, [mesaId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao gerar hash da comanda.' });
        }
        res.json({ hash: row ? row.hash : '' });
    });
});


// Endpoint para buscar todos os pagamentos pendentes
app.get('/api/pagamentos-pendentes', (req, res) => {
    const sql = `
        SELECT
            p.id,
            p.forma_pagamento,
            p.valor_total,
            p.nome_cliente,
            p.comanda_id,
            m.numero as mesa_numero
        FROM pagamentos p
        JOIN comandas c ON p.comanda_id = c.id
        JOIN mesas m ON c.mesa_id = m.id
        WHERE p.status = 'pendente'
        ORDER BY p.id ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar pagamentos pendentes.' });
        }
        res.json(rows);
    });
});

// --- CRUD de Usuários ---
app.get('/api/usuarios', (req, res) => {
    db.all('SELECT id, nome, cargo FROM usuarios', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/usuarios', (req, res) => {
    const { nome, senha, cargo } = req.body;
    if (!nome || !senha || !cargo) return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });

    const sql = 'INSERT INTO usuarios (nome, senha, cargo) VALUES (?, ?, ?)';
    db.run(sql, [nome, senha, cargo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/usuarios/:id', (req, res) => {
    const { nome, senha, cargo } = req.body;
    const { id } = req.params;

    if (!nome || !cargo) {
        return res.status(400).json({ error: 'Nome e cargo são obrigatórios.' });
    }

    // Se a senha for fornecida, atualiza. Senão, mantém a antiga.
    let sql = 'UPDATE usuarios SET nome = ?, cargo = ? WHERE id = ?';
    let params = [nome, cargo, id];

    if (senha) {
        sql = 'UPDATE usuarios SET nome = ?, senha = ?, cargo = ? WHERE id = ?';
        params = [nome, senha, cargo, id];
    }

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM usuarios WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});


// --- CRUD de Mesas ---
app.get('/api/mesas', (req, res) => {
    const sql = 'SELECT * FROM mesas ORDER BY numero';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/mesas', (req, res) => {
    const { numero } = req.body;
    if (!numero) return res.status(400).json({ error: 'O número da mesa é obrigatório.' });

    db.run('INSERT INTO mesas (numero) VALUES (?)', [numero], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.delete('/api/mesas/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM mesas WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
