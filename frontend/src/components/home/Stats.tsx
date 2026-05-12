import { HOME_PAGE_STATS } from '@/constants/home-stats';

export function Stats() {
  return (
    <section className="bg-cdl-gray border-y border-gray-200/80">
      <div className="container-cdl py-8 sm:py-12">
        <div className="grid grid-cols-3 gap-2 sm:gap-8 text-center">
          {HOME_PAGE_STATS.map((item, i) => (
            <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <p className="text-2xl sm:text-4xl font-bold text-cdl-blue leading-none">{item.value}</p>
              <p className="mt-1 text-[11px] leading-tight sm:text-sm font-medium text-cdl-gray-text">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
