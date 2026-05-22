import { redis } from "./redis";

export async function getViews(slug: string) {
  const views = await redis.get<number>(`views:${slug}`);

  return views || 0;
}
