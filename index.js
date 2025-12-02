const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// Importa o Model Estudante que o Sequelize criou
const { Paciente } = require('./models');

// Chave secreta para assinar o JWT. 
const JWT_SECRET = 'seu-segredo-super-secreto'; // Em um projeto real, isso DEVE estar em uma variável de ambiente (.env)!

app.use(express.json());


// ===== ROTAS ======

// Rota de Login para gerar o token
app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    // 1. Encontrar o usuário no nosso "BD"
    const user = await Paciente.findOne({ where: { usuario : `${usuario}` } });

    // 2. Verificar se o usuário existe e se a senha está correta
    if (!user || user.senha !== senha) {
        return res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
    }

    // 3. Se as credenciais estiverem corretas, gerar o token
    const token = jwt.sign({ userId: user.id, usuario: user.usuario }, JWT_SECRET, { expiresIn: '15m' }); // Token expira em 15 minutos

    // 4. Enviar o token para o cliente
    res.json({ mensagem: 'Login bem-sucedido!', token: token });
});

// Middleware para verificar o JWT
function verificaJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ mensagem: 'Token de autenticação não fornecido.' });
    }
    // O token vem no formato "Bearer <token>"
    const token = authHeader.split(' ')[1]; //dividindo a string em 2, baseado no " ", e pegando apenas a posição 1
    // Verifica se o token é válido
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Se o erro for de expiração, a mensagem é mais específica
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ mensagem: 'Token expirado.' });
            }
            return res.status(401).json({ mensagem: 'Token inválido.' });
        }
        // Se o token for válido, os dados decodificados são adicionados à requisição para uso posterior.
        req.usuarioLogado = decoded;
        next(); // Permite que a requisição prossiga para a rota
    });
}


// Rota PÚBLICA, acessível por qualquer um
app.get('/', (req, res) => {
    res.json({ mensagem: 'Bem-vindo à nossa API pública para Clínica Médica!' });
});

//Cria um novo paciente/usuário no banco de dados.
app.post('/pacientes', async (req, res) => {
    try {
        const novoPaciente = await Paciente.create(req.body);
        res.status(201).json(novoPaciente);
    } catch (error) {
        res.status(400).json({ mensagem: 'Erro ao criar paciente.', erro: error.message });
    }
});

// ROTAS PRIVADAS

app.get('/pacientes',verificaJWT, async (req, res) => {
    try {
        const pacientes = await Paciente.findAll();
        res.status(200).json(pacientes);
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao buscar pacientes.' });
    }
});

app.get('/pacientes/:id', verificaJWT, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id); // findByPk = Find by Primary Key
        if (!paciente) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
        }
        res.status(200).json(paciente);
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao buscar estudante.' });
    }
});

app.put('/pacientes/:id', verificaJWT, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
        }
        await paciente.update(req.body);
        res.status(200).json(paciente);
    } catch (error) {
        res.status(400).json({ mensagem: 'Erro ao atualizar paciente.', erro: error.message });
    }
});

app.delete('/pacientes/:id',verificaJWT, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
        }
        await paciente.destroy();
        res.status(204).send(); // 204: No Content
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao deletar paciente.' });
    }
});





// SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});