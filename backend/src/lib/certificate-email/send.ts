import { Resend } from 'resend';
import { buildCertificatePdfBuffer } from './build-pdf.js';
import {
  certificateEmailDelayMs,
  certificateEmailMaxPerRequest,
} from './config.js';
import { getCertificateEmailEffectiveConfig } from './effective-config.js';
import { inscriptionCertificateRepresentativeName } from './participant.js';

export type SendCertificateEmailInput = {
  to: string;
  participantName: string;
  eventTitle: string;
  eventDate?: string;
  fields: Record<string, unknown>;
};

export type SendCertificateEmailResult =
  | { ok: true }
  | {
      ok: false;
      code: 'DISABLED' | 'PROVIDER_NOT_CONFIGURED' | 'SEND_FAILED';
      message: string;
    };

let cachedResendKey: string | null = null;
let resendClient: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendClient || cachedResendKey !== apiKey) {
    resendClient = new Resend(apiKey);
    cachedResendKey = apiKey;
  }
  return resendClient;
}

function safeFileNamePart(value: string): string {
  return value.replace(/[^\w\u00C0-\u024f\s-]+/gi, '').trim().replace(/\s+/g, '-').slice(0, 40);
}

function buildCertificateEmailHtml(participantName: string, eventTitle: string): string {
  const name = participantName.trim() || 'Participante';
  const event = eventTitle.trim() || 'Evento CDL';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px;">
  <p>Olá, <strong>${escapeHtml(name)}</strong>,</p>
  <p>Segue em anexo o seu <strong>certificado de participação</strong> no evento:</p>
  <p style="font-size: 18px; color: #1e3a5f;"><strong>${escapeHtml(event)}</strong></p>
  <p>Atenciosamente,<br><strong>CDL Paulo Afonso</strong><br>Câmara de Dirigentes Lojistas — Paulo Afonso/BA</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendEventCertificateEmail(
  input: SendCertificateEmailInput,
): Promise<SendCertificateEmailResult> {
  const cfg = await getCertificateEmailEffectiveConfig();

  if (!cfg.enabled) {
    return {
      ok: false,
      code: 'DISABLED',
      message:
        'Envio de certificados por e-mail está desativado. Ative em Admin → Configurações → APIs (Resend) ou CERTIFICATE_EMAIL_ENABLED=true.',
    };
  }

  if (!cfg.providerReady) {
    return {
      ok: false,
      code: 'PROVIDER_NOT_CONFIGURED',
      message:
        'Resend não configurado. Cadastre a API key em Admin → Configurações → APIs (Resend) ou defina RESEND_API_KEY no servidor.',
    };
  }

  const to = input.to.trim();
  if (!to || !to.includes('@')) {
    return { ok: false, code: 'SEND_FAILED', message: 'E-mail do destinatário inválido.' };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildCertificatePdfBuffer({
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      fields: input.fields,
    });
  } catch {
    return {
      ok: false,
      code: 'SEND_FAILED',
      message: 'Não foi possível gerar o PDF do certificado.',
    };
  }

  const representativeName =
    inscriptionCertificateRepresentativeName(input.fields) || input.participantName;
  const fileName = `certificado-${safeFileNamePart(input.eventTitle)}-${safeFileNamePart(representativeName)}.pdf`;
  const from = cfg.fromAddress;
  const subject = `Certificado de participação — ${input.eventTitle.trim() || 'Evento CDL'}`;

  const resend = getResendClient(cfg.apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: buildCertificateEmailHtml(representativeName, input.eventTitle),
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error('[certificate-email] Resend error:', error.name, error.message);
    return {
      ok: false,
      code: 'SEND_FAILED',
      message: error.message || 'Falha ao enviar e-mail via Resend.',
    };
  }

  return { ok: true };
}

export { certificateEmailDelayMs, certificateEmailMaxPerRequest };
