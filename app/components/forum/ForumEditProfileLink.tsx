"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getConfirmedSession } from "@/lib/auth-confirmation";
import { supabase } from "@/lib/supabase";

type ForumEditProfileLinkProps = {
  userId: string;
};

export default function ForumEditProfileLink({
  userId,
}: ForumEditProfileLinkProps) {
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    let isActive = true;

    function syncSession(session: Session | null) {
      if (!isActive) {
        return;
      }

      setIsOwnProfile(getConfirmedSession(session)?.user.id === userId);
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [userId]);

  if (!isOwnProfile) {
    return null;
  }

  return (
    <Link
      href="/forum/profile"
      className="editorial-cta editorial-cta-dark !px-4 !py-2 !text-[0.68rem]"
    >
      Editar perfil
    </Link>
  );
}
