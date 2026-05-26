"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

function getUserName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return metadataName.trim() || user.email || "Usuario";
}

function getAvatarUrl(user: User) {
  const avatarUrl = user.user_metadata?.avatar_url;

  return typeof avatarUrl === "string" ? avatarUrl : "";
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

export default function AuthHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      document.documentElement.style.removeProperty("--auth-header-space");
      return;
    }

    document.documentElement.style.setProperty("--auth-header-space", "3.75rem");

    return () => {
      document.documentElement.style.removeProperty("--auth-header-space");
    };
  }, [session?.user]);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (!error) {
      setSession(null);
    }

    setIsSigningOut(false);
  }

  const user = session?.user;

  if (!user) {
    return null;
  }

  const name = getUserName(user);
  const avatarUrl = getAvatarUrl(user);

  return (
    <header
      aria-label="Sesion"
      className="fixed left-2 right-2 top-2 z-[80] mx-auto flex h-11 max-w-[420px] items-center justify-between gap-2 rounded-full border border-black/10 bg-[#fffdf8]/95 px-2.5 shadow-[0_10px_28px_rgba(17,17,17,0.14)] backdrop-blur sm:left-auto sm:right-4 sm:mx-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/10"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-black text-[#fffdf8]">
            {getInitial(name)}
          </div>
        )}

        <span className="min-w-0 truncate text-sm font-semibold text-[#111111]">
          {name}
        </span>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="shrink-0 rounded-full border border-[#111111] bg-[#111111] px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#fffdf8] transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isSigningOut ? "..." : "Salir"}
      </button>
    </header>
  );
}
