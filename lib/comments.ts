import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasSupabaseEnv = Boolean(url && anonKey);

const supabase =
  hasSupabaseEnv
    ? createClient(url!, anonKey!)
    : null;

type CommentSlugRow = {
  post_slug: string | null;
};

export async function getCommentCountsBySlug(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];

  if (!supabase || uniqueSlugs.length === 0) {
    if (!supabase && uniqueSlugs.length > 0 && !hasSupabaseEnv) {
      console.error(
        "Supabase env vars are missing for getCommentCountsBySlug()",
      );
    }

    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }

  try {
    const { data, error } = await supabase
      .from("comments")
      .select("post_slug")
      .in("post_slug", uniqueSlugs);

    if (error) {
      throw error;
    }

    const counts = Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;

    for (const row of (data || []) as CommentSlugRow[]) {
      if (row.post_slug && row.post_slug in counts) {
        counts[row.post_slug] += 1;
      }
    }

    return counts;
  } catch (error) {
    console.error("Failed to batch read comment counts from Supabase", error);
    return Object.fromEntries(
      uniqueSlugs.map((slug) => [slug, 0]),
    ) as Record<string, number>;
  }
}
