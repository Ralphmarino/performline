export function Logo({ name }: { name: string }) {
  return (
    <div className="logo">
      <img src="/logo.png" alt={name} />
      <span className="sub">Insights</span>
    </div>
  );
}
