interface PlatformIconProps {
  icon?: string | null;
  className?: string;
}

function isImageUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function IconSvg({ icon }: { icon: string }) {
  const key = icon.trim().toLowerCase();

  if (key === 'monitor') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    );
  }

  if (key === 'tv') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M9 3l3 3 3-3" />
      </svg>
    );
  }

  if (key === 'console') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
        <rect x="4" y="8" width="16" height="8" rx="3" />
        <path d="M9 12h2" />
        <path d="M10 11v2" />
        <circle cx="15.5" cy="11" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="13" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-full w-full">
      <rect x="3" y="10" width="18" height="8" rx="4" />
      <path d="M7 14h2" />
      <path d="M8 13v2" />
      <circle cx="15.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlatformIcon({ icon, className }: PlatformIconProps) {
  const iconValue = icon?.trim() ?? '';
  const classes = className ?? 'h-4 w-4';

  if (iconValue.length === 0) {
    return <span aria-hidden="true" className={`${classes} inline-block rounded-full bg-white/10`} />;
  }

  if (isImageUrl(iconValue)) {
    return <img src={iconValue} alt="" aria-hidden="true" className={`${classes} rounded object-cover`} loading="lazy" />;
  }

  return (
    <span aria-hidden="true" className={`${classes} inline-flex text-text-primary`}>
      <IconSvg icon={iconValue} />
    </span>
  );
}