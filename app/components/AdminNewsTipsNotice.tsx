"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";
import { getConfirmedSession } from "@/lib/auth-confirmation";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_IN_MS = 60_000;

async function fetchPendingCount(accessToken: string) {
  const response = await fetch("/api/news-tips/pending", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("No he podido consultar las alertas de noticias.");
  }

  return (await response.json()) as { pendingCount?: number };
}

async function acknowledgePending(accessToken: string) {
  const response = await fetch("/api/news-tips/pending", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("No he podido marcar las alertas como vistas.");
  }
}

export default function AdminNewsTipsNotice() {
  const [session, setSession] = useState<Session | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

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

      const confirmedSession = getConfirmedSession(nextSession ?? null);

      setSession(confirmedSession);

      if (!confirmedSession) {
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

    const adminAccessToken = accessToken;
    let cancelled = false;

    async function loadPending() {
      try {
        const data = await fetchPendingCount(adminAccessToken);
        const count = Number(data.pendingCount ?? 0);

        if (cancelled || !Number.isFinite(count) || count <= 0) {
          return;
        }

        setPendingCount((currentCount) => Math.max(currentCount, count));
        setIsVisible(true);
      } catch {
        return;
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

  async function handleAcknowledge() {
    const accessToken = session?.access_token;

    if (isAcknowledging || !accessToken) {
      return;
    }

    try {
      setIsAcknowledging(true);
      await acknowledgePending(accessToken);
      setIsVisible(false);
      setPendingCount(0);
    } finally {
      setIsAcknowledging(false);
    }
  }

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
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
          >
            {isAcknowledging ? "Marcando..." : "Entendido"}
          </button>
        </div>
      </div>
    </div>
  );
}
