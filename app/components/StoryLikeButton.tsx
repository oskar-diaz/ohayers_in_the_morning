"use client";

import { startTransition, useState } from "react";

import {
  getLikedPosts,
  useLikedPost,
  writeLikedPosts,
} from "@/app/components/likedPostsStore";

type StoryLikeButtonProps = {
  slug: string;
  initialLikes: number;
  compact?: boolean;
};

export default function StoryLikeButton({
  slug,
  initialLikes,
  compact = false,
}: StoryLikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const liked = useLikedPost(slug);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLike() {
    if (liked || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/likes/${slug}`, {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Like request failed");
      }

      const data = (await response.json()) as { likes?: number };
      const likedPosts = getLikedPosts();
      const nextLikedPosts = likedPosts.includes(slug)
        ? likedPosts
        : [...likedPosts, slug];

      writeLikedPosts(nextLikedPosts);

      startTransition(() => {
        setLikes((currentLikes) => data.likes ?? currentLikes + 1);
      });
    } catch {
      // Ignore transient failures and preserve the current UI state.
    } finally {
      setIsSubmitting(false);
    }
  }

  const countClassName = compact
    ? "text-[0.82rem] tracking-[0.12em]"
    : "text-[0.92rem] tracking-[0.14em]";
  const iconClassName = compact ? "h-[28px] w-[28px]" : "h-[34px] w-[34px]";
  const showCount = likes > 0;

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={liked || isSubmitting}
      className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap font-semibold uppercase leading-none text-[#b93c3c] transition hover:text-[#8f1f1f] disabled:cursor-not-allowed disabled:opacity-100"
      aria-pressed={liked}
      aria-label={liked ? "Ya te gusta este post" : "Dar me gusta a este post"}
    >
      {showCount && <span className={countClassName}>{likes.toLocaleString()}</span>}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`${iconClassName} shrink-0 -translate-y-px`}
        fill="currentColor"
      >
        <path d="M12 20.5s-7-4.35-7-10.05A4.19 4.19 0 0 1 9.25 6a4.55 4.55 0 0 1 2.75 1.26A4.55 4.55 0 0 1 14.75 6 4.19 4.19 0 0 1 19 10.45c0 5.7-7 10.05-7 10.05Z" />
      </svg>
    </button>
  );
}
