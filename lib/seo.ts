import type { SanityImageSource } from "@sanity/image-url";

import { urlFor } from "@/sanity/lib/image";

import { siteDescription, siteUrl } from "./site";

function truncateAtWordBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const slicedValue = value.slice(0, maxLength + 1);
  const lastSpaceIndex = slicedValue.lastIndexOf(" ");

  if (lastSpaceIndex <= 0) {
    return `${value.slice(0, maxLength).trim()}...`;
  }

  return `${slicedValue.slice(0, lastSpaceIndex).trim()}...`;
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return new URL(normalizedPath, siteUrl).toString();
}

export function resolveSeoDescription(
  value?: string | null,
  fallback = siteDescription,
) {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();

  if (!normalizedValue) {
    return fallback;
  }

  return truncateAtWordBoundary(normalizedValue, 160);
}

export function getSanityOgImageUrl(image?: SanityImageSource) {
  if (!image) {
    return undefined;
  }

  return urlFor(image).width(1200).height(630).fit("crop").url();
}

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
