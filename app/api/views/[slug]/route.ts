import { incrementViews } from "@/lib/views";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const views = await incrementViews(slug);

  return Response.json({ views });
}
