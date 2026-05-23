"use client";

import { startTransition, useState } from "react";

import { getLikedPosts, useLikedPost, writeLikedPosts } from "@/app/components/likedPostsStore";

type PostLikesProps = {
  slug: string;
  initialLikes: number;
};

export default function PostLikes({ slug, initialLikes }: PostLikesProps) {
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
      // Ignore transient failures and keep the current state unchanged.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={liked || isSubmitting}
      className={`inline-flex items-center gap-4 rounded-[1.4rem] border border-[#d6d1c8] bg-[#fffdf8] px-5 py-4 text-left shadow-[0_12px_30px_rgba(17,17,17,0.05)] transition ${
        liked
          ? "border-red-200 text-red-700"
          : "text-[#111111] hover:-translate-y-[1px] hover:shadow-[0_18px_34px_rgba(17,17,17,0.08)]"
      } disabled:cursor-not-allowed disabled:opacity-100`}
      aria-pressed={liked}
      aria-label={liked ? "Ya te gusta este post" : "Dar me gusta a este post"}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
          liked ? "bg-red-700 text-white" : "bg-[#f3eee5] text-[#111111]"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-8 w-8"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 20.5s-7-4.35-7-10.05A4.19 4.19 0 0 1 9.25 6a4.55 4.55 0 0 1 2.75 1.26A4.55 4.55 0 0 1 14.75 6 4.19 4.19 0 0 1 19 10.45c0 5.7-7 10.05-7 10.05Z" />
        </svg>
      </span>

      <span className="flex flex-col">
        <span className="text-2xl font-black newspaper-title leading-none">
          {likes.toLocaleString()}
        </span>
        <span className="mt-1 text-[0.72rem] uppercase tracking-[0.16em] text-[#7a746b]">
          {liked ? "Te gusta esto" : "Dale love"}
        </span>
      </span>
    </button>
  );
}
