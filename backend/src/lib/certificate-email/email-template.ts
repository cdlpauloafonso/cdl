export type CampaignCertificateEmailConfig = {
  message?: string;
  linkUrl?: string;
  linkLabel?: string;
};

export type CertificateEmailTemplateVars = {
  participantName: string;
  eventTitle: string;
};

export const DEFAULT_CERTIFICATE_EMAIL_MESSAGE = `Segue em anexo o seu certificado de participação no evento:

{{evento}}`;

export function effectiveCertificateEmailMessage(
  stored: CampaignCertificateEmailConfig | null | undefined,
): string {
  const custom = stored?.message?.trim();
  return custom || DEFAULT_CERTIFICATE_EMAIL_MESSAGE;
}

export function applyCertificateEmailPlaceholders(
  text: string,
  vars: CertificateEmailTemplateVars,
): string {
  const name = vars.participantName.trim() || 'Participante';
  const event = vars.eventTitle.trim() || 'Evento CDL';
  return text
    .replace(/\{\{\s*nome\s*\}\}/gi, name)
    .replace(/\{\{\s*evento\s*\}\}/gi, event);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function buildCertificateEmailHtml(
  vars: CertificateEmailTemplateVars,
  config: CampaignCertificateEmailConfig | null | undefined,
): string {
  const name = vars.participantName.trim() || 'Participante';
  const messageRaw = effectiveCertificateEmailMessage(config);
  const messageResolved = applyCertificateEmailPlaceholders(messageRaw, vars);

  const paragraphs = messageResolved
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const withBreaks = escapeHtml(p).replace(/\n/g, '<br>');
      return `<p style="margin: 0 0 1em;">${withBreaks}</p>`;
    })
    .join('\n');

  const linkUrl = config?.linkUrl?.trim() ?? '';
  const linkLabel = config?.linkLabel?.trim() || linkUrl;
  const linkBlock =
    linkUrl && isSafeHttpUrl(linkUrl)
      ? `<p style="margin: 0 0 1em;"><a href="${escapeHtml(linkUrl)}" style="color: #1e3a5f; font-weight: 600;">${escapeHtml(linkLabel)}</a></p>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px;">
  <p style="margin: 0 0 1em;">Olá, <strong>${escapeHtml(name)}</strong>,</p>
  ${paragraphs}
  ${linkBlock}
  <p style="margin: 1.5em 0 0;">Atenciosamente,<br><strong>CDL Paulo Afonso</strong><br>Câmara de Dirigentes Lojistas — Paulo Afonso/BA</p>
</body>
</html>`;
}

export function normalizeCertificateEmailConfigPatch(
  body: unknown,
): CampaignCertificateEmailConfig | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const out: CampaignCertificateEmailConfig = {};

  if (typeof raw.message === 'string') out.message = raw.message;
  if (typeof raw.linkUrl === 'string') out.linkUrl = raw.linkUrl.trim();
  if (typeof raw.linkLabel === 'string') out.linkLabel = raw.linkLabel.trim();

  if (raw.linkUrl === null || raw.linkUrl === '') out.linkUrl = '';
  if (raw.linkLabel === null || raw.linkLabel === '') out.linkLabel = '';

  return out;
}
