import { hasRedisEnv, redis, redisForStaticReads } from "./redis";

function getViewsKey(slug: string) {
  return `views:${slug}`;
}

export async function getViews(slug: string) {
  if (!redisForStaticReads) {
    if (!hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getViews()");
    }

    return 0;
  }

  try {
    const views = await redisForStaticReads.get<number>(getViewsKey(slug));

    return Number(views ?? 0);
  } catch (error) {
    console.error("Failed to read views from Upstash Redis", error);
    return 0;
  }
}

export async function getViewsBySlug(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];

  if (!redisForStaticReads || slugs.length === 0) {
    if (!redisForStaticReads && uniqueSlugs.length > 0 && !hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getViewsBySlug()");
    }

    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }

  try {
    const pipeline = redisForStaticReads.pipeline();

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

export async function incrementViewsBySlug(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];

  if (!redis) {
    throw new Error("Upstash Redis is not configured");
  }

  if (uniqueSlugs.length === 0) {
    return {};
  }

  try {
    const pipeline = redis.pipeline();

    for (const slug of uniqueSlugs) {
      pipeline.incr(getViewsKey(slug));
    }

    const results = await pipeline.exec<number[]>();

    return Object.fromEntries(
      uniqueSlugs.map((slug, index) => [slug, Number(results[index] ?? 0)]),
    ) as Record<string, number>;
  } catch (error) {
    console.error("Failed to batch increment views in Upstash Redis", error);
    throw error;
  }
}
