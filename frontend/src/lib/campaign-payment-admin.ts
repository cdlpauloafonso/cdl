import type { CampaignPaymentConfig, CampaignPaymentProvider } from './firestore';

/** Máscara BRL enquanto digita (centavos → R$ 0,00). */
export function formatBrlCurrencyInput(raw: string): string {
  const numeros = raw.replace(/\D/g, '');
  if (numeros === '') return '';
  const centavos = parseInt(numeros, 10);
  if (!Number.isFinite(centavos)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
}

/** Exibe valor numérico salvo no Firestore com máscara BRL. */
export function formatBrlCurrencyFromNumber(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

/** Converte "R$ 50,00", "50,00" ou "50.5" para número em reais. */
export function parsePaymentAmountInput(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function buildCampaignPaymentConfigFromAdmin(input: {
  enabled: boolean;
  provider: CampaignPaymentProvider;
  amount: string;
  amountAssociado: string;
  description: string;
  pixImageUrl: string;
  pixCopyPaste: string;
  pixObservationText: string;
}): CampaignPaymentConfig | null {
  if (!input.enabled) return null;

  if (input.provider === 'asaas') {
    const amount = parsePaymentAmountInput(input.amount);
    if (amount == null) return null;
    const amountAssociado = parsePaymentAmountInput(input.amountAssociado);
    return {
      provider: 'asaas',
      amount,
      ...(amountAssociado != null ? { amountAssociado } : {}),
      ...(input.description.trim() ? { description: input.description.trim() } : {}),
    };
  }

  const hasImg = Boolean(input.pixImageUrl.trim());
  const hasCode = Boolean(input.pixCopyPaste.trim());
  if (!hasImg && !hasCode) return null;

  return {
    provider: 'manual_pix',
    ...(input.pixImageUrl.trim() ? { pixImageUrl: input.pixImageUrl.trim() } : {}),
    ...(input.pixCopyPaste.trim() ? { pixCopyPaste: input.pixCopyPaste.trim() } : {}),
    ...(input.pixObservationText.trim() ? { pixObservationText: input.pixObservationText.trim() } : {}),
  };
}

export function isPixPaymentSummaryOk(props: {
  enabled: boolean;
  provider: CampaignPaymentProvider;
  amount: string;
  amountAssociado: string;
  pixImageUrl: string;
  pixCopyPaste: string;
}): boolean {
  if (!props.enabled) return false;
  if (props.provider === 'asaas') {
    if (parsePaymentAmountInput(props.amount) == null) return false;
    const assoc = props.amountAssociado.trim();
    if (assoc && parsePaymentAmountInput(assoc) == null) return false;
    return true;
  }
  return Boolean(props.pixImageUrl.trim() || props.pixCopyPaste.trim());
}

export function loadPaymentAdminStateFromConfig(cfg?: CampaignPaymentConfig | null): {
  enabled: boolean;
  provider: CampaignPaymentProvider;
  amount: string;
  amountAssociado: string;
  description: string;
  pixImageUrl: string;
  pixCopyPaste: string;
  pixObservationText: string;
} {
  if (!cfg) {
    return {
      enabled: false,
      provider: 'asaas',
      amount: '',
      amountAssociado: '',
      description: '',
      pixImageUrl: '',
      pixCopyPaste: '',
      pixObservationText: '',
    };
  }
  const provider =
    cfg.provider === 'asaas' || (typeof cfg.amount === 'number' && cfg.amount > 0)
      ? 'asaas'
      : 'manual_pix';
  const enabled =
    provider === 'asaas'
      ? typeof cfg.amount === 'number' && cfg.amount > 0
      : Boolean(cfg.pixImageUrl?.trim() || cfg.pixCopyPaste?.trim());

  return {
    enabled,
    provider,
    amount:
      typeof cfg.amount === 'number' && cfg.amount > 0 ? formatBrlCurrencyFromNumber(cfg.amount) : '',
    amountAssociado:
      typeof cfg.amountAssociado === 'number' && cfg.amountAssociado > 0
        ? formatBrlCurrencyFromNumber(cfg.amountAssociado)
        : '',
    description: cfg.description ?? '',
    pixImageUrl: cfg.pixImageUrl ?? '',
    pixCopyPaste: cfg.pixCopyPaste ?? '',
    pixObservationText: cfg.pixObservationText ?? '',
  };
}
