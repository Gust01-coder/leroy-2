export function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition sm:flex-none sm:px-3.5 ${
        active
          ? "bg-signage text-white shadow-sm"
          : "text-signage-muted hover:text-signage"
      }`}
    >
      <span className={active ? "text-leroy" : ""}>{icon}</span>
      <span>{label}</span>
      {badge && (
        <span
          className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] font-bold ${
            active
              ? "bg-leroy text-signage"
              : "bg-floor text-signage-muted"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
