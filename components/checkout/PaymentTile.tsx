import { CheckCircleIcon } from "@/components/Icons";

export function PaymentTile({
  selected,
  onSelect,
  title,
  highlight,
  detail,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  highlight: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[86px] flex-col justify-between rounded-xl border-2 p-3.5 text-left transition ${
        selected
          ? "border-leroy-cta bg-leroy-soft/40"
          : "border-rule bg-white hover:border-rule-strong"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[13.5px] font-bold text-signage">{title}</span>
        {selected && <CheckCircleIcon size={15} className="flex-shrink-0 text-leroy-cta" />}
      </div>
      <div className="mt-2">
        <div className="text-[11.5px] font-bold text-leroy-deep">{highlight}</div>
        <div className="text-[11px] text-signage-subtle">{detail}</div>
      </div>
    </button>
  );
}
