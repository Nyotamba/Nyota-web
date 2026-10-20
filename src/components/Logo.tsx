import { Link } from 'react-router-dom';
import { NyotaMark } from './icons';

export function Logo({ dark = false, size = 'md' }: { dark?: boolean; size?: 'md' | 'lg' }) {
  return (
    <Link to="/" className={`flex shrink-0 items-center gap-2 no-underline ${dark ? 'text-offwhite hover:text-offwhite' : 'text-ink hover:text-ink'}`}>
      <NyotaMark size={size === 'lg' ? 40 : 32} onDark={dark} />
      <span className={`font-display tracking-[0.02em] ${size === 'lg' ? 'text-[30px]' : 'text-[24px]'}`}>Nyota</span>
    </Link>
  );
}
