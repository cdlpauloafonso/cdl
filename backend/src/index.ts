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
import asaas from './routes/asaas.js';
import publicInscriptions from './routes/public-inscriptions.js';
import credentialing from './routes/credentialing.js';
import certificates from './routes/certificates.js';
import resendIntegration from './routes/resend-integration.js';
import adminCampaigns from './routes/admin-campaigns.js';
import { getCertificateEmailEffectiveConfig } from './lib/certificate-email/effective-config.js';


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
app.use('/api/asaas', asaas);
app.use('/api/resend', resendIntegration);
app.use('/api/public', publicInscriptions);
app.use('/api', credentialing);
app.use('/api/admin/campaigns', adminCampaigns);
// Montado em /api/events para não interceptar /api/asaas/* com authMiddleware global
app.use('/api/events', certificates);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, async () => {
  console.log(`API CDL Paulo Afonso rodando em http://localhost:${PORT}`);
  try {
    const certEmail = await getCertificateEmailEffectiveConfig();
    const status = certEmail.providerReady
      ? certEmail.enabled
        ? 'ativo'
        : 'desativado (CERTIFICATE_EMAIL_ENABLED=false)'
      : 'sem API key';
    console.log(
      `[certificate-email] Resend: ${status} · ambiente=${certEmail.environment} · origem=${certEmail.source} · from=${certEmail.fromAddress}`,
    );
  } catch {
    console.warn('[certificate-email] Não foi possível verificar configuração Resend.');
  }
});
