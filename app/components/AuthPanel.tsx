"use client";

import { FormEvent, useState } from "react";

import { isUserEmailConfirmed } from "@/lib/auth-confirmation";
import { getCurrentAuthUrl, rememberAuthReturnTo } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup" | "reset";

type AuthPanelProps = {
  className?: string;
  compact?: boolean;
  dense?: boolean;
  description?: string;
  embedded?: boolean;
};

const AUTH_MODES: AuthMode[] = ["login", "signup", "reset"];

const AUTH_MODE_LABELS: Record<AuthMode, string> = {
  login: "Entrar",
  signup: "Crear cuenta",
  reset: "Recuperar",
};

function getAuthModeButtonClass(
  mode: AuthMode,
  currentMode: AuthMode,
  dense: boolean,
) {
  return `rounded-full border ${
    dense ? "px-2 py-1.5 text-[0.56rem]" : "px-3 py-2 text-[0.62rem]"
  } font-black uppercase tracking-[0.12em] transition ${
    mode === currentMode
      ? "border-[#111111] bg-[#111111] text-[#fffdf8]"
      : "border-[#d6d1c8] bg-[#fffdf8] text-[#5f5952] hover:border-[#111111]"
  }`;
}

function getAuthErrorMessage(error: unknown) {
  const fallback = "No he podido completar el login.";

  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.toLowerCase().includes("email not confirmed")) {
    return "La cuenta existe, pero falta confirmar el email.";
  }

  if (error.message === "auth_email_not_confirmed") {
    return "Confirma tu email antes de entrar.";
  }

  return error.message || fallback;
}

