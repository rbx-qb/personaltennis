
const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');

// Configurações do Google API
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Definindo escopo para acessar o Google Agenda
const scopes = ['https://www.googleapis.com/auth/calendar'];

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Inicializa o app Express
const app = express();
app.use(bodyParser.json());

// Autenticação e geração do link para login com a conta Google
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  res.redirect(url);
});

// Callback para a autenticação do Google
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  res.send('Autenticação realizada com sucesso!');
});

// Função para buscar horários disponíveis nas quadras
app.get('/horarios', async (req, res) => {
  const calendarId = 'primary';  // Ou o ID do calendário de reservas das quadras
  const now = new Date();
  const end = new Date();
  end.setHours(now.getHours() + 24); // Consultar para as próximas 24 horas

  try {
    const events = await calendar.events.list({
      calendarId: calendarId,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json(events.data.items);
  } catch (error) {
    console.error('Erro ao buscar eventos', error);
    res.status(500).send('Erro ao buscar eventos.');
  }
});

// Função para criar um evento (agendar aula)
app.post('/agendar', async (req, res) => {
  const { quadra, professor, horario, duracao } = req.body;

  const evento = {
    summary: `Aula de Tênis - ${professor}`,
    location: `Quadra ${quadra}`,
    description: 'Aula de tênis agendada',
    start: {
      dateTime: horario,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: new Date(new Date(horario).getTime() + duracao * 60000),  // duracao em minutos
      timeZone: 'America/Sao_Paulo',
    },
    attendees: [],
  };

  try {
    await calendar.events.insert({
      calendarId: 'primary',
      resource: evento,
    });
    res.status(200).send('Aula agendada com sucesso!');
  } catch (error) {
    console.error('Erro ao agendar aula', error);
    res.status(500).send('Erro ao agendar aula.');
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
