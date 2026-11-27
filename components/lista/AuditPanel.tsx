import { CheckCircleIcon, PlusIcon, ShieldCheckIcon } from "@/components/Icons";
import type { CompatibilityAlert, CompatibilityAudit } from "@/lib/types";

type Props = {
  audit: CompatibilityAudit;
  onApplyFix: (alert: CompatibilityAlert) => void;
};

/** Auditoria "anti-segunda viagem": pontuação da lista, alertas com correção em 1 clique e checagens aprovadas. */
export function AuditPanel({ audit, onApplyFix }: Props) {
  return (
  <div className="panel overflow-hidden">
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        audit.alerts.some((a) => a.severity === "critical")
          ? "bg-danger text-white"
          : audit.alerts.some((a) => a.severity === "warning")
          ? "bg-amberwarn text-white"
          : "bg-signage text-white"
      }`}
    >
      <div className="flex items-center gap-2 text-[12.5px] font-bold">
        <ShieldCheckIcon size={15} className="text-leroy" />
        Conferência da lista
      </div>
      <span className="font-mono text-[12px] font-extrabold">
        {audit.score}%
      </span>
    </div>

    <div className="p-4">
      <p className="text-[13px] font-semibold text-signage">
        {audit.statusLabel}
      </p>

      {audit.alerts.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {audit.alerts.map((al) => (
            <div
              key={al.id}
              className={`rounded-lg border p-3 ${
                al.severity === "critical"
                  ? "border-danger/30 bg-danger-soft/60"
                  : "border-amberwarn/30 bg-amberwarn-soft/70"
              }`}
            >
              <div className="text-[12.5px] font-bold text-signage">
                {al.title}
              </div>
              <p className="mt-0.5 text-[12px] text-signage-muted">
                {al.explanation}
              </p>
              {al.fixLabel && (
                <button
                  type="button"
                  onClick={() => onApplyFix(al)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-signage px-2.5 py-1.5 text-[11.5px] font-semibold text-leroy"
                >
                  <PlusIcon size={12} />
                  {al.fixLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {audit.passedChecks.length > 0 && (
        <details className="mt-3 border-t border-rule pt-2.5 text-[12px] text-signage-muted">
          <summary className="cursor-pointer font-medium text-signage-subtle hover:text-signage">
            Ver {audit.passedChecks.length} verificações aprovadas
          </summary>
          <ul className="mt-2 space-y-1.5">
            {audit.passedChecks.map((check) => (
              <li key={check} className="flex items-start gap-1.5">
                <CheckCircleIcon
                  size={13}
                  className="mt-0.5 flex-shrink-0 text-leroy-dark"
                />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  </div>
  );
}
