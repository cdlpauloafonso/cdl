'use client';

import { useEffect, useState } from 'react';
import { getSettings, setSettings as saveSettings } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const WHATSAPP_STORAGE_KEY = 'cdl_whatsapp_number';

type SiteSettings = Record<string, string>;

const SETTING_KEYS = [
  { key: 'phone', label: 'Telefone principal', placeholder: '(75) 3281-4942' },
  { key: 'phone2', label: 'Telefone secundário (opcional)', placeholder: '(75) 3281-6997' },
  { key: 'email', label: 'E-mail', placeholder: 'cdlpauloafonso@hotmail.com' },
  { key: 'address', label: 'Endereço', placeholder: 'R. Monsenhor Magalhães, 214 - Centro, Paulo Afonso - BA' },
  { key: 'whatsapp_number', label: 'WhatsApp (botão flutuante) — número com DDD, ex: 75999999999', placeholder: '75999999999' },
];

export default function AdminConfiguracoesPage() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((data) => {
        const stored = localStorage.getItem(WHATSAPP_STORAGE_KEY);
        if (stored && !data.whatsapp_number) {
          setSettings({ ...data, whatsapp_number: stored });
        } else {
          setSettings(data);
        }
      })
      .catch(() => {
        const stored = localStorage.getItem(WHATSAPP_STORAGE_KEY);
        setSettings(stored ? { whatsapp_number: stored } : {});
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const whatsapp = settings.whatsapp_number?.trim();
    if (whatsapp) {
      localStorage.setItem(WHATSAPP_STORAGE_KEY, whatsapp);
    } else {
      localStorage.removeItem(WHATSAPP_STORAGE_KEY);
    }
    try {
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert('Você precisa estar logado como administrador');
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          alert('Acesso não autorizado');
          return;
        }
      }
      await saveSettings(settings);
      alert('Salvo com sucesso!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Configurações do site</h1>
      <p className="mt-1 text-cdl-gray-text">
        Telefone, e-mail e endereço aparecem no rodapé. WhatsApp define o número do botão flutuante.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
        {SETTING_KEYS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-gray-700">
              {label}
            </label>
            <input
              id={key}
              type="text"
              value={settings[key] ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={placeholder}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        ))}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
