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
