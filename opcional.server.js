// Importações
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

// Configuração CORS para desenvolvimento
app.use(cors());

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Conectar ao SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
  }
});

// Criar tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    datas TEXT NOT NULL,
    carga_horaria INTEGER NOT NULL,
    dias INTEGER NOT NULL,
    conteudo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS participantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT,
    frequencia TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evento_id) REFERENCES eventos (id)
  )`);
});

// Health Check
app.get('/api/health', (req, res) => {
  db.get('SELECT 1 as health', (err) => {
    if (err) {
      return res.status(503).json({ 
        status: 'ERROR', 
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      status: 'OK', 
      message: 'Servidor e banco de dados funcionando corretamente',
      timestamp: new Date().toISOString()
    });
  });
});

// Rotas para Eventos
app.get('/api/eventos', (req, res) => {
  db.all('SELECT * FROM eventos ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/eventos', (req, res) => {
  const { nome, datas, carga_horaria, dias, conteudo } = req.body;
  
  db.run(
    `INSERT INTO eventos (nome, datas, carga_horaria, dias, conteudo) 
     VALUES (?, ?, ?, ?, ?)`,
    [nome, datas, carga_horaria, dias, conteudo],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.delete('/api/eventos/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM eventos WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deletedID: id });
  });
});

// Rotas para Participantes
app.get('/api/participantes', (req, res) => {
  db.all(`
    SELECT p.*, e.nome as evento_nome 
    FROM participantes p 
    LEFT JOIN eventos e ON p.evento_id = e.id 
    ORDER BY p.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse frequencia de string para array
    const participantes = rows.map(p => ({
      ...p,
      frequencia: p.frequencia ? JSON.parse(p.frequencia) : []
    }));
    res.json(participantes);
  });
});

app.post('/api/participantes', (req, res) => {
  const { evento_id, nome, cpf, email, frequencia } = req.body;
  
  db.run(
    `INSERT INTO participantes (evento_id, nome, cpf, email, frequencia) 
     VALUES (?, ?, ?, ?, ?)`,
    [evento_id, nome, cpf, email, JSON.stringify(frequencia)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/participantes/:id/frequencia', (req, res) => {
  const id = req.params.id;
  const { frequencia } = req.body;
  
  db.run(
    'UPDATE participantes SET frequencia = ? WHERE id = ?',
    [JSON.stringify(frequencia), id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ updatedID: id });
    }
  );
});

app.delete('/api/participantes/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM participantes WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deletedID: id });
  });
});

// Rota para informações da API
app.get('/', (req, res) => {
  res.json({ 
    message: 'API do Sistema de Certificados',
    version: '1.0.0',
    endpoints: {
      eventos: '/api/eventos',
      participantes: '/api/participantes',
      health: '/api/health'
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend rodando na porta ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/`);
});