import { ShieldAlertIcon } from "@/components/Icons";
import { StoreMap } from "@/components/StoreMap";
import type { computeAnalyticsSummary } from "@/lib/telemetry";

type Props = {
  summary: ReturnType<typeof computeAnalyticsSummary>;
};

export function PlantaTab({ summary }: Props) {
  return (
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <StoreMap heatmapCounts={summary.aisleHeatMap} />
        </div>

        <div className="lg:col-span-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="kicker text-amberwarn">Reposição Proativa</span>
                <h2 className="mt-0.5 font-display text-[17px] font-bold text-signage">
                  Alertas de ruptura
                </h2>
              </div>
              <ShieldAlertIcon size={18} className="text-amberwarn" />
            </div>

            <ul className="mt-4 divide-y divide-rule">
              {summary.outOfStockAlerts.length === 0 && (
                <li className="py-3 text-[13px] text-signage-muted">Nenhuma ruptura registrada.</li>
              )}
              {summary.outOfStockAlerts.map((al) => (
                <li
                  key={al.productName}
                  className="flex items-center justify-between gap-2 py-3 text-[13px]"
                >
                  <span className="font-medium text-signage">
                    {al.productName}
                  </span>
                  <span className="flex-shrink-0 rounded-full bg-amberwarn-soft px-2.5 py-0.5 font-mono text-[11px] font-bold text-amberwarn">
                    {al.hits}×
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
  );
}
