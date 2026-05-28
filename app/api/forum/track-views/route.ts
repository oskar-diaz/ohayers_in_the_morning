import { incrementViewsBySlug } from "@/lib/views";

const MAX_FORUM_VIEW_KEYS = 100;
const FORUM_VIEW_KEY_PATTERN = /^forum-(?:category|post|topic)-\d+$/;
const FORUM_VIEW_HEADERS = {
  "Cache-Control": "no-store",
};

function normalizeForumViewKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && FORUM_VIEW_KEY_PATTERN.test(item),
      ),
    ),
  ].slice(0, MAX_FORUM_VIEW_KEYS);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      keys?: unknown;
    };
    const keys = normalizeForumViewKeys(body.keys);

    if (keys.length === 0) {
      return Response.json(
        {
          views: {},
        },
        {
          headers: FORUM_VIEW_HEADERS,
        },
      );
    }

    const views = await incrementViewsBySlug(keys);

    return Response.json(
      {
        views,
      },
      {
        headers: FORUM_VIEW_HEADERS,
      },
    );
  } catch (error) {
    console.error("Failed to batch track forum views", error);

    return Response.json(
      {
        error: "Failed to track forum views",
      },
      {
        headers: FORUM_VIEW_HEADERS,
        status: 500,
      },
    );
  }
}
