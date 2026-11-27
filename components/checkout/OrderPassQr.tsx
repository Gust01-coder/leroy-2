/** Selo visual do passe digital. Ilustrativo: nao e um QR Code decodificavel. */
export function OrderPassQr({ code }: { code: string }) {
  // Padrão determinístico baseado no código do pedido
  const seed = code.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const size = 17;
  const cells: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      const inFinder =
        (x < 5 && y < 5) || (x >= size - 5 && y < 5) || (x < 5 && y >= size - 5);
      if (inFinder) {
        const lx = x < 5 ? x : x - (size - 5);
        const ly = y < 5 ? y : y - (size - 5);
        row.push(lx === 0 || lx === 4 || ly === 0 || ly === 4 || (lx === 2 && ly === 2));
      } else {
        row.push(((x * 13 + y * 29 + seed) % 7) < 4);
      }
    }
    cells.push(row);
  }

  return (
    <svg viewBox="0 0 180 180" className="h-32 w-32" aria-label={`QR Code do pedido ${code}`}>
      <rect width="180" height="180" fill="#FFFFFF" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={10 + x * 9.4}
              y={10 + y * 9.4}
              width="8.2"
              height="8.2"
              rx="1.2"
              fill="#14171A"
            />
          ) : null
        )
      )}
      <polygon points="90,68 114,108 66,108" fill="#78BE20" stroke="#FFFFFF" strokeWidth="4" />
    </svg>
  );
}
