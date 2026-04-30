'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAssociados, type Aniversariante, type Associado } from '@/lib/firestore';

type BirthdayRow = {
  associado: Associado;
  aniversariante: Aniversariante;
  aniversarianteNome: string;
  data: string;
};

function extractMonthDay(dateValue: string): { month: number; day: number } {
  if (!dateValue) return { month: 99, day: 99 };
  const normalized = dateValue.trim();
  const matchIso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    return { month: Number(matchIso[2]), day: Number(matchIso[3]) };
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return { month: 99, day: 99 };
  return { month: parsed.getMonth() + 1, day: parsed.getDate() };
}

function formatBirthday(dateValue: string): string {
  if (!dateValue) return '—';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('pt-BR');
}

function formatPersonName(name: string): string {
  if (!name?.trim()) return '—';
  return name
    .trim()
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1))
    .join(' ');
}

function buildBirthdayMessage(displayName: string): string {
  return `A CDL Paulo Afonso deseja muita saúde, felicidade e sucesso. Que este novo ciclo seja repleto de conquistas e bons momentos.`;
}

function buildPublicationDescription(displayName: string, companyName: string): string {
  const safeCompany = companyName?.trim() || 'sua empresa';
  return `🎉 🎁Parabéns a ${displayName} da ${safeCompany} por mais um ano de vida!
🎁🎉

Sua trajetória de dedicação e sucesso é motivo de orgulho para todos nós. O compromisso com o desenvolvimento econômico local e a inovação constante fazem de você uma referência em nossa comunidade. Que os próximos anos tragam ainda mais conquistas, fortalecendo o comércio de Paulo Afonso e inspirando muitos outros. Muito sucesso sempre!

#CDLPauloAfonso  
#Parceria #FortalecendoONegócioLocal`;
}

function labelStatus(status?: string): string {
  if (status === 'desativado') return 'Desativado';
  if (status === 'em_negociacao') return 'Em negociação';
  return 'Ativo';
}

