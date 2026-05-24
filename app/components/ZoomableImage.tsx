"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ZoomableImageProps = {
  alt: string;
  buttonClassName?: string;
  className?: string;
  height: number;
  priority?: boolean;
  sizes?: string;
  src: string;
  width: number;
};

export default function ZoomableImage({
  alt,
  buttonClassName,
  className,
  height,
  priority = false,
  sizes,
  src,
  width,
}: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group relative block w-full cursor-zoom-in overflow-hidden ${buttonClassName ?? ""}`}
        aria-label={`Ampliar imagen: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes}
          className={className}
        />

        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex rounded-full bg-[#111111]/85 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white opacity-0 shadow-[0_10px_24px_rgba(17,17,17,0.18)] transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver completa
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/92 p-4 backdrop-blur-sm md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-6xl flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mb-4 inline-flex self-end rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/18"
            >
              Cerrar
            </button>

            <div className="overflow-hidden rounded-[1.6rem] bg-[#1a1a1a] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
              <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                sizes="100vw"
                className="h-auto max-h-[78vh] w-auto max-w-full object-contain"
              />
            </div>

            {alt && (
              <p className="mt-4 max-w-3xl text-center text-sm leading-relaxed text-white/82">
                {alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
