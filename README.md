📁 Documentação do Projeto - Sistema de Certificados
🏗️ Estrutura do Projeto
text
SISTEMA_CERTIFICADOS/
├── 📁 backend/     # API REST Node.js/Express
├── 📁 frontend/    # Aplicação React
└── 📁 src/         # Códigos principais
🔙 BACKEND
📋 Descrição
API RESTful para gerenciamento de eventos, participantes e emissão de certificados.

🛠️ Tecnologias
Node.js - Ambiente de execução

Express.js - Framework web

SQLite3 - Banco de dados

CORS - Middleware de segurança

Body Parser - Processamento de requisições

📊 Banco de Dados
Tabela: Eventos
sql
- id (INTEGER, PRIMARY KEY)
- nome (TEXT)
- datas (TEXT)
- carga_horaria (INTEGER)
- dias (INTEGER)
- conteudo (TEXT)
- created_at (DATETIME)
Tabela: Participantes
sql
- id (INTEGER, PRIMARY KEY)
- evento_id (INTEGER, FOREIGN KEY)
- nome (TEXT)
- cpf (TEXT)
- email (TEXT)
- frequencia (TEXT - array JSON)
- created_at (DATETIME)
🔌 Endpoints da API
Eventos
GET /api/eventos - Listar todos os eventos

POST /api/eventos - Criar novo evento

DELETE /api/eventos/:id - Excluir evento

Participantes
GET /api/participantes - Listar participantes

POST /api/participantes - Criar participante

PUT /api/participantes/:id/frequencia - Atualizar frequência

DELETE /api/participantes/:id - Excluir participante

Saúde do Sistema
GET /api/health - Health check da API

🚀 Execução
bash
cd backend
npm start
# Servidor rodando em: http://localhost:5000
📦 Dependências Principais
json
{
  "express": "^4.18.0",
  "sqlite3": "^5.1.0",
  "cors": "^2.8.5"
}
