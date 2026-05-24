"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        createTweet: (
          tweetId: string,
          element: HTMLElement,
          options?: {
            align?: "left" | "center" | "right";
            dnt?: boolean;
            lang?: string;
            theme?: "light" | "dark";
          },
        ) => Promise<HTMLElement>;
      };
    };
  }
}

let twitterWidgetsPromise: Promise<void> | null = null;

function loadTwitterWidgetsScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.twttr?.widgets?.createTweet) {
    return Promise.resolve();
  }

  if (twitterWidgetsPromise) {
    return twitterWidgetsPromise;
  }

  twitterWidgetsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-x-embed-script="true"]',
    );

    const handleLoad = () => resolve();
    const handleError = () =>
      reject(new Error("Failed to load X widgets script"));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.defer = true;
    script.dataset.xEmbedScript = "true";
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.body.appendChild(script);
  });

  return twitterWidgetsPromise;
}

function getTweetId(url: string) {
  const match = url.match(/status\/(\d+)/);
  return match?.[1] ?? null;
}

type XEmbedProps = {
  className?: string;
  url: string;
};

export default function XEmbed({ className, url }: XEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const tweetId = getTweetId(url);

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
    if (!isVisible || !containerRef.current || !tweetId) {
      return;
    }

    const container = containerRef.current;
    let cancelled = false;

    setIsRendered(false);
    container.replaceChildren();

    loadTwitterWidgetsScript()
      .then(async () => {
        if (cancelled || !window.twttr?.widgets?.createTweet) {
          return;
        }

        await window.twttr.widgets.createTweet(tweetId, container, {
          align: "center",
          dnt: true,
          lang: "es",
          theme: "light",
        });

        if (!cancelled) {
          setIsRendered(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsRendered(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, tweetId]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {!isRendered && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[220px] items-center justify-center rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] p-6 text-center text-sm text-[#5f5952] shadow-[0_10px_26px_rgba(17,17,17,0.05)] transition hover:opacity-80"
        >
          Ver publicacion en X
        </a>
      )}

      <div
        ref={containerRef}
        className={isRendered ? "" : "pointer-events-none absolute inset-0 opacity-0"}
      />
    </div>
  );
}
