const express = require('express');
const qrcode = require('qrcode');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações básicas
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'chave-secreta-do-bolao',
    resave: false,
    saveUninitialized: true
}));

// Banco de dados em memória (substitua por um banco real como MongoDB/Supabase depois)
let palpites = [];

// Tela Principal - Cadastro do Palpite
app.get('/', (req, res) => {
    res.send(`
        <h2>Bolão Copa do Mundo - Brasil vs Mundo ⚽</h2>
        <form action="/pagamento" method="POST">
            <label>Nome Completo:</label><br>
            <input type="text" name="nome" required><br><br>
            
            <label>WhatsApp (com DDD):</label><br>
            <input type="tel" name="telefone" placeholder="11999999999" required><br><br>
            
            <label>Seu Palpite (Ex: Brasil 3 x 1 França):</label><br>
            <input type="text" name="palpite" required><br><br>
            
            <label>Valor da Inscrição:</label><br>
            <select name="valor" required>
                <option value="15">R$ 15,00</option>
                <option value="30">R$ 30,00</option>
                <option value="50">R$ 50,00</option>
            </select><br><br>
            
            <button type="submit">Ir para o Pagamento</button>
        </form>
    `);
});

// Tela de Pagamento - Gera o QR Code Pix
app.post('/pagamento', async (req, res) => {
    const { nome, telefone, palpite, valor } = req.body;

    // Lógica simples de Pix Estático (Substitua pela sua chave Pix real)
    // Para produção, o ideal é usar a API do Mercado Pago ou de outro gateway.
    const chavePix = "seu-email-ou-telefone@pix.com"; 
    const textoPix = `00020101021126580014br.gov.bcb.pix0114${chavePix}5204000053039865405${valor}.005802BR5913Dono do Bolao6009SAO PAULO62070503***6304`;

    try {
        const qrCodeImage = await qrcode.toDataURL(textoPix);
        
        // Salva temporariamente os dados na sessão antes de confirmar o pagamento
        req.session.dadosPalpite = { nome, telefone, palpite, valor, pago: false };

        res.send(`
            <h2>Quase lá, ${nome}! Faça o pagamento para validar seu palpite.</h2>
            <p>Valor selecionado: <strong>R$ ${valor},00</strong></p>
            <img src="${qrCodeImage}" alt="QR Code Pix"><br><br>
            <p><strong>Copia e Cola Pix:</strong></p>
            <textarea rows="3" cols="50" readonly>${textoPix}</textarea><br><br>
            
            <form action="/confirmar-pagamento" method="POST">
                <button type="submit">Já efetuei o pagamento</button>
            </form>
        `);
    } catch (err) {
        res.status(500).send('Erro ao gerar o Pix.');
    }
});

// Confirmação do Pagamento e Redirecionamento para o WhatsApp
app.post('/confirmar-pagamento', (req, res) => {
    if (!req.session.dadosPalpite) {
        return res.redirect('/');
    }

    const novoPalpite = req.session.dadosPalpite;
    novoPalpite.pago = true; // No mundo real, você usaria um Webhook do banco para checar isso automaticamente.
    novoPalpite.id = palpites.length + 1;
    
    palpites.push(novoPalpite);

    // Criando a mensagem para o WhatsApp
    const mensagemWhatsApp = `Olá ${novoPalpite.nome}! Seu palpite [${novoPalpite.palpite}] de R$ ${novoPalpite.valor},00 foi confirmado com sucesso no Bolão! Boa sorte! 🇧🇷`;
    const linkWhatsapp = `https://api.whatsapp.com/send?phone=55${novoPalpite.telefone}&text=${encodeURIComponent(mensagemWhatsApp)}`;

    // Limpa a sessão
    req.session.dadosPalpite = null;

    res.send(`
        <h2>Sucesso! Seu palpite foi registrado.</h2>
        <p>Clique no botão abaixo para receber a confirmação no seu WhatsApp:</p>
        <a href="${linkWhatsapp}" target="_blank" style="padding: 10px 20px; background-color: #25D366; color: white; text-decoration: none; border-radius: 5px;">Receber Confirmação no WhatsApp</a>
        <br><br>
        <a href="/">Voltar para a página inicial</a>
    `);
});

// --- TELA DE ADMINISTRADOR ---
// Defina uma senha simples para o Admin
const ADMIN_PASSWORD = "admin123"; 

app.get('/admin', (req, res) => {
    res.send(`
        <h2>Painel do Administrador - Login</h2>
        <form action="/admin/dashboard" method="POST">
            <input type="password" name="senha" placeholder="Senha do Admin" required>
            <button type="submit">Entrar</button>
        </form>
    `);
});

app.post('/admin/dashboard', (req, res) => {
    const { senha } = req.body;
    if (senha !== ADMIN_PASSWORD) {
        return res.send("Senha incorreta!");
    }

    let tabelaPalpites = palpites.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.nome}</td>
            <td>${p.telefone}</td>
            <td>${p.palpite}</td>
            <td>R$ ${p.valor},00</td>
            <td>${p.pago ? '✅ Pago' : '❌ Não Pago'}</td>
        </tr>
    `).join('');

    res.send(`
        <h2>Painel de Controle do Bolão</h2>
        <table border="1" cellpadding="10" style="border-collapse: collapse;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>WhatsApp</th>
                    <th>Palpite</th>
                    <th>Valor</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${tabelaPalpites.length > 0 ? tabelaPalpites : '<tr><td colspan="6">Nenhum palpite feito ainda.</td></tr>'}
            </tbody>
        </table>
        <br>
        <a href="/">Voltar ao site</a>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});