export function inscriptionParticipantEmail(fields: Record<string, unknown> | undefined): string | null {
  if (!fields || typeof fields !== 'object') return null;
  const email = String(fields.email_pessoal ?? fields.email ?? '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) return null;
  return email;
}

export function inscriptionParticipantDisplayName(fields: Record<string, unknown> | undefined): string {
  if (!fields || typeof fields !== 'object') return 'Participante';
  const keys = ['nome', 'nome_responsavel', 'cpf', 'cnpj', 'empresa', 'razao_social'];
  for (const k of keys) {
    const v = String(fields[k] ?? '').trim();
    if (v) return v;
  }
  return 'Participante';
}

function fieldString(fields: Record<string, unknown> | undefined, key: string): string {
  return String(fields?.[key] ?? '').trim();
}

/** Representante no certificado (prioriza nome / nome_responsavel). */
export function inscriptionCertificateRepresentativeName(
  fields: Record<string, unknown> | undefined,
): string {
  const nome = fieldString(fields, 'nome') || fieldString(fields, 'nome_responsavel');
  if (nome) return nome;
  return inscriptionParticipantDisplayName(fields);
}

/** Empresa no certificado (fantasia ou razão social), se distinta do representante. */
export function inscriptionCertificateCompanyName(
  fields: Record<string, unknown> | undefined,
): string | null {
  const participant =
    fieldString(fields, 'nome') || fieldString(fields, 'nome_responsavel');
  const empresa = fieldString(fields, 'empresa');
  const razao = fieldString(fields, 'razao_social');
  if (empresa && empresa !== participant) return empresa;
  if (razao && razao !== participant && razao !== empresa) return razao;
  return null;
}
