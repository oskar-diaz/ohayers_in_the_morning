import { getLikesBySlug } from "@/lib/likes";
import { getViewsBySlug } from "@/lib/views";

const MAX_FORUM_METRIC_KEYS = 100;
const FORUM_METRIC_KEY_PATTERN = /^forum-(?:category|post|topic)-\d+$/;
const FORUM_METRICS_HEADERS = {
  "Cache-Control": "no-store",
};

function normalizeForumMetricKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && FORUM_METRIC_KEY_PATTERN.test(item),
      ),
    ),
  ].slice(0, MAX_FORUM_METRIC_KEYS);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      keys?: unknown;
    };
    const keys = normalizeForumMetricKeys(body.keys);

    if (keys.length === 0) {
      return Response.json(
        {
          likes: {},
          views: {},
        },
        {
          headers: FORUM_METRICS_HEADERS,
        },
      );
    }

    const [views, likes] = await Promise.all([
      getViewsBySlug(keys),
      getLikesBySlug(keys),
    ]);

    return Response.json(
      {
        likes,
        views,
      },
      {
        headers: FORUM_METRICS_HEADERS,
      },
    );
  } catch (error) {
    console.error("Failed to read forum metrics", error);

    return Response.json(
      {
        error: "Failed to read forum metrics",
      },
      {
        headers: FORUM_METRICS_HEADERS,
        status: 500,
      },
    );
  }
}
