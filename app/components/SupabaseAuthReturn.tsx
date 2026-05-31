"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  getConfirmedSession,
  isUserEmailConfirmed,
} from "@/lib/auth-confirmation";
import { SUPABASE_RETURN_TO_KEY } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

function consumeReturnTo() {
  const target = window.localStorage.getItem(SUPABASE_RETURN_TO_KEY);

  if (!target) {
    return null;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(target, window.location.origin);

    if (targetUrl.origin !== currentUrl.origin) {
      window.localStorage.removeItem(SUPABASE_RETURN_TO_KEY);
      return null;
    }

    if (targetUrl.href === currentUrl.href) {
      window.localStorage.removeItem(SUPABASE_RETURN_TO_KEY);
      return null;
    }

    window.localStorage.removeItem(SUPABASE_RETURN_TO_KEY);
    return targetUrl.href;
  } catch {
    window.localStorage.removeItem(SUPABASE_RETURN_TO_KEY);
    return null;
  }
}

export default function SupabaseAuthReturn() {
  const [isPasswordRecoveryOpen, setIsPasswordRecoveryOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [authNoticeMessage, setAuthNoticeMessage] = useState("");

  useEffect(() => {
    async function rejectUnconfirmedSession() {
      await supabase.auth.signOut();
      setAuthNoticeMessage("Confirma tu email antes de entrar.");
    }

    async function redirectBackIfNeeded() {
      const { data } = await supabase.auth.getSession();
      const confirmedSession = getConfirmedSession(data.session ?? null);

      if (!data.session?.user) {
        return;
      }

      if (!confirmedSession) {
        await rejectUnconfirmedSession();
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
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setIsPasswordRecoveryOpen(true);
        return;
      }

      if (event !== "SIGNED_IN" || !session?.user) {
        return;
      }

      if (!isUserEmailConfirmed(session.user)) {
        void rejectUnconfirmedSession();
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

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("La contraseña necesita al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setNoticeMessage("");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setNoticeMessage("Contraseña actualizada.");
    setIsSubmitting(false);

    window.setTimeout(() => {
      setIsPasswordRecoveryOpen(false);
      setNoticeMessage("");
    }, 1600);
  }

  if (!isPasswordRecoveryOpen) {
    return authNoticeMessage ? (
      <div className="fixed left-1/2 top-4 z-[140] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700 shadow-[0_14px_34px_rgba(17,17,17,0.16)]">
        {authNoticeMessage}
      </div>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#111111]/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submitNewPassword}
        className="w-full max-w-md rounded-[2rem] border border-[#d6d1c8] bg-[#fffdf8] px-6 py-7 shadow-[0_24px_70px_rgba(17,17,17,0.24)]"
      >
        <h2 className="text-2xl font-black leading-tight text-[#111111]">
          Nueva contraseña
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#5f5952]">
          Escribe una contraseña nueva para tu cuenta.
        </p>

        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Nueva contraseña"
            className="editorial-field !rounded-[1rem] !px-4 !py-3"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la contraseña"
            className="editorial-field !rounded-[1rem] !px-4 !py-3"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        {errorMessage && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {noticeMessage && (
          <p className="mt-4 rounded-2xl border border-[#d6d1c8] bg-[#ece8df] px-4 py-3 text-sm text-[#4f4a44]">
            {noticeMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="editorial-cta editorial-cta-dark mt-5 w-full disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
