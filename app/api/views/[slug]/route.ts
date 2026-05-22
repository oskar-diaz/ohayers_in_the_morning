import { incrementViews } from "@/lib/views";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const views = await incrementViews(slug);

    return Response.json({ views });
  } catch (error) {
    console.error("Failed to track post view", error);

    return Response.json(
      { error: "Failed to track view" },
      { status: 500 },
    );
  }
}
