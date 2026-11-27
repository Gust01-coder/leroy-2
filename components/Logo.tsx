export function Logo({
  className = "",
  variant = "light",
  showSubtitle = true,
}: {
  className?: string;
  variant?: "dark" | "light";
  showSubtitle?: boolean;
}) {
  const src =
    variant === "dark"
      ? "/brand/leroy-merlin-logo-dark.svg"
      : "/brand/leroy-merlin-logo.svg";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Logo oficial vetorial Leroy Merlin */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Leroy Merlin"
        className="h-8 w-auto flex-shrink-0 object-contain sm:h-9"
      />

      {showSubtitle && (
        <>
          <span
            className={`hidden h-5 w-px sm:block ${
              variant === "dark" ? "bg-white/20" : "bg-rule-strong"
            }`}
            aria-hidden="true"
          />
          <div className="hidden flex-col leading-none sm:flex">
            <span
              className={`font-display text-[13.5px] font-extrabold tracking-tight ${
                variant === "dark" ? "text-white" : "text-signage"
              }`}
            >
              Copiloto
            </span>
            <span
              className={`mt-0.5 text-[10px] font-medium ${
                variant === "dark" ? "text-white/65" : "text-signage-subtle"
              }`}
            >
              Modo Loja
            </span>
          </div>
        </>
      )}
    </div>
  );
}
