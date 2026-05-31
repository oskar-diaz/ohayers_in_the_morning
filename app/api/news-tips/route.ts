import { incrementPendingNewsTips } from "@/lib/news-tips";
import { isUserEmailConfirmed } from "@/lib/auth-confirmation";
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

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function getUserName(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return metadataName.trim() || user.email?.split("@")[0] || "";
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
  const token = getBearerToken(request);
  const { data: userData } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null } };
  const user =
    userData.user && isUserEmailConfirmed(userData.user) ? userData.user : null;
  const submitterName = user ? getUserName(user) : name;

  const tipPayload = {
    contact_email: user?.email || email || null,
    idea,
    ip_address: getIpAddress(request),
    name: submitterName || null,
    source_url: sourceUrl || null,
    status: "new",
    user_agent: request.headers.get("user-agent"),
    user_id: user?.id ?? null,
  };

  let { error } = await supabase.from("news_tips").insert(tipPayload);

  if (error?.code === "42703") {
    const legacyTipPayload = {
      contact_email: tipPayload.contact_email,
      idea: tipPayload.idea,
      ip_address: tipPayload.ip_address,
      name: tipPayload.name,
      source_url: tipPayload.source_url,
      status: tipPayload.status,
      user_agent: tipPayload.user_agent,
    };
    const legacyInsert = await supabase.from("news_tips").insert(legacyTipPayload);

    error = legacyInsert.error;
  }

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
