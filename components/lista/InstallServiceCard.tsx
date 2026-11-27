import { CheckIcon, PlusIcon, WrenchIcon } from "@/components/Icons";
import { formatBRL } from "@/lib/format";

type Props = {
  service: { title: string; price: number };
  included: boolean;
  onToggle: () => void;
};

/** Oferta compacta do serviço certificado Leroy Merlin Instala. */
export function InstallServiceCard({ service, included, onToggle }: Props) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-signage">
          <WrenchIcon size={14} className="text-leroy-dark" />
          Leroy Merlin Instala
        </span>
        <span className="font-mono text-[15px] font-extrabold text-signage">
          {formatBRL(service.price)}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-signage-muted">
        {service.title.replace("Leroy Merlin Instala · ", "")} com garantia de 12 meses.
      </p>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition ${
          included
            ? "bg-leroy text-signage"
            : "border border-rule-strong bg-floor text-signage hover:border-signage hover:bg-white"
        }`}
      >
        {included ? (
          <>
            <CheckIcon size={14} strokeWidth={2.5} />
            Instalação incluída
          </>
        ) : (
          <>
            <PlusIcon size={14} />
            Incluir instalação
          </>
        )}
      </button>
    </div>
  );
}