export default function AuthPanel({
  className = "",
  compact = false,
  dense = false,
  description = "Entra con Google o usa email y contraseña.",
  embedded = false,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [lastSignupEmail, setLastSignupEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function signInWithGoogle() {
    rememberAuthReturnTo();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCurrentAuthUrl(),
      },
    });

    if (error) {
      setErrorMessage(error.message);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedEmail) {
      setErrorMessage("Escribe tu email.");
      return;
    }

    if (mode !== "reset" && password.length < 6) {
      setErrorMessage("La contraseña necesita al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user && !isUserEmailConfirmed(data.user)) {
          await supabase.auth.signOut();
          setLastSignupEmail(trimmedEmail);
          throw new Error("auth_email_not_confirmed");
        }

        setPassword("");
        setLastSignupEmail("");
        setMessage("Has entrado correctamente.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedDisplayName || trimmedEmail.split("@")[0],
              name: trimmedDisplayName || trimmedEmail.split("@")[0],
            },
            emailRedirectTo: getCurrentAuthUrl(),
          },
        });

        if (error) {
          throw error;
        }

        if (data.session && data.user && !isUserEmailConfirmed(data.user)) {
          await supabase.auth.signOut();
        }

        setPassword("");
        setDisplayName("");
        setLastSignupEmail(
          data.session && data.user && isUserEmailConfirmed(data.user)
            ? ""
            : trimmedEmail,
        );
        setMessage(
          data.session && data.user && isUserEmailConfirmed(data.user)
            ? "Cuenta creada. Ya estás dentro."
            : "Si el email no estaba registrado, se habrá creado la cuenta. Revisa tu correo para confirmarla o reenvía la confirmación.",
        );
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getCurrentAuthUrl(),
      });

      if (error) {
        throw error;
      }

      setMessage("Te he enviado un email para recuperar la contraseña.");
      setLastSignupEmail("");
    } catch (error) {
      if (
        mode === "login" &&
        error instanceof Error &&
        (error.message.toLowerCase().includes("email not confirmed") ||
          error.message === "auth_email_not_confirmed")
      ) {
        setLastSignupEmail(trimmedEmail);
      }

      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendSignupConfirmation() {
    if (!lastSignupEmail || isResendingConfirmation) {
      return;
    }

    setIsResendingConfirmation(true);
    setErrorMessage("");
    setMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: lastSignupEmail,
      options: {
        emailRedirectTo: getCurrentAuthUrl(),
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsResendingConfirmation(false);
      return;
    }

    setMessage(
      "He pedido a Supabase que reenvíe la confirmación. Revisa también spam/promociones.",
    );
    setIsResendingConfirmation(false);
  }

  return (
    <div
      className={`text-left ${
        embedded
          ? ""
          : "rounded-[1.5rem] border border-[#d6d1c8] bg-[#fffdf8] p-4 shadow-[0_8px_20px_rgba(17,17,17,0.05)]"
      } ${className}`}
    >
      <p className={dense ? "text-xs leading-5 text-[#5f5952]" : "text-sm leading-6 text-[#5f5952]"}>
        {description}
      </p>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className={`editorial-cta w-full gap-3 ${
          dense ? "mt-2 !px-3 !py-1.5 !text-[0.62rem]" : "mt-4 !px-4 !py-2.5"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${dense ? "h-4 w-4" : "h-5 w-5"} shrink-0`}
        >
          <path
            d="M21.8 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.5a4.7 4.7 0 0 1-2.04 3.09v2.57h3.3c1.93-1.78 3.04-4.4 3.04-7.4Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.57c-.91.61-2.08.98-3.47.98-2.67 0-4.93-1.8-5.74-4.23H2.85v2.66A10 10 0 0 0 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.26 13.71A5.97 5.97 0 0 1 5.94 12c0-.59.1-1.15.32-1.71V7.63H2.85A10 10 0 0 0 2 12c0 1.61.38 3.13 1.05 4.37l3.21-2.66Z"
            fill="#FBBC05"
          />
          <path
            d="M12 6.06c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.07 2.99 14.75 2 12 2A10 10 0 0 0 2.85 7.63l3.41 2.66c.81-2.43 3.07-4.23 5.74-4.23Z"
            fill="#EA4335"
          />
        </svg>
        <span className="translate-y-[1px]">Entrar con Google</span>
      </button>

      <div className={`${dense ? "mt-2 gap-1.5" : "mt-4 gap-2"} grid grid-cols-3`}>
        {AUTH_MODES.map((authMode) => (
          <button
            key={authMode}
            type="button"
            onClick={() => {
              setMode(authMode);
              setErrorMessage("");
              setMessage("");
            }}
            className={getAuthModeButtonClass(authMode, mode, dense)}
          >
            {AUTH_MODE_LABELS[authMode]}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className={dense ? "mt-2 space-y-2" : "mt-4 space-y-3"}>
        {mode === "signup" && (
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Nombre visible"
            className={`editorial-field ${
              dense ? "!rounded-[0.85rem] !px-3 !py-2 !text-sm" : "!rounded-[1rem] !px-4 !py-3"
            }`}
            autoComplete="name"
            maxLength={80}
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          className={`editorial-field ${
            dense ? "!rounded-[0.85rem] !px-3 !py-2 !text-sm" : "!rounded-[1rem] !px-4 !py-3"
          }`}
          autoComplete="email"
          required
        />

        {mode !== "reset" && (
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            className={`editorial-field ${
              dense ? "!rounded-[0.85rem] !px-3 !py-2 !text-sm" : "!rounded-[1rem] !px-4 !py-3"
            }`}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        )}

        {errorMessage && (
          <p className={`rounded-2xl border border-red-200 bg-red-50 text-red-700 ${
            dense ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
          }`}>
            {errorMessage}
          </p>
        )}

        {message && (
          <p className={`rounded-2xl border border-[#d6d1c8] bg-[#ece8df] text-[#4f4a44] ${
            dense ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
          }`}>
            {message}
          </p>
        )}

        {lastSignupEmail && (
          <button
            type="button"
            onClick={() => void resendSignupConfirmation()}
            disabled={isResendingConfirmation}
            className="editorial-link-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isResendingConfirmation
              ? "Reenviando..."
              : "Reenviar email de confirmación"}
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`editorial-cta editorial-cta-dark w-full ${
            dense
              ? "!px-3 !py-2 !text-[0.62rem]"
              : compact
                ? "!px-4 !py-2.5 !text-[0.68rem]"
                : ""
          } disabled:cursor-not-allowed disabled:opacity-55`}
        >
          {isSubmitting ? "Un momento..." : AUTH_MODE_LABELS[mode]}
        </button>
      </form>
    </div>
  );
}
