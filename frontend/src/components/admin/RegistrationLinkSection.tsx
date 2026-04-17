'use client';

import { useEffect, useState } from 'react';
import {
  ASSOCIADO_INSCRIPTION_FIELDS,
  EXTRA_INSCRIPTION_FIELDS,
  PADRAO_INSCRIPTION_FIELDS,
  labelForInscriptionField,
} from '@/lib/event-registration-fields';
import { EventPaymentSection, type EventPaymentSectionProps } from '@/components/admin/EventPaymentSection';

export type RegistrationLinkMode = 'external' | 'form';

export type RegistrationLinkSectionProps = {
  wantsLink: boolean;
  onWantsLinkChange: (value: boolean) => void;
  mode: RegistrationLinkMode;
  onModeChange: (mode: RegistrationLinkMode) => void;
  externalUrl: string;
  onExternalUrlChange: (value: string) => void;
  fieldKeys: string[];
  onFieldKeysChange: (keys: string[]) => void;
  observationText: string;
  onObservationTextChange: (value: string) => void;
  /** Quando definido (ex.: novo evento com inscrição no site), o PIX fica dentro do modal «Configurar inscrição». */
  pixPayment?: EventPaymentSectionProps;
  /** Controla se o evento é exclusivo para associados */
  associadosOnly: boolean;
  onAssociadosOnlyChange: (value: boolean) => void;
  /** Máximo de inscrições pelo site (só formulário); null = sem limite */
  inscriptionLimit: number | null;
  onInscriptionLimitChange: (value: number | null) => void;
};

