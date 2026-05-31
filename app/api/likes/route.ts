import { getLikesBySlug } from "@/lib/likes";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slugs?: unknown };
    const slugs = Array.isArray(body.slugs)
      ? body.slugs
          .filter((slug): slug is string => typeof slug === "string")
          .map((slug) => slug.trim())
          .filter(Boolean)
          .slice(0, 100)
      : [];
    const likes = await getLikesBySlug(slugs);

    return Response.json({ likes });
  } catch (error) {
    console.error("Failed to read likes", error);

    return Response.json(
      { error: "Failed to read likes" },
      { status: 500 },
    );
  }
}
