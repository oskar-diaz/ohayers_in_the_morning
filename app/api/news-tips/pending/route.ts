import {
  getPendingNewsTipsCount,
  resetPendingNewsTips,
} from "@/lib/news-tips";
export async function GET() {
  const pendingCount = await getPendingNewsTipsCount();

  return Response.json({ pendingCount });
}

export async function POST() {
  await resetPendingNewsTips();

  return Response.json({ pendingCount: 0, ok: true });
}
