"use client";

import { useState } from "react";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Miniatura quadrada limpa para fotos oficiais de estúdio (600×600) em listas,
 * mapa, chat, checkout e etiquetas ESL.
 */
export function ProductThumb({
  src,
  alt,
  category,
  size = 64,
  className = "",
}: {
  src?: string;
  alt: string;
  category: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <CategoryIcon category={category} size={size} />;
  }

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-rule bg-white p-1 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/**
 * Mídia 4:3 limpa para fotos oficiais de estúdio da Leroy Merlin (600×600) em cards
 * de catálogo e vitrine — preserva o produto inteiro sem cortes nas bordas.
 */
export function ProductCardMedia({
  src,
  alt,
  category,
  className = "",
}: {
  src?: string;
  alt: string;
  category: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex aspect-[4/3] w-full items-center justify-center border-b border-rule/60 bg-white ${className}`}
      >
        <CategoryIcon category={category} size={56} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-rule/60 bg-white p-3 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
      />
    </div>
  );
}