export default function AniversariosPage() {
  const BACKGROUND_THEMES_STORAGE_KEY = 'birthday_card_background_themes_v1';
  const LOGO_THEMES_STORAGE_KEY = 'birthday_card_logo_themes_v1';
  const LAST_BACKGROUND_STORAGE_KEY = 'birthday_card_last_background_v1';
  const LAST_LOGO_STORAGE_KEY = 'birthday_card_last_logo_v1';
  const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssociado, setSelectedAssociado] = useState<Associado | null>(null);
  const [selectedBirthdayCard, setSelectedBirthdayCard] = useState<BirthdayRow | null>(null);
  const [birthdayCardBgUrl, setBirthdayCardBgUrl] = useState('');
  const [birthdayCardLogoUrl, setBirthdayCardLogoUrl] = useState('');
  const [birthdayCardProfilePhotoUrl, setBirthdayCardProfilePhotoUrl] = useState('');
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [bgUploadError, setBgUploadError] = useState('');
  const [logoUploadError, setLogoUploadError] = useState('');
  const [profilePhotoUploadError, setProfilePhotoUploadError] = useState('');
  const [cardNameOverride, setCardNameOverride] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [cardNameColor, setCardNameColor] = useState('#111827');
  const [cardNameSize, setCardNameSize] = useState(30);
  const [cardNameFont, setCardNameFont] = useState('Inter, sans-serif');
  const [cardMessageColor, setCardMessageColor] = useState('#1f2937');
  const [cardMessageSize, setCardMessageSize] = useState(14);
  const [cardMessageFont, setCardMessageFont] = useState('Inter, sans-serif');
  const [cardOverlayOpacity, setCardOverlayOpacity] = useState(30);
  const [cardPublicationDescription, setCardPublicationDescription] = useState('');
  const [sharingCard, setSharingCard] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState<null | 'png' | 'jpg'>(null);
  const [pendingShare, setPendingShare] = useState(false);
  const [copyingPublicationText, setCopyingPublicationText] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 90 });
  const [logoSize, setLogoSize] = useState(56);
  const [photoPosition, setPhotoPosition] = useState({ x: 50, y: 28 });
  const [photoSize, setPhotoSize] = useState(146);
  const [namePosition, setNamePosition] = useState({ x: 50, y: 47.04 });
  const [messagePosition, setMessagePosition] = useState({ x: 50, y: 66.5 });
  const [draggingElement, setDraggingElement] = useState<null | 'logo' | 'photo' | 'name' | 'message'>(null);
  const [selectedElement, setSelectedElement] = useState<null | 'logo' | 'photo' | 'name' | 'message'>(null);
  const [resizingElement, setResizingElement] = useState<{
    target: 'logo' | 'photo' | 'name' | 'message';
    startY: number;
    startSize: number;
  } | null>(null);
  const [backgroundThemes, setBackgroundThemes] = useState<string[]>([]);
  const [logoThemes, setLogoThemes] = useState<string[]>([]);

  function saveBackgroundThemes(nextThemes: string[]) {
    setBackgroundThemes(nextThemes);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(BACKGROUND_THEMES_STORAGE_KEY, JSON.stringify(nextThemes));
      }
    } catch {
      /* ignore */
    }
  }

  function saveLogoThemes(nextThemes: string[]) {
    setLogoThemes(nextThemes);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOGO_THEMES_STORAGE_KEY, JSON.stringify(nextThemes));
      }
    } catch {
      /* ignore */
    }
  }

  function saveLastBackground(url: string) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_BACKGROUND_STORAGE_KEY, url || '');
      }
    } catch {
      /* ignore */
    }
  }

  function saveLastLogo(url: string) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_LOGO_STORAGE_KEY, url || '');
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getAssociados();
        setAssociados(list);
      } catch (error) {
        console.error('Erro ao carregar aniversariantes:', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(LOGO_THEMES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const urls = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      setLogoThemes(Array.from(new Set(urls)));
    } catch {
      /* ignore storage parse issues */
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const lastBg = localStorage.getItem(LAST_BACKGROUND_STORAGE_KEY) || '';
      const lastLogo = localStorage.getItem(LAST_LOGO_STORAGE_KEY) || '';
      if (lastBg) setBirthdayCardBgUrl(lastBg);
      if (lastLogo) setBirthdayCardLogoUrl(lastLogo);
    } catch {
      /* ignore storage read issues */
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(BACKGROUND_THEMES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const urls = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      setBackgroundThemes(Array.from(new Set(urls)));
    } catch {
      /* ignore storage parse issues */
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!selectedBirthdayCard) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [selectedBirthdayCard]);

  async function handleUploadBirthdayCardBackground(file: File) {
    if (!IMGBB_KEY) {
      setBgUploadError('Chave ImgBB não configurada (NEXT_PUBLIC_IMGBB_KEY).');
      return;
    }
    setBgUploadError('');
    setUploadingBg(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      const url = data?.data?.url as string | undefined;
      if (!res.ok || !url) {
        throw new Error('Falha no upload da imagem.');
      }
      setBirthdayCardBgUrl(url);
      saveLastBackground(url);
      saveBackgroundThemes(Array.from(new Set([url, ...backgroundThemes])).slice(0, 20));
    } catch (err) {
      console.error(err);
      setBgUploadError('Não foi possível enviar a imagem para o ImgBB.');
    } finally {
      setUploadingBg(false);
    }
  }

  async function handleUploadBirthdayCardLogo(file: File) {
    if (!IMGBB_KEY) {
      setLogoUploadError('Chave ImgBB não configurada (NEXT_PUBLIC_IMGBB_KEY).');
      return;
    }
    setLogoUploadError('');
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      const url = data?.data?.url as string | undefined;
      if (!res.ok || !url) {
        throw new Error('Falha no upload da logo.');
      }
      setBirthdayCardLogoUrl(url);
      saveLastLogo(url);
      setLogoPosition({ x: 50, y: 90 });
      saveLogoThemes(Array.from(new Set([url, ...logoThemes])).slice(0, 20));
    } catch (err) {
      console.error(err);
      setLogoUploadError('Não foi possível enviar a logo para o ImgBB.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleUploadBirthdayCardProfilePhoto(file: File) {
    if (!IMGBB_KEY) {
      setProfilePhotoUploadError('Chave ImgBB não configurada (NEXT_PUBLIC_IMGBB_KEY).');
      return;
    }
    setProfilePhotoUploadError('');
    setUploadingProfilePhoto(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      const url = data?.data?.url as string | undefined;
      if (!res.ok || !url) {
        throw new Error('Falha no upload da foto de perfil.');
      }
      setBirthdayCardProfilePhotoUrl(url);
    } catch (err) {
      console.error(err);
      setProfilePhotoUploadError('Não foi possível enviar a foto para o ImgBB.');
    } finally {
      setUploadingProfilePhoto(false);
    }
  }

  function openBirthdayCard(row: BirthdayRow) {
    setSelectedBirthdayCard(row);
    setBgUploadError('');
    setCardNameOverride('');
    const displayName = formatPersonName(row.aniversarianteNome);
    setCardMessage(buildBirthdayMessage(displayName));
    setCardNameColor('#111827');
    setCardNameSize(30);
    setCardNameFont('Inter, sans-serif');
    setCardMessageColor('#1f2937');
    setCardMessageSize(14);
    setCardMessageFont('Inter, sans-serif');
    setCardOverlayOpacity(30);
    setCardPublicationDescription(buildPublicationDescription(displayName, row.associado.empresa || ''));
    setBirthdayCardProfilePhotoUrl(row.aniversariante.foto || '');
    setLogoUploadError('');
    setProfilePhotoUploadError('');
    setLogoPosition({ x: 50, y: 90 });
    setLogoSize(56);
    setPhotoPosition({ x: 50, y: 28 });
    setPhotoSize(146);
    setNamePosition({ x: 50, y: 47.04 });
    setMessagePosition({ x: 50, y: 66.5 });
    try {
      if (typeof window !== 'undefined') {
        const lastBg = localStorage.getItem(LAST_BACKGROUND_STORAGE_KEY) || '';
        const lastLogo = localStorage.getItem(LAST_LOGO_STORAGE_KEY) || '';
        if (lastBg) setBirthdayCardBgUrl(lastBg);
        if (lastLogo) setBirthdayCardLogoUrl(lastLogo);
      }
    } catch {
      /* ignore */
    }
  }

  function adjustSize(target: 'logo' | 'photo' | 'name' | 'message', delta: number) {
    if (target === 'logo') setLogoSize((prev) => Math.min(140, Math.max(24, prev + delta)));
    if (target === 'photo') setPhotoSize((prev) => Math.min(220, Math.max(56, prev + delta * 2)));
    if (target === 'name') setCardNameSize((prev) => Math.min(56, Math.max(16, prev + delta)));
    if (target === 'message') setCardMessageSize((prev) => Math.min(28, Math.max(10, prev + delta)));
  }

  function getElementSize(target: 'logo' | 'photo' | 'name' | 'message'): number {
    if (target === 'logo') return logoSize;
    if (target === 'photo') return photoSize;
    if (target === 'name') return cardNameSize;
    return cardMessageSize;
  }

  function setElementSize(target: 'logo' | 'photo' | 'name' | 'message', size: number) {
    if (target === 'logo') setLogoSize(Math.min(140, Math.max(24, size)));
    else if (target === 'photo') setPhotoSize(Math.min(220, Math.max(56, size)));
    else if (target === 'name') setCardNameSize(Math.min(56, Math.max(16, size)));
    else setCardMessageSize(Math.min(28, Math.max(10, size)));
  }

  function startResize(target: 'logo' | 'photo' | 'name' | 'message', clientY: number) {
    setSelectedElement(target);
    setResizingElement({
      target,
      startY: clientY,
      startSize: getElementSize(target),
    });
  }

  function updateElementPositionFromPointer(clientX: number, clientY: number) {
    const cardEl = cardPreviewRef.current;
    if (!cardEl || !draggingElement) return;
    const rect = cardEl.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const next = {
      x: Math.min(92, Math.max(8, x)),
      y: Math.min(92, Math.max(8, y)),
    };
    if (draggingElement === 'logo') setLogoPosition(next);
    if (draggingElement === 'photo') setPhotoPosition(next);
    if (draggingElement === 'name') setNamePosition(next);
    if (draggingElement === 'message') setMessagePosition(next);
  }

  async function shareCurrentCardImage() {
    if (!selectedBirthdayCard || !cardPreviewRef.current) return;
    setSharingCard(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardPreviewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      if (!blob) throw new Error('Não foi possível gerar a imagem do card.');

      const displayName = formatPersonName(cardNameOverride || selectedBirthdayCard.aniversarianteNome)
        .replace(/\s+/g, '-')
        .toLowerCase();
      const fileName = `card-aniversario-${displayName || 'cdl'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Card de aniversário - ${formatPersonName(cardNameOverride || selectedBirthdayCard.aniversarianteNome)}`,
          text: cardPublicationDescription.trim() || undefined,
          files: [file],
        });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objectUrl);
      alert('Seu dispositivo não suporta compartilhamento de arquivo direto. A imagem foi baixada.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível compartilhar a imagem do card agora.');
    } finally {
      setSharingCard(false);
    }
  }

  async function downloadCurrentCardImage(format: 'png' | 'jpg') {
    if (!selectedBirthdayCard || !cardPreviewRef.current) return;
    setDownloadingCard(format);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardPreviewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        type: format === 'jpg' ? 'image/jpeg' : 'image/png',
        quality: format === 'jpg' ? 0.95 : 1,
      });
      if (!blob) throw new Error('Não foi possível gerar a imagem do card.');

      const displayName = formatPersonName(cardNameOverride || selectedBirthdayCard.aniversarianteNome)
        .replace(/\s+/g, '-')
        .toLowerCase();
      const fileName = `card-aniversario-${displayName || 'cdl'}.${format === 'jpg' ? 'jpg' : 'png'}`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert('Não foi possível baixar a imagem do card agora.');
    } finally {
      setDownloadingCard(null);
    }
  }

  async function copyPublicationText() {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      window.alert('Não foi possível copiar automaticamente neste dispositivo.');
      return;
    }
    try {
      setCopyingPublicationText(true);
      await navigator.clipboard.writeText(cardPublicationDescription || '');
      window.alert('Texto copiado para a área de transferência.');
    } catch (error) {
      console.error('Erro ao copiar texto de publicação:', error);
      window.alert('Não foi possível copiar o texto no momento.');
    } finally {
      setCopyingPublicationText(false);
    }
  }

  useEffect(() => {
    if (!pendingShare || !selectedBirthdayCard) return;
    const t = window.setTimeout(() => {
      void shareCurrentCardImage();
      setPendingShare(false);
    }, 180);
    return () => window.clearTimeout(t);
  }, [pendingShare, selectedBirthdayCard]);

  const rows = useMemo(() => {
    const flattened: BirthdayRow[] = [];
    associados.forEach((associado) => {
      (associado.aniversariantes ?? []).forEach((aniversariante) => {
        if (!aniversariante.nome?.trim() && !aniversariante.data?.trim()) return;
        flattened.push({
          associado,
          aniversariante,
          aniversarianteNome: aniversariante.nome?.trim() || '—',
          data: aniversariante.data?.trim() || '',
        });
      });
    });

    return flattened.sort((a, b) => {
      const aMd = extractMonthDay(a.data);
      const bMd = extractMonthDay(b.data);
      if (aMd.month !== bMd.month) return aMd.month - bMd.month;
      if (aMd.day !== bMd.day) return aMd.day - bMd.day;

      const byName = a.aniversarianteNome.localeCompare(b.aniversarianteNome, 'pt-BR');
      if (byName !== 0) return byName;

      return (a.associado.empresa || '').localeCompare(b.associado.empresa || '', 'pt-BR');
    });
  }, [associados]);

  return (
    <div className="w-full max-w-full overflow-x-hidden p-2.5 sm:p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Aniversariantes</h1>
          <p className="mt-0.5 text-xs text-gray-600 sm:mt-1 sm:text-sm">Aniversariantes cadastrados nos associados</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando aniversariantes...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum aniversariante cadastrado nos associados.
          </div>
        ) : (
          <>
          <div className="space-y-2 p-2 md:hidden">
            {rows.map((row, index) => (
              <article key={`${row.associado.id}-${row.aniversarianteNome}-${row.data}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                      {row.aniversariante.foto ? (
                        <img
                          src={row.aniversariante.foto}
                          alt={`Foto de ${formatPersonName(row.aniversarianteNome)}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                          {formatPersonName(row.aniversarianteNome).charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-tight text-gray-900 break-words">
                      {formatPersonName(row.aniversarianteNome)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                      {formatBirthday(row.data)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-snug text-gray-700 break-words">{row.associado.empresa || '—'}</p>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedAssociado(row.associado)}
                    className="rounded-md border border-cdl-blue/30 bg-cdl-blue/5 px-2 py-1.5 text-[11px] font-medium text-cdl-blue hover:bg-cdl-blue/10"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => openBirthdayCard(row)}
                    className="rounded-md border border-purple-300/50 bg-purple-50 px-2 py-1.5 text-[11px] font-medium text-purple-700 hover:bg-purple-100"
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openBirthdayCard(row);
                      setPendingShare(true);
                    }}
                    className="rounded-md border border-emerald-300/50 bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Compartilhar
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-cdl-gray">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr key={`${row.associado.id}-${row.aniversarianteNome}-${row.data}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatBirthday(row.data)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                          {row.aniversariante.foto ? (
                            <img
                              src={row.aniversariante.foto}
                              alt={`Foto de ${formatPersonName(row.aniversarianteNome)}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                              {formatPersonName(row.aniversarianteNome).charAt(0)}
                            </div>
                          )}
                        </div>
                        <span>{formatPersonName(row.aniversarianteNome)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.associado.empresa || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openBirthdayCard(row)}
                          className="rounded-lg border border-purple-300/50 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                        >
                          Card
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openBirthdayCard(row);
                            setPendingShare(true);
                          }}
                          className="rounded-lg border border-emerald-300/50 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Compartilhar
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAssociado(row.associado)}
                          className="rounded-lg border border-cdl-blue/30 bg-cdl-blue/5 px-3 py-1.5 text-xs font-medium text-cdl-blue hover:bg-cdl-blue/10"
                        >
                          Ver associado
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {selectedAssociado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-4xl max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between border-b border-gray-200 p-3 sm:p-6">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Dados do Associado</h3>
                <p className="mt-0.5 text-xs text-cdl-gray-text sm:mt-1 sm:text-sm">
                  {selectedAssociado.nome || '—'} · {selectedAssociado.empresa || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssociado(null)}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 text-sm sm:gap-4 sm:p-6 md:grid-cols-2">
              {[
                ['Nome', selectedAssociado.nome],
                ['Empresa', selectedAssociado.empresa],
                ['Razão social', selectedAssociado.razao_social || '—'],
                ['CNPJ', selectedAssociado.cnpj || '—'],
                ['Telefone Empresa', selectedAssociado.telefone || '—'],
                ['Telefone do responsável', selectedAssociado.telefone_responsavel || '—'],
                ['Email', selectedAssociado.email || '—'],
                ['Status', labelStatus(selectedAssociado.status)],
                ['Plano', selectedAssociado.plano || '—'],
                ['Código SPC', selectedAssociado.codigo_spc || '—'],
                ['CEP', selectedAssociado.cep || '—'],
                ['Endereço', selectedAssociado.endereco || '—'],
                ['Cidade', selectedAssociado.cidade || '—'],
                ['Estado', selectedAssociado.estado || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 break-words text-gray-900">{value as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedBirthdayCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-5xl max-h-[calc(100vh-1.5rem)] overflow-y-auto overscroll-contain rounded-xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)]">
            <div className="flex flex-col gap-2 border-b border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <h3 className="text-sm font-bold text-gray-900 sm:text-base">Card de Aniversário</h3>
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-2">
                <button
                  type="button"
                  onClick={() => void downloadCurrentCardImage('png')}
                  disabled={Boolean(downloadingCard)}
                  className="rounded-lg border border-indigo-300/60 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 sm:px-3 sm:text-xs"
                >
                  {downloadingCard === 'png' ? 'Baixando PNG...' : 'Download PNG'}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadCurrentCardImage('jpg')}
                  disabled={Boolean(downloadingCard)}
                  className="rounded-lg border border-violet-300/60 bg-violet-50 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 sm:px-3 sm:text-xs"
                >
                  {downloadingCard === 'jpg' ? 'Baixando JPG...' : 'Download JPG'}
                </button>
                <button
                  type="button"
                  onClick={() => void shareCurrentCardImage()}
                  disabled={sharingCard || Boolean(downloadingCard)}
                  className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 sm:px-3 sm:text-xs"
                >
                  {sharingCard ? 'Compartilhando...' : 'Compartilhar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBirthdayCard(null);
                    setBgUploadError('');
                    setLogoUploadError('');
                  }}
                  className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 sm:px-3 sm:text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-3 sm:gap-5 sm:p-5 lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
              <aside className="order-2 w-full space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:order-1">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Background do card</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBg}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadBirthdayCardBackground(file);
                    }}
                    className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-cdl-blue file:px-2 file:py-1 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
                  />
                  {uploadingBg && <p className="mt-1 text-[11px] text-cdl-gray-text">Enviando imagem...</p>}
                  {bgUploadError && <p className="mt-1 text-[11px] text-red-600">{bgUploadError}</p>}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-700">Temas de background</label>
                    {birthdayCardBgUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setBirthdayCardBgUrl('');
                          saveLastBackground('');
                        }}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  {backgroundThemes.length === 0 ? (
                    <p className="text-[11px] text-gray-500">Nenhuma imagem enviada anteriormente.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {backgroundThemes.map((url) => {
                        const selected = birthdayCardBgUrl === url;
                        return (
                          <button
                            key={url}
                            type="button"
                            onClick={() => {
                              setBirthdayCardBgUrl(url);
                              saveLastBackground(url);
                            }}
                            className={`relative h-14 overflow-hidden rounded-md border ${
                              selected ? 'border-cdl-blue ring-2 ring-cdl-blue/30' : 'border-gray-300'
                            }`}
                            title="Aplicar tema"
                          >
                            <img src={url} alt="Tema de background" className="h-full w-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-700">Opacidade do fundo</label>
                    <span className="text-[11px] text-gray-500">{cardOverlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={5}
                    value={cardOverlayOpacity}
                    onChange={(e) => setCardOverlayOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Foto de perfil</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingProfilePhoto}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadBirthdayCardProfilePhoto(file);
                    }}
                    className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
                  />
                  {uploadingProfilePhoto && <p className="mt-1 text-[11px] text-cdl-gray-text">Enviando foto...</p>}
                  {profilePhotoUploadError && <p className="mt-1 text-[11px] text-red-600">{profilePhotoUploadError}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Logo PNG transparente</label>
                  <input
                    type="file"
                    accept="image/png"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadBirthdayCardLogo(file);
                    }}
                    className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-purple-600 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
                  />
                  {uploadingLogo && <p className="mt-1 text-[11px] text-cdl-gray-text">Enviando logo...</p>}
                  {logoUploadError && <p className="mt-1 text-[11px] text-red-600">{logoUploadError}</p>}
                  <p className="mt-1 text-[11px] text-gray-500">Arraste logo, foto, nome e mensagem para reposicionar.</p>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-700">Temas de logo</label>
                    {birthdayCardLogoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setBirthdayCardLogoUrl('');
                          saveLastLogo('');
                        }}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  {logoThemes.length === 0 ? (
                    <p className="text-[11px] text-gray-500">Nenhuma logo enviada anteriormente.</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {logoThemes.map((url) => {
                        const selected = birthdayCardLogoUrl === url;
                        return (
                          <button
                            key={url}
                            type="button"
                            onClick={() => {
                              setBirthdayCardLogoUrl(url);
                              saveLastLogo(url);
                            }}
                            className={`relative h-12 overflow-hidden rounded-md border bg-white ${
                              selected ? 'border-cdl-blue ring-2 ring-cdl-blue/30' : 'border-gray-300'
                            }`}
                            title="Aplicar logo"
                          >
                            <img src={url} alt="Tema de logo" className="h-full w-full object-contain p-1" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>

              <aside className="order-3 w-full space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:order-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nome no card</label>
                  <input
                    type="text"
                    value={cardNameOverride}
                    onChange={(e) => setCardNameOverride(e.target.value)}
                    placeholder={formatPersonName(selectedBirthdayCard.aniversarianteNome)}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm text-gray-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Cor do nome</label>
                    <input
                      type="color"
                      value={cardNameColor}
                      onChange={(e) => setCardNameColor(e.target.value)}
                      className="h-9 w-full rounded border border-gray-300 p-1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Fonte</label>
                    <select
                      value={cardNameFont}
                      onChange={(e) => setCardNameFont(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
                      <option value="'Georgia', serif">Georgia</option>
                      <option value="'Brush Script MT', cursive">Brush Script</option>
                      <option value="'Segoe Script', cursive">Segoe Script</option>
                      <option value="'Lucida Handwriting', cursive">Lucida Handwriting</option>
                      <option value="'Monotype Corsiva', cursive">Monotype Corsiva</option>
                      <option value="'Apple Chancery', cursive">Apple Chancery</option>
                      <option value="'Snell Roundhand', cursive">Snell Roundhand</option>
                      <option value="'URW Chancery L', cursive">URW Chancery</option>
                      <option value="cursive">Cursiva padrão</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Mensagem de aniversário</label>
                  <textarea
                    value={cardMessage}
                    onChange={(e) => setCardMessage(e.target.value)}
                    rows={7}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm text-gray-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Cor da descrição</label>
                    <input
                      type="color"
                      value={cardMessageColor}
                      onChange={(e) => setCardMessageColor(e.target.value)}
                      className="h-9 w-full rounded border border-gray-300 p-1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Fonte</label>
                    <select
                      value={cardMessageFont}
                      onChange={(e) => setCardMessageFont(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
                      <option value="'Georgia', serif">Georgia</option>
                      <option value="'Brush Script MT', cursive">Brush Script</option>
                      <option value="'Segoe Script', cursive">Segoe Script</option>
                      <option value="'Lucida Handwriting', cursive">Lucida Handwriting</option>
                      <option value="'Monotype Corsiva', cursive">Monotype Corsiva</option>
                      <option value="'Apple Chancery', cursive">Apple Chancery</option>
                      <option value="'Snell Roundhand', cursive">Snell Roundhand</option>
                      <option value="'URW Chancery L', cursive">URW Chancery</option>
                      <option value="cursive">Cursiva padrão</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-gray-700">Texto para publicação (descrição)</label>
                    <button
                      type="button"
                      onClick={() => void copyPublicationText()}
                      disabled={copyingPublicationText}
                      className="rounded-md border border-cdl-blue/30 bg-cdl-blue/10 px-2 py-1 text-[11px] font-medium text-cdl-blue hover:bg-cdl-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {copyingPublicationText ? 'Copiando...' : 'Copiar'}
                    </button>
                  </div>
                  <textarea
                    value={cardPublicationDescription}
                    onChange={(e) => setCardPublicationDescription(e.target.value)}
                    rows={4}
                    placeholder="Ex.: Celebramos hoje mais um ano de vida com muita gratidão e alegria."
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm text-gray-800"
                  />
                </div>
              </aside>

              <div className="order-1 flex w-full justify-center lg:order-2">
                <div className="w-full max-w-[280px]">
                  <div
                    ref={cardPreviewRef}
                    className="relative aspect-[9/16] touch-none rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-5"
                    onMouseMove={(e) => {
                      if (resizingElement) {
                        const deltaY = e.clientY - resizingElement.startY;
                        setElementSize(resizingElement.target, resizingElement.startSize + deltaY * 0.2);
                        return;
                      }
                      if (!draggingElement) return;
                      updateElementPositionFromPointer(e.clientX, e.clientY);
                    }}
                    onMouseUp={() => {
                      setResizingElement(null);
                      setDraggingElement(null);
                    }}
                    onMouseLeave={() => {
                      setResizingElement(null);
                      setDraggingElement(null);
                    }}
                    onTouchMove={(e) => {
                      if (resizingElement) {
                        e.preventDefault();
                        const touch = e.touches[0];
                        if (!touch) return;
                        const deltaY = touch.clientY - resizingElement.startY;
                        setElementSize(resizingElement.target, resizingElement.startSize + deltaY * 0.2);
                        return;
                      }
                      if (!draggingElement) return;
                      e.preventDefault();
                      const touch = e.touches[0];
                      if (touch) updateElementPositionFromPointer(touch.clientX, touch.clientY);
                    }}
                    onTouchEnd={() => {
                      setResizingElement(null);
                      setDraggingElement(null);
                    }}
                    style={
                      birthdayCardBgUrl
                        ? {
                            backgroundImage: `linear-gradient(rgba(255,255,255,${cardOverlayOpacity / 100}), rgba(255,255,255,${cardOverlayOpacity / 100})), url(${birthdayCardBgUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    <div
                      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${
                        selectedElement === 'photo' ? 'ring-2 ring-cdl-blue/60' : ''
                      }`}
                      onClick={() => setSelectedElement('photo')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedElement('photo');
                        setDraggingElement('photo');
                        updateElementPositionFromPointer(e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        setSelectedElement('photo');
                        setDraggingElement('photo');
                        const touch = e.touches[0];
                        if (touch) updateElementPositionFromPointer(touch.clientX, touch.clientY);
                      }}
                      style={{ left: `${photoPosition.x}%`, top: `${photoPosition.y}%`, height: `${photoSize}px`, width: `${photoSize}px` }}
                    >
                      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white shadow-md">
                        {birthdayCardProfilePhotoUrl ? (
                          <img
                            src={birthdayCardProfilePhotoUrl}
                            alt="Foto de perfil do aniversariante"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <svg className="h-16 w-16 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5.121 17.804A10.943 10.943 0 0112 15c2.546 0 4.887.866 6.758 2.32M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        )}
                        {selectedElement === 'photo' && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startResize('photo', e.clientY);
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const touch = e.touches[0];
                              if (touch) startResize('photo', touch.clientY);
                            }}
                            className="absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border border-white bg-cdl-blue shadow"
                            aria-label="Redimensionar foto"
                          />
                        )}
                      </div>
                    </div>

                    <div
                      className={`absolute z-10 w-[78%] -translate-x-1/2 -translate-y-1/2 ${
                        selectedElement === 'name' ? 'ring-2 ring-cdl-blue/60' : ''
                      }`}
                      onClick={() => setSelectedElement('name')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedElement('name');
                        setDraggingElement('name');
                        updateElementPositionFromPointer(e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        setSelectedElement('name');
                        setDraggingElement('name');
                        const touch = e.touches[0];
                        if (touch) updateElementPositionFromPointer(touch.clientX, touch.clientY);
                      }}
                      style={{
                        left: `${namePosition.x}%`,
                        top: `${namePosition.y}%`,
                        color: cardNameColor,
                        fontSize: `${cardNameSize}px`,
                        fontFamily: cardNameFont,
                      }}
                    >
                      <p className="text-center font-semibold">
                        {formatPersonName(cardNameOverride || selectedBirthdayCard.aniversarianteNome)}
                      </p>
                      {selectedElement === 'name' && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startResize('name', e.clientY);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const touch = e.touches[0];
                            if (touch) startResize('name', touch.clientY);
                          }}
                          className="absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border border-white bg-cdl-blue shadow"
                          aria-label="Redimensionar nome"
                        />
                      )}
                    </div>

                    <div
                      className={`absolute z-10 w-[84%] -translate-x-1/2 -translate-y-1/2 ${
                        selectedElement === 'message' ? 'ring-2 ring-cdl-blue/60' : ''
                      }`}
                      onClick={() => setSelectedElement('message')}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedElement('message');
                        setDraggingElement('message');
                        updateElementPositionFromPointer(e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        setSelectedElement('message');
                        setDraggingElement('message');
                        const touch = e.touches[0];
                        if (touch) updateElementPositionFromPointer(touch.clientX, touch.clientY);
                      }}
                      style={{
                        left: `${messagePosition.x}%`,
                        top: `${messagePosition.y}%`,
                        color: cardMessageColor,
                        fontSize: `${cardMessageSize}px`,
                        fontFamily: cardMessageFont,
                      }}
                    >
                      <p className="whitespace-pre-wrap text-center leading-relaxed">
                        {cardMessage.trim() ||
                          buildBirthdayMessage(formatPersonName(cardNameOverride || selectedBirthdayCard.aniversarianteNome))}
                      </p>
                      {selectedElement === 'message' && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startResize('message', e.clientY);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const touch = e.touches[0];
                            if (touch) startResize('message', touch.clientY);
                          }}
                          className="absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border border-white bg-cdl-blue shadow"
                          aria-label="Redimensionar mensagem"
                        />
                      )}
                    </div>
                    {birthdayCardLogoUrl && (
                      <div
                        className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 ${
                          selectedElement === 'logo' ? 'ring-2 ring-cdl-blue/60' : ''
                        }`}
                        onClick={() => setSelectedElement('logo')}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedElement('logo');
                          setDraggingElement('logo');
                          updateElementPositionFromPointer(e.clientX, e.clientY);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          setSelectedElement('logo');
                          setDraggingElement('logo');
                          const touch = e.touches[0];
                          if (touch) updateElementPositionFromPointer(touch.clientX, touch.clientY);
                        }}
                        style={{
                          left: `${logoPosition.x}%`,
                          top: `${logoPosition.y}%`,
                          height: `${logoSize}px`,
                          width: `${logoSize}px`,
                        }}
                      >
                        <img
                          src={birthdayCardLogoUrl}
                          alt="Logo do card"
                          draggable={false}
                          className="h-full w-full cursor-move object-contain drop-shadow-md select-none"
                        />
                        {selectedElement === 'logo' && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startResize('logo', e.clientY);
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const touch = e.touches[0];
                              if (touch) startResize('logo', touch.clientY);
                            }}
                            className="absolute bottom-0 right-0 z-30 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border border-white bg-cdl-blue shadow"
                            aria-label="Redimensionar logo"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
