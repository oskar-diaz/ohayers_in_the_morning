import type { Session, User } from "@supabase/supabase-js";

export function getUserAuthProviders(user: User) {
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

  return providers;
}

export function isEmailPasswordUser(user: User) {
  return getUserAuthProviders(user).has("email");
}

export function isUserEmailConfirmed(user: User) {
  if (!user.email || !isEmailPasswordUser(user)) {
    return true;
  }

  return Boolean(user.confirmed_at || user.email_confirmed_at);
}

export function getConfirmedSession(session: Session | null) {
  if (!session?.user || !isUserEmailConfirmed(session.user)) {
    return null;
  }

  return session;
}
