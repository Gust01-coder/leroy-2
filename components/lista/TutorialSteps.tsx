import type { Dispatch, SetStateAction } from "react";
import { CheckIcon, ShieldAlertIcon } from "@/components/Icons";
import type { DynamicProjectList } from "@/lib/types";

type Props = {
  tutorial: DynamicProjectList["tutorial"];
  doneSteps: Record<number, boolean>;
  setDoneSteps: Dispatch<SetStateAction<Record<number, boolean>>>;
};

/** Passo a passo pós-compra, com checklist e alerta de segurança por etapa. */
export function TutorialSteps({ tutorial, doneSteps, setDoneSteps }: Props) {
  return (
    <div className="space-y-3">
      {tutorial.map((st) => {
        const done = Boolean(doneSteps[st.step]);
        return (
          <div
            key={st.step}
            className={`rounded-xl border bg-white p-4 transition ${
              done ? "border-leroy bg-leroy-soft/20" : "border-rule"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  setDoneSteps((prev) => ({
                    ...prev,
                    [st.step]: !prev[st.step],
                  }))
                }
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-extrabold transition ${
                  done
                    ? "bg-leroy text-signage"
                    : "bg-signage text-leroy"
                }`}
              >
                {done ? <CheckIcon size={14} strokeWidth={2.8} /> : st.step}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`font-display text-[15px] font-bold ${
                      done ? "text-signage-subtle line-through" : "text-signage"
                    }`}
                  >
                    {st.title}
                  </h3>
                  <span className="text-[11.5px] text-signage-subtle">
                    ~{st.durationMin} min
                  </span>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-signage-muted">
                  {st.detail}
                </p>
                {st.safetyWarning && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
                    <ShieldAlertIcon size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{st.safetyWarning}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
