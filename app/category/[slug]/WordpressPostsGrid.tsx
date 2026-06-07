"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";

import { formatPublicationDateTime } from "@/lib/format-date";
import type { WordpressPost, WordpressPostsPage } from "@/lib/wordpress";

type WordpressPostsGridProps = {
  categoryTitle: string;
  initialHasMore: boolean;
  initialPage: number;
  initialPosts: WordpressPost[];
  perPage: number;
};

function WordpressPostArticle({
  categoryTitle,
  post,
}: {
  categoryTitle: string;
  post: WordpressPost;
}) {
  return (
    <article className="border-b newspaper-border pb-10">
      <a href={post.url} target="_blank" rel="noopener noreferrer">
        <div className="relative aspect-[16/10] overflow-hidden mb-5 bg-[#ece8df]">
          <img
            src={post.imageUrl || "/tosca.png"}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover hover:scale-[1.02] transition duration-500"
          />
        </div>
      </a>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-wide text-red-700">
        <p>{categoryTitle}</p>
      </div>

      <a href={post.url} target="_blank" rel="noopener noreferrer">
        <h2
          className="newspaper-title text-[clamp(2rem,3vw,3rem)] font-black leading-[0.95] hover:opacity-70 transition"
          dangerouslySetInnerHTML={{ __html: post.titleHtml }}
        />
      </a>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{formatPublicationDateTime(post.publishedAt)}</span>
        {post.likeCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 font-semibold leading-none text-[#b93c3c]"
            aria-label={`${post.likeCount.toLocaleString()} likes`}
          >
            <span>{post.likeCount.toLocaleString()}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px] shrink-0 -translate-y-px"
              fill="currentColor"
            >
              <path d="M12 20.5s-7-4.35-7-10.05A4.19 4.19 0 0 1 9.25 6a4.55 4.55 0 0 1 2.75 1.26A4.55 4.55 0 0 1 14.75 6 4.19 4.19 0 0 1 19 10.45c0 5.7-7 10.05-7 10.05Z" />
            </svg>
          </span>
        )}
        {post.commentCount > 0 && (
          <span>
            {post.commentCount.toLocaleString()}{" "}
            {post.commentCount === 1 ? "comentario" : "comentarios"}
          </span>
        )}
      </div>

      <div
        className="mt-4 text-gray-700 leading-relaxed text-lg [&_a]:hidden"
        dangerouslySetInnerHTML={{ __html: post.excerptHtml }}
      />
    </article>
  );
}

export function WordpressPostsGrid({
  categoryTitle,
  initialHasMore,
  initialPage,
  initialPosts,
  perPage,
}: WordpressPostsGridProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextPage = page + 1;
      const response = await fetch(
        `/api/wordpress/posts?page=${nextPage}&perPage=${perPage}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Wordpress posts: ${response.status}`);
      }

      const data = (await response.json()) as WordpressPostsPage;

      if (!Array.isArray(data.posts)) {
        throw new Error("Unexpected Wordpress posts response.");
      }

      setPosts((currentPosts) => {
        const currentIds = new Set(currentPosts.map((post) => post.id));
        const newPosts = data.posts.filter((post) => !currentIds.has(post.id));

        return [...currentPosts, ...newPosts];
      });
      setPage(data.page || nextPage);
      setHasMore(data.hasMore && data.posts.length > 0);
    } catch (error) {
      console.error("Failed to load more Wordpress posts", error);
      setErrorMessage("No he podido cargar mas posts.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, page, perPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "700px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
        {posts.length > 0 ? (
          posts.map((post) => (
            <WordpressPostArticle
              key={post.id}
              categoryTitle={categoryTitle}
              post={post}
            />
          ))
        ) : (
          <div className="md:col-span-2 rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] p-8 text-center shadow-[0_10px_26px_rgba(17,17,17,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700">
              Blog temporalmente no disponible
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#4f4a43]">
              No hemos podido cargar los posts de WordPress ahora mismo. Intenta
              recargar dentro de un momento.
            </p>
          </div>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-14">
        <div ref={sentinelRef} className="h-2" aria-hidden="true" />

        {(isLoading || errorMessage) && (
          <div className="flex min-h-12 items-center justify-center text-center">
            {isLoading ? (
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
                Cargando mas posts...
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void loadMore()}
                className="border border-[#111111] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#111111] transition hover:bg-[#111111] hover:text-[#f8f6f2]"
              >
                Reintentar
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
