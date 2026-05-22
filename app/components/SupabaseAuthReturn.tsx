"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

const RETURN_TO_KEY = "supabase-return-to";

function consumeReturnTo() {
  const target = window.localStorage.getItem(RETURN_TO_KEY);

  if (!target) {
    return null;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(target, window.location.origin);

    if (targetUrl.origin !== currentUrl.origin) {
      window.localStorage.removeItem(RETURN_TO_KEY);
      return null;
    }

    if (targetUrl.href === currentUrl.href) {
      window.localStorage.removeItem(RETURN_TO_KEY);
      return null;
    }

    window.localStorage.removeItem(RETURN_TO_KEY);
    return targetUrl.href;
  } catch {
    window.localStorage.removeItem(RETURN_TO_KEY);
    return null;
  }
}

export default function SupabaseAuthReturn() {
  useEffect(() => {
    async function redirectBackIfNeeded() {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        return;
      }

      const target = consumeReturnTo();

      if (target) {
        window.location.replace(target);
      }
    }

    void redirectBackIfNeeded();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) {
        return;
      }

      const target = consumeReturnTo();

      if (target) {
        window.location.replace(target);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
