import {
  getWordpressPostPage,
  WORDPRESS_POSTS_PER_PAGE,
} from "@/lib/wordpress";

export const revalidate = 1800;

const MAX_WORDPRESS_POSTS_PER_PAGE = WORDPRESS_POSTS_PER_PAGE;

function getPositiveInteger(value: string | null, fallback: number) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = getPositiveInteger(url.searchParams.get("page"), 1);
  const requestedPerPage = getPositiveInteger(
    url.searchParams.get("perPage"),
    WORDPRESS_POSTS_PER_PAGE,
  );
  const perPage = Math.min(requestedPerPage, MAX_WORDPRESS_POSTS_PER_PAGE);
  const data = await getWordpressPostPage({ page, perPage });

  return Response.json(data);
}
