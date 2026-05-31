"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";

import AuthPanel from "@/app/components/AuthPanel";
import { getConfirmedSession } from "@/lib/auth-confirmation";
import { supabase } from "@/lib/supabase";

type FormState = {
  email: string;
  idea: string;
  name: string;
  sourceUrl: string;
  website: string;
};

const INITIAL_FORM_STATE: FormState = {
  email: "",
  idea: "",
  name: "",
  sourceUrl: "",
  website: "",
};

function getUserName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return metadataName.trim() || user.email?.split("@")[0] || "";
}

export default function NewsTipCta() {
  return <NewsTipCtaContent showFloatingButton={false} showInlineSection />;
}

export function NewsTipFloatingButton() {
  return <NewsTipCtaContent showFloatingButton showInlineSection={false} />;
}

function NewsTipCtaContent({
  showFloatingButton,
  showInlineSection,
}: {
  showFloatingButton: boolean;
  showInlineSection: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [session, setSession] = useState<Session | null>(null);

  const user = session?.user ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    let isActive = true;

    function syncSession(nextSession: Session | null) {
      if (!isActive) {
        return;
      }

      const confirmedSession = getConfirmedSession(nextSession);

      setSession(confirmedSession);

      if (confirmedSession?.user) {
        setFormState((currentValue) => ({
          ...currentValue,
          email: currentValue.email || confirmedSession.user.email || "",
          name: currentValue.name || getUserName(confirmedSession.user),
        }));
      }
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
  }, []);

  useEffect(() => {
    if (!successMessage || closeCountdown === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCloseCountdown((current) => {
        if (current === null) {
          return null;
        }

        if (current <= 1) {
          window.clearInterval(intervalId);
          setSuccessMessage(null);
          setErrorMessage(null);
          setIsOpen(false);
          return null;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [closeCountdown, successMessage]);

  function openModal() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsOpen(true);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setCloseCountdown(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsOpen(false);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/news-tips", {
        method: "POST",
        headers: {
          ...(session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No he podido guardar la idea.");
      }

      setFormState(INITIAL_FORM_STATE);
      setSuccessMessage("Mucha gracias!! me pongo a ello ya mismo!!");
      setCloseCountdown(10);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No he podido guardar la idea.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {showFloatingButton && (
        <div className="pointer-events-none fixed right-4 top-2 z-40 hidden md:block">
          <button
            type="button"
            className="pointer-events-auto rounded-full border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#111111] shadow-[0_12px_24px_rgba(17,17,17,0.12)] transition hover:-translate-y-[1px] hover:shadow-[0_16px_28px_rgba(17,17,17,0.18)]"
            onClick={openModal}
          >
            Envia tu noticia
          </button>
        </div>
      )}

      {showInlineSection && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="editorial-card rounded-[2rem] px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-red-700">
                  Participa
                </p>

                <h2 className="mt-3 newspaper-title text-[clamp(2rem,4vw,3.2rem)] font-black leading-[0.94]">
                  ¿Tienes ideas de noticias? Envíamelas
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f5952] md:text-base">
                  Si se te ocurre alguna pavada del estilo, mándamela y nos reímos
                  todos
                </p>
              </div>

              <button
                type="button"
                className="editorial-cta editorial-cta-dark"
                onClick={openModal}
              >
                Enviar idea
              </button>
            </div>
          </div>
        </section>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(17,17,17,0.52)] p-4 md:items-center"
          onClick={closeModal}
        >
          <div
            className="editorial-card max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[2rem] p-6 md:max-h-[calc(100vh-4rem)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-red-700">
                  Buzón editorial
                </p>

                <h3 className="mt-3 newspaper-title text-[clamp(1.8rem,3.5vw,2.8rem)] font-black leading-[0.96]">
                  Cuéntame tu idea
                </h3>
              </div>

              <div className="flex items-start gap-3">
                <div className="hidden rounded-[1.4rem] bg-[linear-gradient(180deg,#fff8ea_0%,#ffe3d8_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:block">
                  <Image
                    src="/darumerborracher.png"
                    alt=""
                    width={92}
                    height={92}
                    className="h-auto w-[64px] drop-shadow-[0_10px_18px_rgba(123,26,26,0.22)]"
                  />
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6d1c8] bg-[#fffdf8] text-[#5f5952] transition hover:text-[#111111]"
                  onClick={closeModal}
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    ×
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-[#d6d1c8] bg-[#f8f4ed] p-3">
              {user ? (
                <p className="text-sm leading-6 text-[#5f5952]">
                  Enviando como{" "}
                  <strong className="font-black text-[#111111]">
                    {getUserName(user) || user.email}
                  </strong>
                  .
                </p>
              ) : (
                <AuthPanel
                  compact
                  dense
                  embedded
                  description="Puedes enviarla como invitado o entrar para asociarla a tu perfil."
                />
              )}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {!user && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-[#7a746b]">
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={formState.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className="editorial-field mt-2"
                      placeholder="Tu nombre o alias"
                      maxLength={80}
                    />
                  </label>

                  <label className="block">
                    <span className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-[#7a746b]">
                      Email
                    </span>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className="editorial-field mt-2"
                      placeholder="Solo si quieres respuesta"
                      maxLength={160}
                    />
                  </label>
                </div>
              )}

              <label className="block">
                <span className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-[#7a746b]">
                  Idea
                </span>
                <textarea
                  value={formState.idea}
                  onChange={(event) => updateField("idea", event.target.value)}
                  className="editorial-field mt-2 min-h-[180px] resize-y"
                  placeholder="A ver qué se te ha ocurrido, truhán"
                  maxLength={2000}
                  required
                />
              </label>

              <label className="block">
                <span className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-[#7a746b]">
                  Link opcional
                </span>
                <input
                  type="url"
                  value={formState.sourceUrl}
                  onChange={(event) =>
                    updateField("sourceUrl", event.target.value)
                  }
                  className="editorial-field mt-2"
                  placeholder="https://..."
                  maxLength={500}
                />
              </label>

              <div className="hidden">
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formState.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                  />
                </label>
              </div>

              {errorMessage && (
                <p className="rounded-2xl border border-[#e2b0b0] bg-[#fff1f1] px-4 py-3 text-sm text-[#8a1e1e]">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-2xl border border-[#cddfcb] bg-[#f4fbf1] px-4 py-3 text-sm text-[#2f5a2b]">
                  {successMessage}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="editorial-cta editorial-cta-dark disabled:cursor-not-allowed"
                  disabled={isSubmitting || Boolean(successMessage)}
                >
                  {isSubmitting
                    ? "Enviando..."
                    : successMessage && closeCountdown !== null
                      ? `Cerrando en ${closeCountdown}s`
                      : "Enviar idea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
