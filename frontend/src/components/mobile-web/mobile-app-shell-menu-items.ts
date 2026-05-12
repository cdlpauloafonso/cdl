import type { MobileAppShellMenuItem } from '@/components/mobile-web/MobileAppShellMenu';

/** Itens do drawer de navegação — usado na home (atalhos) e no botão fixo global do shell `/m/`. */
export const MOBILE_APP_SHELL_MENU_ITEMS: readonly MobileAppShellMenuItem[] = [
  { href: '/servicos', label: 'Serviços', subtitle: 'Catálogo' },
  { href: '/servicos/beneficios-associados', label: 'Benefícios', subtitle: 'Parceiros' },
  { href: '/institucional/campanhas', label: 'Campanhas', subtitle: 'Eventos' },
  { href: '/atendimento', label: 'Fale conosco', subtitle: 'Contato' },
  { href: '/noticias', label: 'Notícias', subtitle: 'Publicações e comunicados' },
  { href: '/area-associado', label: 'Área do associado', subtitle: 'Benefícios e canais exclusivos' },
  { href: '/associe-se', label: 'Associe-se', subtitle: 'Faça parte da rede CDL' },
];
