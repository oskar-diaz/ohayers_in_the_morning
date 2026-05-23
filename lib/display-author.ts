const DISPLAY_AUTHOR_NAMES = [
  "Ikigai Gutierrez",
  "Haneda Miguel",
  "Zapatero Tsukukutsu",
  "Maria Hanamasa",
] as const;

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getDisplayAuthorName(seed: string) {
  const safeSeed = seed.trim();

  if (!safeSeed) {
    return DISPLAY_AUTHOR_NAMES[0];
  }

  return DISPLAY_AUTHOR_NAMES[hashSeed(safeSeed) % DISPLAY_AUTHOR_NAMES.length];
}
