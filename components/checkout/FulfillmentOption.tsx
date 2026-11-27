import { CheckIcon } from "@/components/Icons";

export function FulfillmentOption({
  selected,
  onSelect,
  badge,
  title,
  subtitle,
  priceLabel,
}: {
  selected: boolean;
  onSelect: () => void;
  badge: string;
  title: string;
  subtitle: string;
  priceLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 rounded-xl border-2 p-3.5 text-left transition ${
        selected
          ? "border-leroy-cta bg-leroy-soft/35"
          : "border-rule bg-white hover:border-rule-strong"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-leroy-cta bg-leroy-cta text-white" : "border-rule-strong"
          }`}
        >
          {selected && <CheckIcon size={11} strokeWidth={3} />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold text-signage">{title}</span>
            <span className="rounded-full bg-leroy-soft px-2 py-0.5 text-[10.5px] font-bold text-leroy-deep">
              {badge}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-signage-muted">{subtitle}</p>
        </div>
      </div>

      <span
        className={`flex-shrink-0 font-mono text-[13px] font-extrabold ${
          priceLabel === "Grátis" ? "text-leroy-deep" : "text-signage"
        }`}
      >
        {priceLabel}
      </span>
    </button>
  );
}
