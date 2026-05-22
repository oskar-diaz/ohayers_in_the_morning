import { hasRedisEnv, redis } from "./redis";

function getViewsKey(slug: string) {
  return `views:${slug}`;
}

export async function getViews(slug: string) {
  if (!redis) {
    if (!hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getViews()");
    }

    return 0;
  }

  try {
    const views = await redis.get<number>(getViewsKey(slug));

    return Number(views ?? 0);
  } catch (error) {
    console.error("Failed to read views from Upstash Redis", error);
    return 0;
  }
}

export async function getViewsBySlug(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];

  if (!redis || slugs.length === 0) {
    if (!redis && uniqueSlugs.length > 0 && !hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getViewsBySlug()");
    }

    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }

  try {
    const pipeline = redis.pipeline();

    for (const slug of uniqueSlugs) {
      pipeline.get<number>(getViewsKey(slug));
    }

    const results = await pipeline.exec<(number | null)[]>();

    return Object.fromEntries(
      uniqueSlugs.map((slug, index) => [slug, Number(results[index] ?? 0)]),
    ) as Record<string, number>;
  } catch (error) {
    console.error("Failed to batch read views from Upstash Redis", error);
    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }
}

export async function incrementViews(slug: string) {
  if (!redis) {
    throw new Error("Upstash Redis is not configured");
  }

  try {
    return await redis.incr(getViewsKey(slug));
  } catch (error) {
    console.error("Failed to increment views in Upstash Redis", error);
    throw error;
  }
}
