"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_IN_MS = 60_000;

async function fetchPendingCount() {
  const response = await fetch("/api/news-tips/pending", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No he podido consultar las alertas de noticias.");
  }

  return (await response.json()) as { pendingCount?: number };
}

async function acknowledgePending() {
  await fetch("/api/news-tips/pending", {
    method: "POST",
  });
}

export default function AdminNewsTipsNotice() {
  const [session, setSession] = useState<Session | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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

      if (!nextSession) {
        setIsVisible(false);
        setPendingCount(0);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;
    const email = session?.user.email;

    if (!accessToken || !isAdminEmail(email)) {
      return;
    }

    let cancelled = false;

    async function loadPending() {
      try {
        const data = await fetchPendingCount();
        const count = Number(data.pendingCount ?? 0);

        if (cancelled || count <= 0) {
          return;
        }

        setPendingCount(count);
        setIsVisible(true);
        void acknowledgePending();
      } catch {
        if (!cancelled) {
          setIsVisible(false);
        }
      }
    }

    void loadPending();

    const intervalId = window.setInterval(() => {
      void loadPending();
    }, POLL_INTERVAL_IN_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session]);

  if (!session?.user.email || !isAdminEmail(session.user.email) || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,420px)]">
      <div className="rounded-[1.7rem] border border-[#d6d1c8] bg-[#fffdf8] p-5 shadow-[0_18px_44px_rgba(17,17,17,0.16)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-red-700">
          Alerta editorial
        </p>

        <h2 className="mt-3 newspaper-title text-[clamp(1.65rem,3vw,2.35rem)] font-black leading-[0.96]">
          Tienes {pendingCount} {pendingCount === 1 ? "idea nueva" : "ideas nuevas"}
        </h2>

        <p className="mt-3 text-sm leading-7 text-[#5f5952]">
          Ya las tienes esperándote en la tabla <span className="font-semibold text-[#111111]">news_tips</span> de Supabase.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="editorial-cta editorial-cta-dark"
            onClick={() => setIsVisible(false)}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