export function RegistrationLinkSection({
  wantsLink,
  onWantsLinkChange,
  mode,
  onModeChange,
  externalUrl,
  onExternalUrlChange,
  fieldKeys,
  onFieldKeysChange,
  observationText,
  onObservationTextChange,
  pixPayment,
  associadosOnly,
  onAssociadosOnlyChange,
  inscriptionLimit,
  onInscriptionLimitChange,
}: RegistrationLinkSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<RegistrationLinkMode>('form');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftKeys, setDraftKeys] = useState<string[]>([]);
  const [draftObservationText, setDraftObservationText] = useState('');
  const [draftInscriptionLimit, setDraftInscriptionLimit] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOpen]);

  function openModal() {
    setDraftMode(mode);
    setDraftUrl(externalUrl);
    setDraftKeys([...fieldKeys]);
    setDraftObservationText(observationText);
    setDraftInscriptionLimit(
      inscriptionLimit != null && inscriptionLimit > 0 ? String(inscriptionLimit) : ''
    );
    setModalError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function toggleDraftKey(id: string) {
    setDraftKeys((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function saveModal() {
    setModalError('');
    if (draftMode === 'external') {
      const u = draftUrl.trim();
      if (!u) {
        setModalError('Informe a URL do link externo.');
        return;
      }
      onModeChange('external');
      onExternalUrlChange(u);
      onFieldKeysChange([]);
      onObservationTextChange('');
      onInscriptionLimitChange(null);
    } else {
      if (draftKeys.length === 0) {
        setModalError('Selecione pelo menos um campo (cadastro padrão, associado ou complementar).');
        return;
      }
      if (draftKeys.includes('observacoes') && !draftObservationText.trim()) {
        setModalError('Preencha o texto de observações ou desmarque a opção.');
        return;
      }
      const rawLimit = draftInscriptionLimit.trim();
      let parsedLimit: number | null = null;
      if (rawLimit !== '') {
        const n = parseInt(rawLimit, 10);
        if (!Number.isFinite(n) || n < 1) {
          setModalError('Limite de inscrições deve ser um número inteiro maior ou igual a 1, ou deixe em branco para sem limite.');
          return;
        }
        parsedLimit = n;
      }
      onModeChange('form');
      onFieldKeysChange(draftKeys);
      onObservationTextChange(draftKeys.includes('observacoes') ? draftObservationText.trim() : '');
      onExternalUrlChange('');
      onInscriptionLimitChange(parsedLimit);
    }
    setModalOpen(false);
  }

  const summaryConfigured =
    wantsLink &&
    ((mode === 'external' && externalUrl.trim()) || (mode === 'form' && fieldKeys.length > 0));

  const pixSummaryOk =
    Boolean(pixPayment) &&
    pixPayment!.enabled &&
    Boolean(pixPayment!.pixImageUrl.trim() || pixPayment!.pixCopyPaste.trim());

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-sm font-medium text-gray-900 mb-3">Inscrição no site</p>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="registration-link-choice"
            className="mt-1"
            checked={!wantsLink}
            onChange={() => {
              onWantsLinkChange(false);
              onExternalUrlChange('');
              onFieldKeysChange([]);
              onObservationTextChange('');
            }}
          />
          <span className="text-sm text-gray-700">Não criar inscrição</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="registration-link-choice"
            className="mt-1"
            checked={wantsLink}
            onChange={() => onWantsLinkChange(true)}
          />
          <span className="text-sm text-gray-700">Criar inscrição (link externo ou formulário)</span>
        </label>

        {wantsLink && (
          <div className="ml-7 space-y-2 border-l-2 border-cdl-blue/30 pl-4">
            {summaryConfigured ? (
              <div className="space-y-2">
                {mode === 'external' ? (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">Link externo:</span>{' '}
                    <span className="break-all text-cdl-gray-text">{externalUrl}</span>
                  </p>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Formulário no site</p>
                    <p className="text-sm text-cdl-gray-text mt-1">
                      {fieldKeys.length} campo(s): {fieldKeys.map((id) => labelForInscriptionField(id)).join(', ')}
                    </p>
                    {fieldKeys.includes('observacoes') && observationText.trim() && (
                      <p className="text-xs text-cdl-gray-text mt-1">Observações padrão: {observationText.trim()}</p>
                    )}
                    {associadosOnly && (
                      <p className="text-xs text-orange-600 mt-1">
                        <span className="font-medium">Apenas associados:</span> Restrito a membros da CDL
                      </p>
                    )}
                    <p className="text-xs text-cdl-gray-text mt-1">
                      {inscriptionLimit != null && inscriptionLimit > 0 ? (
                        <>
                          <span className="font-medium text-gray-800">Limite:</span> {inscriptionLimit}{' '}
                          {inscriptionLimit === 1 ? 'inscrição' : 'inscrições'} pelo site
                        </>
                      ) : (
                        <>Sem limite de inscrições pelo site</>
                      )}
                    </p>
                  </div>
                )}
                {pixPayment && pixSummaryOk && (
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium text-gray-900">Pagamento PIX:</span> instruções incluídas
                  </p>
                )}
                <button type="button" onClick={openModal} className="text-sm font-medium text-cdl-blue hover:underline">
                  Alterar configuração
                </button>
              </div>
            ) : (
              <button type="button" onClick={openModal} className="btn-secondary text-sm">
                Configurar inscrição
              </button>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-modal-title"
        >
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={closeModal} />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 id="registration-modal-title" className="text-lg font-semibold text-gray-900 mb-1">
              Configurar inscrição
            </h2>
            <p className="text-sm text-cdl-gray-text mb-4">
              Escolha um link externo ou marque os campos desejados em <strong>cadastro padrão</strong> (CPF, nome do
              representante, etc.) e/ou em <strong>dados de associado</strong> (empresa, CNPJ, etc.). Ao salvar, a página
              pública do evento exibirá o formulário com essa combinação. <strong>Todos os itens marcados serão
              obrigatórios</strong> para o participante preencher.
            </p>

            <div className="space-y-3 mb-4">
              <span className="block text-sm font-medium text-gray-800">Tipo</span>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="reg-mode"
                  className="mt-1"
                  checked={draftMode === 'form'}
                  onChange={() => setDraftMode('form')}
                />
                <span className="text-sm text-gray-700">Formulário no site (escolher campos)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="reg-mode"
                  className="mt-1"
                  checked={draftMode === 'external'}
                  onChange={() => setDraftMode('external')}
                />
                <span className="text-sm text-gray-700">Link externo (Sympla, Google Forms, etc.)</span>
              </label>
            </div>

            <div className="space-y-3 mb-4">
              <span className="block text-sm font-medium text-gray-800">Obrigatoriedade</span>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="associados-mode"
                  className="mt-1"
                  checked={!associadosOnly}
                  onChange={() => onAssociadosOnlyChange(false)}
                />
                <span className="text-sm text-gray-700">Aberto para todos (associados e não associados)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="associados-mode"
                  className="mt-1"
                  checked={associadosOnly}
                  onChange={() => onAssociadosOnlyChange(true)}
                />
                <span className="text-sm text-gray-700">Exclusivo para associados</span>
              </label>
              <p className="text-xs text-cdl-gray-text mt-2">
                {associadosOnly 
                  ? 'Apenas associados CDL poderão se inscrever neste evento.'
                  : 'Qualquer pessoa poderá se inscrever neste evento.'
                }
              </p>
            </div>

            {draftMode === 'external' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <span className="block text-sm font-medium text-gray-800 mb-2">Cadastro padrão (pessoa física)</span>
                  <p className="text-xs text-cdl-gray-text mb-2">CPF, nome do representante e demais dados pessoais.</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {PADRAO_INSCRIPTION_FIELDS.map((f) => (
                      <label key={f.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draftKeys.includes(f.id)}
                          onChange={() => toggleDraftKey(f.id)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-800 mb-2">Dados de associado (empresa)</span>
                  <p className="text-xs text-cdl-gray-text mb-2">Mesmos campos disponíveis no cadastro de associados da CDL.</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {ASSOCIADO_INSCRIPTION_FIELDS.map((f) => (
                      <label key={f.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draftKeys.includes(f.id)}
                          onChange={() => toggleDraftKey(f.id)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-800 mb-2">Complementar</span>
                  <p className="text-xs text-cdl-gray-text mb-2">
                    Ao marcar «Observações», informe o texto de apoio ao participante; na inscrição, o campo de
                    observações também será obrigatório.
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {EXTRA_INSCRIPTION_FIELDS.map((f) => (
                      <label key={f.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draftKeys.includes(f.id)}
                          onChange={() => toggleDraftKey(f.id)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  {draftKeys.includes('observacoes') && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observação exibida ao participante
                      </label>
                      <textarea
                        value={draftObservationText}
                        onChange={(e) => setDraftObservationText(e.target.value)}
                        rows={3}
                        placeholder="Ex.: Após preencher os dados, siga para o pagamento via PIX."
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-cdl-gray-text">
                        Esse texto aparece na página de inscrição apenas como aviso.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Limite de inscrições (formulário no site)
                  </label>
                  <p className="text-xs text-cdl-gray-text mb-2">
                    Opcional. Quando o número de inscrições pelo site atingir esse limite, será exibida a mensagem de
                    inscrições encerradas. Deixe em branco para não limitar.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={draftInscriptionLimit}
                    onChange={(e) => setDraftInscriptionLimit(e.target.value.replace(/\D/g, ''))}
                    placeholder="Sem limite"
                    className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
            )}

            {pixPayment && wantsLink && (
              <div className="mt-6 border-t border-gray-200 pt-5">
                <EventPaymentSection {...pixPayment} />
              </div>
            )}

            {modalError && <p className="mt-3 text-sm text-red-600">{modalError}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeModal} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={saveModal} className="btn-primary">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
