import Link from 'next/link';
import { getEventAdminBackLabel } from '@/lib/event-admin-navigation';

type EventAdminBackLinkProps = {
  href: string;
  className?: string;
};

export function EventAdminBackLink({
  href,
  className = 'text-sm text-cdl-blue hover:underline mb-2 inline-block',
}: EventAdminBackLinkProps) {
  return (
    <Link href={href} className={className}>
      ← {getEventAdminBackLabel(href)}
    </Link>
  );
}
