import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isUserEmailConfirmed } from "@/lib/auth-confirmation";
import { isAdminEmail } from "@/lib/admin";

const FORUM_IMAGE_BUCKET = "forum-images";
const MAX_USERS_PER_PAGE = 100;

type AdminContext = {
  adminSupabase: SupabaseClient;
  currentUser: User;
};

type ForumProfileRow = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string;
  user_id: string;
};

export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function getSupabaseConfig() {
  return {
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

function getUserDisplayName(user: User, profile?: ForumProfileRow) {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return metadataName.trim() || user.email?.split("@")[0] || user.id;
}

function getUserAvatarUrl(user: User, profile?: ForumProfileRow) {
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  const avatarUrl = user.user_metadata?.avatar_url;

  return typeof avatarUrl === "string" ? avatarUrl : null;
}

function getUserProviders(user: User) {
  const providers = new Set<string>();

  if (typeof user.app_metadata?.provider === "string") {
    providers.add(user.app_metadata.provider);
  }

  if (Array.isArray(user.app_metadata?.providers)) {
    for (const provider of user.app_metadata.providers) {
      if (typeof provider === "string") {
        providers.add(provider);
      }
    }
  }

  if (Array.isArray(user.identities)) {
    for (const identity of user.identities) {
      if (identity.provider) {
        providers.add(identity.provider);
      }
    }
  }

  return [...providers].sort();
}

async function getAdminContext(request: Request): Promise<
  | {
      context: AdminContext;
      response?: never;
    }
  | {
      context?: never;
      response: Response;
    }
> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      response: Response.json({ error: "No autorizado." }, { status: 401 }),
    };
  }

  const { anonKey, serviceRoleKey, url } = getSupabaseConfig();

  if (!url || !anonKey) {
    return {
      response: Response.json(
        { error: "Supabase no esta configurado en el servidor." },
        { status: 500 },
      ),
    };
  }

  const authSupabase = createClient(url, anonKey);
  const { data, error } = await authSupabase.auth.getUser(token);

  if (
    error ||
    !data.user ||
    !isUserEmailConfirmed(data.user) ||
    !isAdminEmail(data.user.email)
  ) {
    return {
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    };
  }

  if (!serviceRoleKey) {
    return {
      response: Response.json(
        { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
        { status: 500 },
      ),
    };
  }

  return {
    context: {
      adminSupabase: createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
      currentUser: data.user,
    },
  };
}

async function getProfilesByUserId(
  adminSupabase: SupabaseClient,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return new Map<string, ForumProfileRow>();
  }

  const { data } = await adminSupabase
    .from("forum_profiles")
    .select("user_id, display_name, avatar_url, bio")
    .in("user_id", userIds);

  return new Map(
    ((data ?? []) as ForumProfileRow[]).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );
}

async function removeUserForumImages(
  adminSupabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await adminSupabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .list(userId, {
      limit: 1000,
    });

  if (error || !data?.length) {
    return 0;
  }

  const paths = data
    .filter((item) => item.name)
    .map((item) => `${userId}/${item.name}`);

  if (paths.length === 0) {
    return 0;
  }

  const { error: removeError } = await adminSupabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    throw removeError;
  }

  return paths.length;
}

export async function GET(request: Request) {
  const adminResult = await getAdminContext(request);

  if (adminResult.response) {
    return adminResult.response;
  }

  const requestUrl = new URL(request.url);
  const page = Math.max(Number(requestUrl.searchParams.get("page") ?? "1"), 1);
  const perPage = Math.min(
    Math.max(Number(requestUrl.searchParams.get("perPage") ?? "50"), 1),
    MAX_USERS_PER_PAGE,
  );

  const { adminSupabase, currentUser } = adminResult.context;
  const { data, error } = await adminSupabase.auth.admin.listUsers({
    page,
    perPage,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const profilesByUserId = await getProfilesByUserId(
    adminSupabase,
    data.users.map((user) => user.id),
  );

  return Response.json({
    currentUserId: currentUser.id,
    pagination: {
      lastPage: data.lastPage ?? 0,
      nextPage: data.nextPage ?? null,
      page,
      perPage,
      total: data.total ?? data.users.length,
    },
    users: data.users.map((user) => {
      const profile = profilesByUserId.get(user.id);

      return {
        avatarUrl: getUserAvatarUrl(user, profile),
        confirmedAt: user.confirmed_at ?? user.email_confirmed_at ?? null,
        createdAt: user.created_at,
        displayName: getUserDisplayName(user, profile),
        email: user.email ?? null,
        id: user.id,
        isAdmin: isAdminEmail(user.email),
        lastSignInAt: user.last_sign_in_at ?? null,
        phone: user.phone ?? null,
        profileBio: profile?.bio ?? null,
        providers: getUserProviders(user),
      };
    }),
  });
}

export async function DELETE(request: Request) {
  const adminResult = await getAdminContext(request);

  if (adminResult.response) {
    return adminResult.response;
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: string;
  } | null;
  const userId = body?.userId?.trim();

  if (!userId) {
    return Response.json({ error: "Falta userId." }, { status: 400 });
  }

  const { adminSupabase, currentUser } = adminResult.context;

  if (userId === currentUser.id) {
    return Response.json(
      { error: "No puedes borrarte a ti mismo desde aqui." },
      { status: 400 },
    );
  }

  const { data: targetData, error: targetError } =
    await adminSupabase.auth.admin.getUserById(userId);

  if (targetError || !targetData.user) {
    return Response.json(
      { error: targetError?.message ?? "Usuario no encontrado." },
      { status: 404 },
    );
  }

  if (isAdminEmail(targetData.user.email)) {
    return Response.json(
      { error: "No puedes borrar un usuario admin." },
      { status: 400 },
    );
  }

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  let deletedImageCount = 0;

  try {
    deletedImageCount = await removeUserForumImages(adminSupabase, userId);
  } catch {
    return Response.json({
      deletedImageCount,
      ok: true,
      warning: "Usuario borrado, pero no he podido limpiar sus imagenes.",
    });
  }

  return Response.json({
    deletedImageCount,
    ok: true,
  });
}
