"use client";

import { startTransition, useEffect, useRef, useState } from "react";

type PostViewsProps = {
  slug: string;
  initialViews: number;
};

export default function PostViews({ slug, initialViews }: PostViewsProps) {
  const [views, setViews] = useState(initialViews);
  const lastTrackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastTrackedSlugRef.current === slug) {
      return;
    }

    lastTrackedSlugRef.current = slug;

    const controller = new AbortController();

    async function trackView() {
      try {
        const response = await fetch(`/api/views/${slug}`, {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { views?: number };

        startTransition(() => {
          setViews(data.views ?? initialViews);
        });
      } catch {
        // Ignore aborted or transient tracking failures and keep the server value.
      }
    }

    trackView();

    return () => {
      controller.abort();
    };
  }, [initialViews, slug]);

  return <>{views.toLocaleString()} views</>;
}
