"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getConfirmedSession } from "@/lib/auth-confirmation";
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

function getForumProfileUrl(userId: string) {
  return `/forum/profile/${encodeURIComponent(userId)}`;
}

export default function AuthHeader() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isActive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      setSession(getConfirmedSession(data.session ?? null));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(getConfirmedSession(nextSession ?? null));
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const isForumPath = pathname === "/forum" || pathname.startsWith("/forum/");

  if (isForumPath) {
    return null;
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
      className="fixed left-2 top-[calc(var(--site-ticker-height)+0.5rem)] z-[80] inline-flex h-10 w-fit max-w-[calc(100vw-1rem)] items-center rounded-full border border-black/10 bg-[#fffdf8]/95 px-2 shadow-[0_10px_28px_rgba(17,17,17,0.14)] backdrop-blur sm:left-4 sm:max-w-[420px]"
    >
      <Link
        href={getForumProfileUrl(user.id)}
        className="flex min-w-0 max-w-full items-center gap-2 rounded-full pr-1 transition hover:bg-[#f5efe4] focus:outline-none focus:ring-2 focus:ring-[#111111]/20"
        aria-label="Ver tu perfil"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-black/10"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-[0.68rem] font-black text-[#fffdf8]">
            {getInitial(name)}
          </div>
        )}

        <span className="min-w-0 truncate text-[0.82rem] font-semibold text-[#111111]">
          {name}
        </span>
      </Link>
    </header>
  );
}
