export function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 text-[13.5px] text-signage-muted">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-mono text-[16px] font-extrabold text-signage">
        {value}
      </span>
    </div>
  );
}
