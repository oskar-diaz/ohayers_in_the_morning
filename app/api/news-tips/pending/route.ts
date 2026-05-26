import {
  getPendingNewsTipsCount,
  resetPendingNewsTips,
} from "@/lib/news-tips";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

async function requireAdmin(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Supabase no esta configurado en el servidor." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !isAdminEmail(data.user?.email)) {
    return Response.json({ error: "No autorizado." }, { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  const adminError = await requireAdmin(request);

  if (adminError) {
    return adminError;
  }

  const pendingCount = await getPendingNewsTipsCount();

  return Response.json({ pendingCount });
}

export async function POST(request: Request) {
  const adminError = await requireAdmin(request);

  if (adminError) {
    return adminError;
  }

  await resetPendingNewsTips();

  return Response.json({ pendingCount: 0, ok: true });
}
