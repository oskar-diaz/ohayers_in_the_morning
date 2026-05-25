"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

let instagramEmbedPromise: Promise<void> | null = null;

function loadInstagramEmbedScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.instgrm?.Embeds?.process) {
    return Promise.resolve();
  }

  if (instagramEmbedPromise) {
    return instagramEmbedPromise;
  }

  instagramEmbedPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-instagram-embed-script="true"]',
    );

    const handleLoad = () => resolve();
    const handleError = () =>
      reject(new Error("Failed to load Instagram embed script"));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.defer = true;
    script.dataset.instagramEmbedScript = "true";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.body.appendChild(script);
  });

  return instagramEmbedPromise;
}

function normalizeInstagramUrl(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

function getInstagramEmbedUrl(url: string) {
  return `${normalizeInstagramUrl(url)}embed`;
}

type InstagramEmbedProps = {
  className?: string;
  title?: string;
  url: string;
};

export default function InstagramEmbed({
  className,
  title = "Ver publicacion en Instagram",
  url,
}: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const normalizedUrl = normalizeInstagramUrl(url);
  const embedUrl = getInstagramEmbedUrl(url);

  useEffect(() => {
    const node = containerRef.current;

    if (!node || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let cancelled = false;

    loadInstagramEmbedScript()
      .then(() => {
        if (cancelled) {
          return;
        }

        window.instgrm?.Embeds?.process();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isVisible, normalizedUrl]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-[2rem] border border-[#d6d1c8] bg-[#fffdf8] p-4 shadow-[0_20px_50px_rgba(17,17,17,0.08)] ${className ?? ""}`}
    >
      <iframe
        src={embedUrl}
        title={title}
        className="mx-auto block w-full min-w-0 max-w-full overflow-hidden rounded-[1.5rem] bg-white"
        height="720"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
    </div>
  );
}
