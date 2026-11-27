export function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const titleColor = variant === "dark" ? "text-white" : "text-signage";
  const subColor = variant === "dark" ? "text-white/70" : "text-signage-subtle";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Marca geométrica inspirada no telhado triangular Leroy Merlin */}
      <svg
        width="32"
        height="26"
        viewBox="0 0 36 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <path d="M18 1L35 26H1L18 1Z" fill="#78BE20" />
        <path d="M18 8.5L26.5 22H9.5L18 8.5Z" fill="#111315" />
        <text
          x="18"
          y="20.2"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="7.2"
          fontWeight="800"
          fontFamily="var(--font-display), sans-serif"
          letterSpacing="-0.4"
        >
          LM
        </text>
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className={`font-display text-[14.5px] font-extrabold uppercase tracking-[0.04em] ${titleColor}`}
        >
          LM Copiloto
        </span>
        <span
          className={`mt-0.5 hidden font-mono text-[10px] font-semibold sm:block uppercase tracking-[0.16em] ${subColor}`}
        >
          Leroy Merlin · Modo Loja
        </span>
      </div>
    </div>
  );
}
