import {
  certificateEmailFromAddress,
  isCertificateEmailEnabled,
  isCertificateSmtpConfigured,
} from './config.js';

export type SendCertificateEmailInput = {
  to: string;
  participantName: string;
  eventTitle: string;
  /** PDF em anexo — preenchido quando a geração no servidor estiver ativa. */
  pdfBuffer?: Buffer;
  fileName?: string;
};

export type SendCertificateEmailResult =
  | { ok: true }
  | { ok: false; code: 'DISABLED' | 'SMTP_NOT_CONFIGURED' | 'NOT_IMPLEMENTED' | 'SEND_FAILED'; message: string };

/**
 * Envio real via Gmail SMTP — ativar com CERTIFICATE_EMAIL_ENABLED=true e credenciais SMTP.
 * Implementação do Nodemailer + anexo PDF será ligada em seguida; por ora retorna NOT_IMPLEMENTED.
 */
export async function sendEventCertificateEmail(
  input: SendCertificateEmailInput
): Promise<SendCertificateEmailResult> {
  if (!isCertificateEmailEnabled()) {
    return {
      ok: false,
      code: 'DISABLED',
      message:
        'Envio de certificados por e-mail está desativado. Defina CERTIFICATE_EMAIL_ENABLED=true no servidor após configurar o SMTP.',
    };
  }

  if (!isCertificateSmtpConfigured()) {
    return {
      ok: false,
      code: 'SMTP_NOT_CONFIGURED',
      message: 'SMTP não configurado. Defina SMTP_USER, SMTP_PASS e SMTP_HOST (ex.: smtp.gmail.com) no servidor.',
    };
  }

  const to = input.to.trim();
  if (!to || !to.includes('@')) {
    return { ok: false, code: 'SEND_FAILED', message: 'E-mail do destinatário inválido.' };
  }

  // Placeholder: Gmail + anexo PDF (jspdf no servidor) na próxima etapa.
  console.info('[certificate-email] Pronto para enviar (SMTP configurado, envio ainda não ligado):', {
    from: certificateEmailFromAddress(),
    to,
    eventTitle: input.eventTitle,
    participantName: input.participantName,
    hasPdf: Boolean(input.pdfBuffer?.length),
  });

  return {
    ok: false,
    code: 'NOT_IMPLEMENTED',
    message:
      'SMTP preparado, mas o disparo de e-mail ainda não foi ativado nesta versão. Aguarde a próxima atualização ou contate o suporte técnico.',
  };
}
