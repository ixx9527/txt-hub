const s = (size: number | string = 24) => ({ width: typeof size === 'number' ? size : undefined, height: typeof size === 'number' ? size : undefined, display: 'inline-block', verticalAlign: 'middle', ...(typeof size === 'string' ? { width: size, height: size } : {}) });

export function BookIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h5" />
    </svg>
  );
}

export function UploadIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function BookmarkIcon({ size = 24, filled = false, color = 'currentColor' }: { size?: number; filled?: boolean; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function CloseIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg style={s(size)} viewBox="0 0 24 24" fill="none" stroke="var(--animal-primary-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h5" />
    </svg>
  );
}
