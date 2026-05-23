"use client";

import { useSyncExternalStore } from "react";

const LIKED_POSTS_STORAGE_KEY = "liked-posts";
const LIKED_POSTS_CHANGE_EVENT = "liked-posts-change";

function readLikedPosts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(LIKED_POSTS_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (value): value is string => typeof value === "string",
    );
  } catch {
    return [];
  }
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === LIKED_POSTS_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LIKED_POSTS_CHANGE_EVENT, handleCustomChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LIKED_POSTS_CHANGE_EVENT, handleCustomChange);
  };
}

export function writeLikedPosts(slugs: string[]) {
  window.localStorage.setItem(LIKED_POSTS_STORAGE_KEY, JSON.stringify(slugs));
  window.dispatchEvent(new Event(LIKED_POSTS_CHANGE_EVENT));
}

export function getLikedPosts() {
  return readLikedPosts();
}

export function useLikedPost(slug: string) {
  return useSyncExternalStore(
    subscribe,
    () => readLikedPosts().includes(slug),
    () => false,
  );
}
