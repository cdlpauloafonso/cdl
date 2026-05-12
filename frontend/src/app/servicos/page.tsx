import { getServiciosDisplayList } from '@/lib/servicos-page-data';
import { ServiciosView } from '@/components/servicos/ServiciosView';

export default async function ServicosPage() {
  const services = await getServiciosDisplayList();

  return (
    <div className="py-12 sm:py-16">
      <div className="container-cdl">
        <ServiciosView services={services} />
      </div>
    </div>
  );
}
