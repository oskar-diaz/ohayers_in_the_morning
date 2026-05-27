const DISPLAY_AUTHOR_NAMES = [
  "Ikigai Gutierrez",
  "Haneda Miguel",
  "Zapatero Tsukukutsu",
  "Maria Hanamasa",
] as const;

const OSKAR_DIAZ_AUTHOR_SLUG = "oskar-diaz";

function normalizeAuthorName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getDisplayAuthor(
  seed: string,
  author?: {
    name?: string | null;
    slug?: {
      current?: string | null;
    } | null;
  } | null,
) {
  const safeAuthorName = author?.name?.trim();
  const safeAuthorSlug = author?.slug?.current?.trim();
  const isOskarDiaz =
    !safeAuthorName || normalizeAuthorName(safeAuthorName) === "oskar diaz";
  const safeSeed = seed.trim();

  if (!isOskarDiaz) {
    return {
      name: safeAuthorName,
      slug: safeAuthorSlug || null,
    };
  }

  return {
    name: safeSeed
      ? DISPLAY_AUTHOR_NAMES[hashSeed(safeSeed) % DISPLAY_AUTHOR_NAMES.length]
      : DISPLAY_AUTHOR_NAMES[0],
    slug: OSKAR_DIAZ_AUTHOR_SLUG,
  };
}

export function getDisplayAuthorName(seed: string, authorName?: string | null) {
  const safeAuthorName = authorName?.trim();

  if (safeAuthorName && normalizeAuthorName(safeAuthorName) !== "oskar diaz") {
    return safeAuthorName;
  }

  const safeSeed = seed.trim();

  if (!safeSeed) {
    return DISPLAY_AUTHOR_NAMES[0];
  }

  return DISPLAY_AUTHOR_NAMES[hashSeed(safeSeed) % DISPLAY_AUTHOR_NAMES.length];
}
