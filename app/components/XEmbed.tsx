"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element?: HTMLElement | null) => void;
      };
    };
  }
}

type XEmbedProps = {
  className?: string;
  url: string;
};

export default function XEmbed({ className, url }: XEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== "undefined" && Boolean(window.twttr?.widgets),
  );

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.twttr?.widgets) {
      return;
    }

    window.twttr.widgets.load(containerRef.current);
  }, [scriptLoaded, url]);

  return (
    <>
      <div ref={containerRef} className={className}>
        <blockquote
          className="twitter-tweet"
          data-dnt="true"
          data-lang="es"
          data-theme="light"
        >
          <a href={url}>{url}</a>
        </blockquote>
      </div>

      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />
    </>
  );
}
