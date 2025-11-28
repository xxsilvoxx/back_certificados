const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS para produção
app.use(cors({
  origin: [
    'https://front-certificados-g7xf.vercel.app',
    'http://localhost:3000',
    '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database - usar memória para garantir funcionamento
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('❌ Erro no banco:', err);
  } else {
    console.log('✅ Banco de dados em memória iniciado');
  }
});

// Inicialização do banco
db.serialize(() => {
  // Tabela eventos
  db.run(`CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    datas TEXT NOT NULL,
    carga_horaria INTEGER NOT NULL,
    dias INTEGER NOT NULL,
    conteudo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabela participantes
  db.run(`CREATE TABLE IF NOT EXISTS participantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT,
    frequencia TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Dados de exemplo
  db.run(`INSERT INTO eventos (nome, datas, carga_horaria, dias, conteudo) 
          VALUES ('Evento de Exemplo', '01, 02 e 03 de Janeiro de 2024', 20, 3, 
          '- PLANO DE FORMAÇÃO DE PROFESSORES\n- INCLUSÃO: DESAFIOS E PERCEPÇÕES')`);
});

// ==================== ROTAS PRINCIPAIS ====================

// Rota raiz - IMPORTANTE para Render
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Sistema de Certificados - Coronel Vivida',
    status: 'Online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      login: 'POST /api/login',
      eventos: {
        listar: 'GET /api/eventos',
        criar: 'POST /api/eventos',
        deletar: 'DELETE /api/eventos/:id'
      },
      participantes: {
        listar: 'GET /api/participantes',
        criar: 'POST /api/participantes',
        frequencia: 'PUT /api/participantes/:id/frequencia',
        deletar: 'DELETE /api/participantes/:id'
      }
    }
  });
});

// Health Check - ESSENCIAL para Render
app.get('/api/health', (req, res) => {
  db.get('SELECT 1 as test', (err, row) => {
    if (err) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Database error',
        error: err.message
      });
    }
    res.json({
      status: 'OK',
      message: 'Backend funcionando corretamente',
      database: 'Connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
});

// ==================== AUTENTICAÇÃO ====================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Usuário e senha são obrigatórios'
    });
  }

  // Validação simples
  if (username === 'coronelvivida' && password === 'educacao@2024') {
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        username: username,
        name: 'Prefeitura de Coronel Vivida',
        role: 'admin'
      },
      token: 'token-' + Date.now()
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    });
  }
});

// ==================== ROTAS DE EVENTOS ====================

app.get('/api/eventos', (req, res) => {
  db.all('SELECT * FROM eventos ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Erro ao buscar eventos:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    res.json(rows);
  });
});

app.post('/api/eventos', (req, res) => {
  const { nome, datas, carga_horaria, dias, conteudo } = req.body;

  if (!nome || !datas || !carga_horaria || !dias) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  db.run(
    `INSERT INTO eventos (nome, datas, carga_horaria, dias, conteudo) VALUES (?, ?, ?, ?, ?)`,
    [nome, datas, carga_horaria, dias, conteudo || ''],
    function(err) {
      if (err) {
        console.error('Erro ao criar evento:', err);
        return res.status(500).json({ error: 'Erro ao criar evento' });
      }
      res.json({
        id: this.lastID,
        message: 'Evento criado com sucesso'
      });
    }
  );
});

app.delete('/api/eventos/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM eventos WHERE id = ?', id, function(err) {
    if (err) {
      console.error('Erro ao deletar evento:', err);
      return res.status(500).json({ error: 'Erro ao deletar evento' });
    }
    res.json({
      deletedID: id,
      message: 'Evento deletado com sucesso'
    });
  });
});

// ==================== ROTAS DE PARTICIPANTES ====================

app.get('/api/participantes', (req, res) => {
  db.all(`
    SELECT p.*, e.nome as evento_nome 
    FROM participantes p 
    LEFT JOIN eventos e ON p.evento_id = e.id 
    ORDER BY p.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar participantes:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    const participantes = rows.map(p => ({
      ...p,
      frequencia: p.frequencia ? JSON.parse(p.frequencia) : []
    }));
    
    res.json(participantes);
  });
});

app.post('/api/participantes', (req, res) => {
  const { evento_id, nome, cpf, email, frequencia } = req.body;

  if (!evento_id || !nome || !cpf) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  db.run(
    `INSERT INTO participantes (evento_id, nome, cpf, email, frequencia) VALUES (?, ?, ?, ?, ?)`,
    [evento_id, nome, cpf, email || '', JSON.stringify(frequencia || [])],
    function(err) {
      if (err) {
        console.error('Erro ao criar participante:', err);
        return res.status(500).json({ error: 'Erro ao criar participante' });
      }
      res.json({
        id: this.lastID,
        message: 'Participante criado com sucesso'
      });
    }
  );
});

app.put('/api/participantes/:id/frequencia', (req, res) => {
  const id = req.params.id;
  const { frequencia } = req.body;

  if (!frequencia || !Array.isArray(frequencia)) {
    return res.status(400).json({ error: 'Frequência deve ser um array' });
  }

  db.run(
    'UPDATE participantes SET frequencia = ? WHERE id = ?',
    [JSON.stringify(frequencia), id],
    function(err) {
      if (err) {
        console.error('Erro ao atualizar frequência:', err);
        return res.status(500).json({ error: 'Erro ao atualizar frequência' });
      }
      res.json({
        updatedID: id,
        message: 'Frequência atualizada com sucesso'
      });
    }
  );
});

app.delete('/api/participantes/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM participantes WHERE id = ?', id, function(err) {
    if (err) {
      console.error('Erro ao deletar participante:', err);
      return res.status(500).json({ error: 'Erro ao deletar participante' });
    }
    res.json({
      deletedID: id,
      message: 'Participante deletado com sucesso'
    });
  });
});

// Rota para favicon (evita erro 404)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Rota catch-all para 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/login',
      'GET /api/eventos',
      'POST /api/eventos',
      'DELETE /api/eventos/:id',
      'GET /api/participantes',
      'POST /api/participantes',
      'PUT /api/participantes/:id/frequencia',
      'DELETE /api/participantes/:id'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Algo deu errado'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 =================================');
  console.log('✅ Backend iniciado com sucesso!');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log('🚀 =================================');
});