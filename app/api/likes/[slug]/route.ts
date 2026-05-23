import { incrementLikes } from "@/lib/likes";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const likes = await incrementLikes(slug);

    return Response.json({ likes });
  } catch (error) {
    console.error("Failed to track post like", error);

    return Response.json(
      { error: "Failed to track like" },
      { status: 500 },
    );
  }
}
