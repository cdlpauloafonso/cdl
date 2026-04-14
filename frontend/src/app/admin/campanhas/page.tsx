'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaigns, deleteCampaignById, Campaign } from '@/lib/firestore';
import { initFirebase } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function AdminCampanhasPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    listCampaigns()
      .then((list) => {
        if (mounted) setItems(list);
      })
      .catch(() => {
        if (mounted) setError('Erro ao carregar campanhas');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleDelete(id?: string) {
    if (!id) return;
    if (!confirm('Excluir esta campanha?')) return;
    try {
      // verify admin before attempting delete
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('Você precisa estar logado como administrador');
        return;
      }
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin);
      if (!isClaimAdmin) {
        const db = getFirestore();
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (!adminDoc.exists()) {
          setError('Acesso não autorizado');
          return;
        }
      }
      await deleteCampaignById(id);
      setItems((s) => s.filter((c) => c.id !== id));
    } catch {
      setError('Erro ao excluir campanha');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <Link href="/admin/campanhas/novo" className="btn-primary">
          Nova campanha
        </Link>
      </div>

      {loading ? (
        <p className="p-6 text-cdl-gray-text">Carregando campanhas...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((campanha) => (
              <div key={campanha.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-all">
                {campanha.image && (
                  <div className="h-40 w-full overflow-hidden">
                    <img src={campanha.image} alt={campanha.title} className="w-full h-40 object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{campanha.title}</h3>
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-cdl-blue text-white mb-3">{campanha.category}</span>
                  <p className="text-sm text-cdl-gray-text mb-4 line-clamp-2">{campanha.description}</p>
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Link href={`/institucional/campanhas/ver?slug=${encodeURIComponent(campanha.id ?? '')}`} target="_blank" className="flex-1 text-center px-3 py-2 text-sm text-cdl-blue hover:bg-cdl-blue/10 rounded-lg transition-colors">
                      Ver página
                    </Link>
                    <Link href={`/admin/campanhas/edit?id=${campanha.id}`} className="flex-1 text-center px-3 py-2 text-sm bg-cdl-blue text-white hover:bg-cdl-blue-dark rounded-lg transition-colors">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(campanha.id)} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
