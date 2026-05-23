import { hasRedisEnv, redis } from "./redis";

function getLikesKey(slug: string) {
  return `likes:${slug}`;
}

export async function getLikes(slug: string) {
  if (!redis) {
    if (!hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getLikes()");
    }

    return 0;
  }

  try {
    const likes = await redis.get<number>(getLikesKey(slug));

    return Number(likes ?? 0);
  } catch (error) {
    console.error("Failed to read likes from Upstash Redis", error);
    return 0;
  }
}

export async function getLikesBySlug(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];

  if (!redis || slugs.length === 0) {
    if (!redis && uniqueSlugs.length > 0 && !hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getLikesBySlug()");
    }

    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }

  try {
    const pipeline = redis.pipeline();

    for (const slug of uniqueSlugs) {
      pipeline.get<number>(getLikesKey(slug));
    }

    const results = await pipeline.exec<(number | null)[]>();

    return Object.fromEntries(
      uniqueSlugs.map((slug, index) => [slug, Number(results[index] ?? 0)]),
    ) as Record<string, number>;
  } catch (error) {
    console.error("Failed to batch read likes from Upstash Redis", error);
    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }
}

export async function incrementLikes(slug: string) {
  if (!redis) {
    throw new Error("Upstash Redis is not configured");
  }

  try {
    return await redis.incr(getLikesKey(slug));
  } catch (error) {
    console.error("Failed to increment likes in Upstash Redis", error);
    throw error;
  }
}
