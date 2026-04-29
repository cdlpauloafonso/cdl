'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getNewsById, listNews, createNews, updateNews, type NewsItemFirestore, type NewsLink } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { slugifyUnique } from '@/lib/slug';

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY;

export default function AdminNoticiaEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'nova';
  const [news, setNews] = useState<Partial<NewsItemFirestore>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image: '',
    links: [],
    published: true,
    publishedAt: new Date().toISOString().slice(0, 10),
  });
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [sharing, setSharing] = useState(false);
  const slugManuallyEdited = useRef(false);

  useEffect(() => {
    if (isNew) return;
    getNewsById(id)
      .then((n) => {
        if (n)
          setNews({
            ...n,
            publishedAt: n.publishedAt ? n.publishedAt.slice(0, 10) : '',
            links: n.links || [],
          });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    listNews(false, 200)
      .then((items) => setExistingSlugs(items.map((n) => n.slug).filter(Boolean)))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setSaving(true);
    const links = news.links && Array.isArray(news.links) && news.links.length > 0 
      ? news.links.filter((link: NewsLink) => link.label && link.url)
      : null;
    const published = (news as { published?: boolean }).published ?? true;
    const publishedAt = news.publishedAt ? new Date(news.publishedAt).toISOString() : new Date().toISOString();
    const payload: NewsItemFirestore = {
      title: news.title!,
      slug: news.slug!,
      excerpt: news.excerpt!,
      content: news.content!,
      image: news.image || null,
      links,
      published,
      publishedAt,
    };
    try {
      // Garantir Firebase inicializado e usuário é admin (igual às campanhas)
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setSubmitError('Você precisa estar logado como administrador');
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          setSubmitError('Acesso não autorizado');
          return;
        }
      }

      if (isNew) {
        const newId = await createNews(payload);
        router.push(`/admin/noticias/${newId}`);
      } else {
        await updateNews(id, payload);
        router.push('/admin/noticias');
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao salvar';
      // Notícias usam Firestore (não API); mensagens comuns de erro
      let message = raw;
      if (raw === 'API não configurada') {
        message = 'Notícias usam Firebase. Verifique se o Firebase está configurado e se você está logado como administrador.';
      } else if (raw.includes('permission') || raw.includes('Permission')) {
        message = 'Sem permissão. Verifique se está logado como administrador e se as regras do Firestore permitem escrita em /news.';
      }
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImageFile(file: File) {
    setImageError('');
    setImageUploading(true);
    try {
      if (!IMGBB_KEY) {
        setImageError('Chave de upload não configurada');
        setImageUploading(false);
        return;
      }
      const maxDim = 1200;
      const quality = 0.55;
      const compressImage = async (input: File): Promise<Blob | null> => {
        try {
          const bitmap = await createImageBitmap(input);
          const { width, height } = bitmap;
          let w = width;
          let h = height;
          if (width > maxDim || height > maxDim) {
            const r = Math.min(maxDim / width, maxDim / height);
            w = Math.round(width * r);
            h = Math.round(height * r);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(bitmap, 0, 0, w, h);
          return await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
          });
        } catch {
          return await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.onload = () => {
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                const r = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * r);
                h = Math.round(h * r);
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(input);
          });
        }
      };
      const compressed = await compressImage(file);
      const toUpload = compressed && compressed.size > 0 ? compressed : file;
      const form = new FormData();
      if (toUpload instanceof Blob && !(toUpload instanceof File)) {
        form.append('image', toUpload, (file.name.replace(/\.[^/.]+$/, '') || 'image') + '.jpg');
      } else {
        form.append('image', toUpload as File);
      }
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: form });
      const data = await res.json();
      if (data?.data?.url) {
        setNews((n) => ({ ...n, image: data.data.url }));
      } else {
        setImageError('Erro ao enviar imagem');
      }
    } catch {
      setImageError('Erro ao enviar imagem');
    } finally {
      setImageUploading(false);
    }
  }

  async function shareNews() {
    const slug = (news.slug ?? '').trim();
    if (!slug) {
      alert('Defina o slug da notícia para compartilhar.');
      return;
    }
    setSharing(true);
    try {
      const shareUrl = `${window.location.origin}/noticias/ver?slug=${encodeURIComponent(slug)}`;
      const shareText = `${news.title ?? 'Notícia CDL'}\n${shareUrl}`;

      if (navigator.share) {
        await navigator.share({
          title: news.title ?? 'Notícia CDL',
          text: news.excerpt ?? undefined,
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        alert('Link da notícia copiado para a área de transferência.');
        return;
      }

      const ok = window.prompt('Copie o link da notícia:', shareUrl);
      if (ok !== null) {
        // sem-op: prompt já mostra o link para cópia manual
      }
    } catch {
      alert('Não foi possível compartilhar a notícia agora.');
    } finally {
      setSharing(false);
    }
  }

  if (loading && !isNew) return <p className="text-cdl-gray-text">Carregando...</p>;

  return (
    <div>
      <Link href="/admin/noticias" className="text-sm text-cdl-blue hover:underline mb-4 inline-block">← Notícias</Link>
      <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Nova notícia' : 'Editar notícia'}</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input
            type="text"
            required
            value={news.title ?? ''}
            onChange={(e) => {
              const title = e.target.value;
              setNews((n) => {
                const newSlug = slugManuallyEdited.current ? (n.slug ?? '') : slugifyUnique(title, existingSlugs, n.slug);
                return { ...n, title, slug: newSlug };
              });
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Slug (URL) — preenchido automaticamente</label>
          <input
            type="text"
            required
            value={news.slug ?? ''}
            onChange={(e) => {
              slugManuallyEdited.current = true;
              setNews((n) => ({ ...n, slug: e.target.value }));
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="ex: novidade-2025"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Resumo</label>
          <textarea
            required
            value={news.excerpt ?? ''}
            onChange={(e) => setNews((n) => ({ ...n, excerpt: e.target.value }))}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Conteúdo (HTML)</label>
          <textarea
            required
            value={news.content ?? ''}
            onChange={(e) => setNews((n) => ({ ...n, content: e.target.value }))}
            rows={10}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Foto destaque</label>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) uploadImageFile(file);
              }}
            />
            {imageUploading && <span className="text-sm text-cdl-gray-text">Enviando...</span>}
            {imageError && <span className="text-sm text-red-600">{imageError}</span>}
            {news.image && (
              <button type="button" onClick={() => setNews((n) => ({ ...n, image: '' }))} className="text-sm text-red-600 hover:underline">
                Remover foto
              </button>
            )}
          </div>
          {news.image && (
            <div className="mt-3">
              <img src={news.image} alt="Preview" className="w-48 h-auto rounded-md border" />
            </div>
          )}
        </div>
        
        {/* Seção de Links */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Links relacionados</label>
            <button
              type="button"
              onClick={() => {
                const currentLinks = (news.links as NewsLink[]) || [];
                setNews((n) => ({
                  ...n,
                  links: [...currentLinks, { label: '', url: '', type: 'external' as const }],
                }));
              }}
              className="text-sm text-cdl-blue hover:text-cdl-blue-dark font-medium"
            >
              + Adicionar link
            </button>
          </div>
          <div className="space-y-3">
            {((news.links as NewsLink[]) || []).map((link, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Texto do link</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const currentLinks = (news.links as NewsLink[]) || [];
                        const updated = [...currentLinks];
                        updated[index] = { ...updated[index], label: e.target.value };
                        setNews((n) => ({ ...n, links: updated }));
                      }}
                      placeholder="Ex: Baixar PDF"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const currentLinks = (news.links as NewsLink[]) || [];
                        const updated = [...currentLinks];
                        updated[index] = { ...updated[index], url: e.target.value };
                        setNews((n) => ({ ...n, links: updated }));
                      }}
                      placeholder="https://exemplo.com/arquivo.pdf"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name={`link-type-${index}`}
                        checked={link.type === 'external'}
                        onChange={() => {
                          const currentLinks = (news.links as NewsLink[]) || [];
                          const updated = [...currentLinks];
                          updated[index] = { ...updated[index], type: 'external' as const };
                          setNews((n) => ({ ...n, links: updated }));
                        }}
                        className="text-cdl-blue focus:ring-cdl-blue"
                      />
                      Link externo
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name={`link-type-${index}`}
                        checked={link.type === 'download'}
                        onChange={() => {
                          const currentLinks = (news.links as NewsLink[]) || [];
                          const updated = [...currentLinks];
                          updated[index] = { ...updated[index], type: 'download' as const };
                          setNews((n) => ({ ...n, links: updated }));
                        }}
                        className="text-cdl-blue focus:ring-cdl-blue"
                      />
                      Download
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentLinks = (news.links as NewsLink[]) || [];
                      const updated = currentLinks.filter((_, i) => i !== index);
                      setNews((n) => ({ ...n, links: updated.length > 0 ? updated : null }));
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {(!news.links || (news.links as NewsLink[]).length === 0) && (
              <p className="text-sm text-cdl-gray-text italic py-4 text-center border border-dashed border-gray-300 rounded-lg">
                Nenhum link adicionado. Clique em "Adicionar link" para incluir links para PDFs, sites externos, etc.
              </p>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Data de publicação</label>
          <input
            type="date"
            value={news.publishedAt ?? ''}
            onChange={(e) => setNews((n) => ({ ...n, publishedAt: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={(news as { published?: boolean }).published ?? true}
            onChange={(e) => setNews((n) => ({ ...n, published: e.target.checked }))}
            className="rounded border-gray-300 text-cdl-blue focus:ring-cdl-blue"
          />
          <label htmlFor="published" className="text-sm text-gray-700">Publicado</label>
        </div>
        {submitError && (
          <p className="text-red-600 text-sm" role="alert">{submitError}</p>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => void shareNews()}
          disabled={sharing || !(news.slug ?? '').trim()}
          className="ml-2 rounded-lg border border-cdl-blue px-4 py-2 text-sm font-medium text-cdl-blue hover:bg-cdl-blue/5 disabled:opacity-50"
        >
          {sharing ? 'Compartilhando...' : 'Compartilhar'}
        </button>
      </form>
    </div>
  );
}
