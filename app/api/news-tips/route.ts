import { incrementPendingNewsTips } from "@/lib/news-tips";
import { createClient } from "@supabase/supabase-js";

type NewsTipPayload = {
  email?: unknown;
  idea?: unknown;
  name?: unknown;
  sourceUrl?: unknown;
  website?: unknown;
};

function getTextValue(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function isValidUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Supabase no esta configurado en el servidor." },
      { status: 500 },
    );
  }

  let payload: NewsTipPayload;

  try {
    payload = (await request.json()) as NewsTipPayload;
  } catch {
    return Response.json(
      { error: "No he podido leer el formulario." },
      { status: 400 },
    );
  }

  const idea = getTextValue(payload.idea, 2000);
  const name = getTextValue(payload.name, 80);
  const email = getTextValue(payload.email, 160);
  const sourceUrl = getTextValue(payload.sourceUrl, 500);
  const website = getTextValue(payload.website, 120);

  if (website) {
    return Response.json({ ok: true });
  }

  if (idea.length < 12) {
    return Response.json(
      { error: "La idea es demasiado corta." },
      { status: 400 },
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "El email no parece valido." },
      { status: 400 },
    );
  }

  if (!isValidUrl(sourceUrl)) {
    return Response.json(
      { error: "El link debe empezar por http:// o https://." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase.from("news_tips").insert({
    contact_email: email || null,
    idea,
    ip_address: getIpAddress(request),
    name: name || null,
    source_url: sourceUrl || null,
    status: "new",
    user_agent: request.headers.get("user-agent"),
  });

  if (error) {
    console.error("Failed to store news tip", error);

    return Response.json(
      {
        error:
          "No he podido guardar la idea. Revisa que la tabla `news_tips` exista en Supabase y permita inserts anonimos.",
      },
      { status: 500 },
    );
  }

  await incrementPendingNewsTips();

  return Response.json({ ok: true });
}
