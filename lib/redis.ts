import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRedisEnv = Boolean(url && token);

export const redis =
  hasRedisEnv
    ? new Redis({
        url: url!,
        token: token!,
      })
    : null;

// Upstash defaults to no-store fetches, which makes ISR pages dynamic in Next.
export const redisForStaticReads =
  hasRedisEnv
    ? new Redis({
        url: url!,
        token: token!,
        cache: "default",
      })
    : null;
