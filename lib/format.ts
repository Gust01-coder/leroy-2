export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "agora", "há 5 min", "há 2h 10m": tempo decorrido legivel para o painel. */
export function formatTimeAgo(ts: number): string {
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `há ${h}h${m > 0 ? ` ${m}m` : ""}`;
}
