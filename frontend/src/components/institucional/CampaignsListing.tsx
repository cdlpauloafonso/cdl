'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listCampaigns, Campaign } from '@/lib/firestore';

type CampaignsListingProps = {
  title: string;
  description: string;
  loadingLabel: string;
};

export function CampaignsListing({ title, description, loadingLabel }: CampaignsListingProps) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listCampaigns()
      .then((list) => {
        if (mounted) setItems(list);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-cdl-gray/30">
      <div className="container-cdl">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg sm:text-xl text-cdl-gray-text max-w-3xl mx-auto">{description}</p>
        </div>

        {loading ? (
          <p className="text-center text-cdl-gray-text">{loadingLabel}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {items.map((event) => (
                <Link
                  key={event.id}
                  href={`/institucional/campanhas/${event.id}`}
                  className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-cdl-blue/30 transition-all block"
                >
                  <div className="relative h-48 overflow-hidden">
                    {event.image ? (
                      <>
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cdl-blue text-white">{event.category}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-cdl-blue/20 to-cdl-blue-dark/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cdl-blue/10 flex items-center justify-center">
                            <svg className="w-10 h-10 text-cdl-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-cdl-gray-text">{event.date}</p>
                        </div>
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cdl-blue text-white">{event.category}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-cdl-blue transition-colors">{event.title}</h3>
                    <p className="text-sm text-cdl-gray-text leading-relaxed mb-4">{event.description}</p>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-cdl-gray-text flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {event.date}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-16 text-center">
              <div className="inline-block p-8 rounded-xl bg-gradient-to-r from-cdl-blue to-cdl-blue-dark text-white">
                <h2 className="text-2xl font-bold mb-3">Quer participar dos nossos eventos?</h2>
                <p className="text-blue-100 mb-6 max-w-2xl">Entre em contato conosco e fique por dentro de todas as campanhas e eventos promovidos pela CDL Paulo Afonso.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/atendimento" className="btn-secondary bg-white text-cdl-blue hover:bg-gray-100">Entre em contato</Link>
                  <Link href="/associe-se" className="btn-secondary border-2 border-white text-white hover:bg-white/10">Associe-se</Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
