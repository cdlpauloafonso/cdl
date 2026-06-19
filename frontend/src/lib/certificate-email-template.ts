/** Placeholders disponíveis na mensagem do e-mail de certificado. */
export const CERTIFICATE_EMAIL_PLACEHOLDERS = ['{{nome}}', '{{evento}}'] as const;

export const DEFAULT_CERTIFICATE_EMAIL_MESSAGE = `Segue em anexo o seu certificado de participação no evento:

{{evento}}`;

export type CertificateEmailTemplate = {
  message: string;
  messageStored: string | null;
  linkUrl: string;
  linkLabel: string;
  defaultMessage: string;
  isCustomMessage: boolean;
};

export type CertificateEmailTemplateUpdate = {
  message?: string;
  linkUrl?: string;
  linkLabel?: string;
};

export function applyCertificateEmailPlaceholders(
  text: string,
  vars: { participantName: string; eventTitle: string },
): string {
  const name = vars.participantName.trim() || 'Participante';
  const event = vars.eventTitle.trim() || 'Evento CDL';
  return text
    .replace(/\{\{\s*nome\s*\}\}/gi, name)
    .replace(/\{\{\s*evento\s*\}\}/gi, event);
}

export function previewCertificateEmailPlainText(
  template: Pick<CertificateEmailTemplate, 'message' | 'linkUrl' | 'linkLabel'>,
  vars: { participantName: string; eventTitle: string },
): string {
  const name = vars.participantName.trim() || 'Participante';
  const body = applyCertificateEmailPlaceholders(template.message, vars);
  const lines = [`Olá, ${name},`, '', body];
  const url = template.linkUrl.trim();
  const label = template.linkLabel.trim() || url;
  if (url) {
    lines.push('', `${label}: ${url}`);
  }
  lines.push('', 'Atenciosamente,', 'CDL Paulo Afonso', 'Câmara de Dirigentes Lojistas — Paulo Afonso/BA');
  return lines.join('\n');
}
