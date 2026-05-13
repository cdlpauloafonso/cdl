/** Dados agregados para a página institucional «Nossa cidade» (site e shell `/m/`). */

export type NossaCidadeInstitutionalPayload = {
  excerptDisplay: string | null;
  showHtmlBlock: string | null;
  pontosCms: unknown[] | null;
};

async function getPage() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/pages/nossa-cidade`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<{ excerpt?: string | null; content?: string | null }>;
  } catch {
    return null;
  }
}

async function getNossaCidadeCms() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/nossa-cidade`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<{
      excerpt: string | null;
      content: string | null;
      pontosTuristicos: unknown[] | null;
    }>;
  } catch {
    return null;
  }
}

export async function getNossaCidadeInstitutionalPayload(): Promise<NossaCidadeInstitutionalPayload> {
  const [page, cms] = await Promise.all([getPage(), getNossaCidadeCms()]);

  const excerptFromCms = cms?.excerpt != null && String(cms.excerpt).trim() !== '' ? String(cms.excerpt).trim() : null;
  const contentFromCms = cms?.content != null && String(cms.content).trim() !== '' ? String(cms.content) : null;

  const excerptDisplay =
    excerptFromCms ?? (page?.excerpt != null && String(page.excerpt).trim() !== '' ? String(page.excerpt).trim() : null);

  const showHtmlBlock =
    contentFromCms ?? (page?.content != null && String(page.content).trim() !== '' ? String(page.content) : null);

  const pontosCms =
    cms?.pontosTuristicos && Array.isArray(cms.pontosTuristicos) && cms.pontosTuristicos.length > 0
      ? cms.pontosTuristicos
      : null;

  return { excerptDisplay, showHtmlBlock, pontosCms };
}
