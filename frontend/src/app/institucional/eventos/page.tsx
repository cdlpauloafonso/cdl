'use client';

import { CampaignsListing } from '@/components/institucional/CampaignsListing';

export default function EventosPage() {
  return (
    <CampaignsListing
      title="Eventos"
      description="Acompanhe palestras, campanhas e encontros promovidos pela CDL Paulo Afonso para o desenvolvimento do comércio local."
      loadingLabel="Carregando eventos..."
    />
  );
}
