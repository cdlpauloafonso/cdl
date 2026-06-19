import { getCampaignDoc, getInscriptionDoc, updateInscriptionCertificateEmail } from '../inscription-firestore.js';
import type { CampaignDoc } from '../inscription-firestore.js';
import { certificateEmailDelayMs } from './config.js';
import { inscriptionParticipantDisplayName, inscriptionParticipantEmail } from './participant.js';
import { sendEventCertificateEmail } from './send.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CertificateEmailItemResult = {
  inscriptionId: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  sentAt?: string;
};

export type CertificateEmailBatchResult = {
  results: CertificateEmailItemResult[];
  summary: { total: number; sent: number; failed: number; skipped: number };
};

export async function processCertificateEmailBatch(
  campaignId: string,
  inscriptionIds: string[],
  options?: { allowResend?: boolean },
): Promise<CertificateEmailBatchResult> {
  const campaign = await getCampaignDoc(campaignId);
  if (!campaign) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const eventTitle = String(campaign.title ?? 'Evento').trim() || 'Evento';
  const eventDate = String(campaign.date ?? '').trim() || undefined;
  const delayMs = certificateEmailDelayMs();
  const results: CertificateEmailItemResult[] = [];

  for (let i = 0; i < inscriptionIds.length; i++) {
    const inscriptionId = inscriptionIds[i]?.trim();
    if (!inscriptionId) continue;

    if (i > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    const row = await processOne(
      campaignId,
      inscriptionId,
      eventTitle,
      eventDate,
      campaign.certificateEmailConfig,
      options?.allowResend,
    );
    results.push(row);
  }

  const sent = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.length - sent - skipped;

  return {
    results,
    summary: { total: results.length, sent, failed, skipped },
  };
}

async function processOne(
  campaignId: string,
  inscriptionId: string,
  eventTitle: string,
  eventDate: string | undefined,
  emailTemplate: CampaignDoc['certificateEmailConfig'],
  allowResend?: boolean,
): Promise<CertificateEmailItemResult> {
  const doc = await getInscriptionDoc(campaignId, inscriptionId);
  if (!doc) {
    return { inscriptionId, ok: false, error: 'Inscrição não encontrada.' };
  }

  if (doc.certificateEmailSentAt && !allowResend) {
    return {
      inscriptionId,
      ok: false,
      skipped: true,
      reason: 'Já enviado anteriormente.',
      sentAt: String(doc.certificateEmailSentAt),
    };
  }

  const fields = (doc.fields ?? {}) as Record<string, unknown>;
  const to = inscriptionParticipantEmail(fields);
  if (!to) {
    return { inscriptionId, ok: false, error: 'Participante sem e-mail na inscrição.' };
  }

  const participantName = inscriptionParticipantDisplayName(fields);
  const sendResult = await sendEventCertificateEmail({
    to,
    participantName,
    eventTitle,
    eventDate,
    fields,
    emailTemplate,
  });

  if (!sendResult.ok) {
    await updateInscriptionCertificateEmail(campaignId, inscriptionId, {
      certificateEmailLastError: sendResult.message,
    }).catch(() => undefined);

    return {
      inscriptionId,
      ok: false,
      error: sendResult.message,
    };
  }

  const sentAt = new Date().toISOString();
  await updateInscriptionCertificateEmail(campaignId, inscriptionId, {
    certificateEmailSentAt: sentAt,
    certificateEmailLastError: null,
  });

  return { inscriptionId, ok: true, sentAt };
}
