export function KpiCard({
  label,
  value,
  sub,
  accent,
  Icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-leroy bg-signage text-white"
          : "border-rule bg-white text-signage"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[12px] font-medium ${
            accent ? "text-white/70" : "text-signage-muted"
          }`}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            size={15}
            className={accent ? "text-leroy" : "text-leroy-dark"}
          />
        )}
      </div>
      <div
        className={`mt-2 font-mono text-[30px] font-extrabold leading-none tabular-nums ${
          accent ? "text-leroy" : "text-signage"
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1.5 text-[11.5px] ${
          accent ? "text-white/65" : "text-signage-subtle"
        }`}
      >
        {sub}
      </div>
    </div>
  );
}
