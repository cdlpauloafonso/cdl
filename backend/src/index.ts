import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import auth from './routes/auth.js';
import pages from './routes/pages.js';
import directors from './routes/directors.js';
import services from './routes/services.js';
import news from './routes/news.js';
import contact from './routes/contact.js';
import settings from './routes/settings.js';
import upload from './routes/upload.js';
import about from './routes/about.js';
import nossaCidade from './routes/nossa-cidade.js';


const app = express();
const PORT = Number(process.env.PORT) || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

app.use(cors({ origin: process.env.FRONTEND_URL ?? true, credentials: true }));
app.use(express.json());
// Rota raiz para status
app.get('/', (_req, res) => {
  res.send('API CDL Paulo Afonso está rodando!');
});

app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.use('/api/auth', auth);
app.use('/api/nossa-cidade', nossaCidade);
app.use('/api/pages', pages);
app.use('/api/directors', directors);
app.use('/api/services', services);
app.use('/api/news', news);
app.use('/api/contact', contact);
app.use('/api/settings', settings);
app.use('/api/upload', upload);
app.use('/api/about', about);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`API CDL Paulo Afonso rodando em http://localhost:${PORT}`);
});
