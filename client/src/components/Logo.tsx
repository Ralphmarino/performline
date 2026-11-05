export function Logo({ name }: { name: string }) {
  return (
    <div className="logo">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="plg" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#1a8fd1" />
            <stop offset="1" stopColor="#6cc04a" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="#0f1c2e" />
        <path d="M14 46 L30 22 L46 46 Z" fill="url(#plg)" />
        <path d="M14 46 L46 46 L30 36 Z" fill="#fff" opacity=".85" />
      </svg>
      <div>
        {name.toLowerCase()}
        <span className="sub">Insights</span>
      </div>
    </div>
  );
}
