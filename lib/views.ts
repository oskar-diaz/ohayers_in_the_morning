import { redis } from "./redis";

function getViewsKey(slug: string) {
  return `views:${slug}`;
}

export async function getViews(slug: string) {
  if (!redis) {
    return 0;
  }

  const views = await redis.get<number>(getViewsKey(slug));

  return Number(views ?? 0);
}

export async function getViewsBySlug(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];

  if (!redis || slugs.length === 0) {
    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }

  const pipeline = redis.pipeline();

  for (const slug of uniqueSlugs) {
    pipeline.get<number>(getViewsKey(slug));
  }

  const results = await pipeline.exec<(number | null)[]>();

  return Object.fromEntries(
    uniqueSlugs.map((slug, index) => [slug, Number(results[index] ?? 0)]),
  ) as Record<string, number>;
}

export async function incrementViews(slug: string) {
  if (!redis) {
    return 0;
  }

  return redis.incr(getViewsKey(slug));
}
