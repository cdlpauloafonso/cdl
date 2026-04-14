'use client';

import { CampaignsListing } from '@/components/institucional/CampaignsListing';

export default function CampanhasPage() {
  return (
    <CampaignsListing
      title="Campanhas e Eventos"
      description="Conheça as principais campanhas e eventos promovidos pela CDL Paulo Afonso para fortalecer o comércio local e promover o desenvolvimento empresarial."
      loadingLabel="Carregando campanhas..."
    />
  );
}
