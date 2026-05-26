import { hasRedisEnv, redis } from "./redis";

const PENDING_NEWS_TIPS_KEY = "news_tips:pending";

export async function incrementPendingNewsTips() {
  if (!redis) {
    if (!hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for incrementPendingNewsTips()");
    }

    return 0;
  }

  try {
    return await redis.incr(PENDING_NEWS_TIPS_KEY);
  } catch (error) {
    console.error("Failed to increment pending news tips in Upstash Redis", error);
    return 0;
  }
}

export async function getPendingNewsTipsCount() {
  if (!redis) {
    if (!hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for getPendingNewsTipsCount()");
    }

    return 0;
  }

  try {
    const count = await redis.get<number>(PENDING_NEWS_TIPS_KEY);

    return Number(count ?? 0);
  } catch (error) {
    console.error("Failed to read pending news tips from Upstash Redis", error);
    return 0;
  }
}

export async function resetPendingNewsTips() {
  if (!redis) {
    if (!hasRedisEnv) {
      console.error("Upstash Redis env vars are missing for resetPendingNewsTips()");
    }

    return 0;
  }

  try {
    await redis.del(PENDING_NEWS_TIPS_KEY);
    return 0;
  } catch (error) {
    console.error("Failed to reset pending news tips in Upstash Redis", error);
    return 0;
  }
}
