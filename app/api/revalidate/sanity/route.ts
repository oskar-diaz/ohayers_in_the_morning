import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const REVALIDATE_SECRET_ENV = "SANITY_REVALIDATE_SECRET";

const SANITY_REVALIDATION_PATHS = [
  { path: "/" },
  { path: "/category/[slug]", type: "page" as const },
  { path: "/post/[slug]", type: "page" as const },
  { path: "/author/[slug]", type: "page" as const },
  { path: "/feed.xml" },
  { path: "/sitemap.xml" },
];

function getRequestSecret(request: NextRequest) {
  return (
    request.headers.get("x-revalidate-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    ""
  );
}

function revalidateSanityPaths() {
  for (const route of SANITY_REVALIDATION_PATHS) {
    if (route.type) {
      revalidatePath(route.path, route.type);
      continue;
    }

    revalidatePath(route.path);
  }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env[REVALIDATE_SECRET_ENV];

  if (!expectedSecret) {
    return Response.json(
      {
        error: `${REVALIDATE_SECRET_ENV} is not configured.`,
        revalidated: false,
      },
      {
        status: 500,
      },
    );
  }

  if (getRequestSecret(request) !== expectedSecret) {
    return Response.json(
      {
        error: "Invalid revalidation secret.",
        revalidated: false,
      },
      {
        status: 401,
      },
    );
  }

  revalidateSanityPaths();

  return Response.json({
    revalidated: true,
    paths: SANITY_REVALIDATION_PATHS.map((route) => route.path),
  });
}
