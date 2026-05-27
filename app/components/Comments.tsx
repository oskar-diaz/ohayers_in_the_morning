"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { ADMIN_EMAILS, normalizeEmail } from "@/lib/admin";
import { getCurrentAuthUrl, rememberAuthReturnTo } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

const EDIT_WINDOW_IN_MS = 15 * 60 * 1000;

type CommentId = number | string;

type CommentRecord = {
  id: CommentId;
  post_slug: string;
  author: string | null;
  email: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
  parent_id: CommentId | null;
};

type CommentNode = CommentRecord & {
  replies: CommentNode[];
};

function getDisplayName(comment: Pick<CommentRecord, "author" | "email">) {
  if (comment.author?.trim()) {
    return comment.author.trim();
  }

  if (!comment.email) {
    return "Lector";
  }

  return comment.email.split("@")[0] || "Lector";
}

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "L";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function buildCommentTree(records: CommentRecord[]) {
  const nodes = new Map<CommentId, CommentNode>();

  for (const record of records) {
    nodes.set(record.id, {
      ...record,
      replies: [],
    });
  }

  const roots: CommentNode[] = [];

  for (const record of records) {
    const node = nodes.get(record.id);

    if (!node) {
      continue;
    }

    if (record.parent_id && nodes.has(record.parent_id)) {
      nodes.get(record.parent_id)?.replies.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

function formatCommentTimestamp(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRecord | null>(null);
  const [editingComment, setEditingComment] = useState<CommentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCommentActionId, setActiveCommentActionId] = useState<CommentId | null>(
    null,
  );
  const [commentPendingDelete, setCommentPendingDelete] =
    useState<CommentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  function isGoogleUser() {
    if (!user) {
      return false;
    }

    const primaryProvider = user.app_metadata?.provider;
    const providers = Array.isArray(user.app_metadata?.providers)
      ? user.app_metadata.providers
      : [];
    const identityProviders = Array.isArray(user.identities)
      ? user.identities
          .map((identity) => identity.provider)
          .filter((provider): provider is string => Boolean(provider))
      : [];

    return [primaryProvider, ...providers, ...identityProviders].includes("google");
  }

  function isGoogleAdmin() {
    const normalizedUserEmail = normalizeEmail(user?.email);

    return Boolean(
      normalizedUserEmail &&
        ADMIN_EMAILS.has(normalizedUserEmail) &&
        isGoogleUser(),
    );
  }

  function isWithinEditWindow(comment: CommentRecord) {
    const createdAt = new Date(comment.created_at).getTime();

    if (Number.isNaN(createdAt)) {
      return false;
    }

    return nowTimestamp - createdAt <= EDIT_WINDOW_IN_MS;
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_slug", slug)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      setErrorMessage("No he podido cargar los comentarios.");
      return;
    }

    setComments((data as CommentRecord[]) || []);
  }

  useEffect(() => {
    let isActive = true;

    supabase
      .from("comments")
      .select("*")
      .eq("post_slug", slug)
      .order("created_at", {
        ascending: true,
      })
      .then(({ data, error }) => {
        if (!isActive) {
          return;
        }

        if (error) {
          setErrorMessage("No he podido cargar los comentarios.");
          return;
        }

        setComments((data as CommentRecord[]) || []);
      });

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      setUser(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isActive) {
          setUser(session?.user || null);
        }
      },
    );

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [slug]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function login() {
    rememberAuthReturnTo();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCurrentAuthUrl(),
      },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function startReply(comment: CommentRecord) {
    setEditingComment(null);
    setReplyTo(comment);
    setText("");
    document.getElementById("comment-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function cancelReply() {
    setReplyTo(null);
  }

  function startEdit(comment: CommentRecord) {
    setReplyTo(null);
    setEditingComment(comment);
    setText(comment.content);

    if (!user && comment.email) {
      setGuestEmail(comment.email);
    }

    document.getElementById("comment-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function cancelEdit() {
    setEditingComment(null);
    setText("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedText = text.trim();
    const trimmedEmail = guestEmail.trim().toLowerCase();

    if (!trimmedText) {
      return;
    }

    if (!user && !trimmedEmail) {
      setErrorMessage("Escribe tu email para poder comentar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const authorFromUser =
      user?.user_metadata?.full_name ||
      user?.email?.split("@")?.[0] ||
      "Lector";

    const payload = {
      post_slug: slug,
      author: user ? authorFromUser : trimmedEmail.split("@")[0] || "Lector",
      email: user?.email || trimmedEmail || null,
      avatar_url: user?.user_metadata?.avatar_url || null,
      content: trimmedText,
      parent_id: replyTo?.id || null,
    };

    const operation = editingComment
      ? supabase
          .from("comments")
          .update({
            content: trimmedText,
          })
          .eq("id", editingComment.id)
      : supabase.from("comments").insert(payload).select("id").single();

    const { error } = await operation;

    if (error) {
      setErrorMessage(
        editingComment
          ? "No he podido editar el comentario."
          : "No he podido guardar el comentario. Revisa que la tabla `comments` tenga al menos `email` y `parent_id`.",
      );
      setIsSubmitting(false);
      return;
    }

    setText("");
    setReplyTo(null);
    setEditingComment(null);

    if (!user) {
      setGuestEmail("");
    }

    await loadComments();
    setIsSubmitting(false);
  }

  function canDeleteComment(comment: CommentRecord) {
    if (!user?.email || !isGoogleUser()) {
      return false;
    }

    if (isGoogleAdmin()) {
      return true;
    }

    return normalizeEmail(comment.email) === normalizeEmail(user.email);
  }

  function canEditComment(comment: CommentRecord) {
    if (isGoogleAdmin()) {
      return true;
    }

    return canDeleteComment(comment) && isWithinEditWindow(comment);
  }

  async function deleteComment(comment: CommentRecord) {
    if (!canDeleteComment(comment)) {
      setErrorMessage("No tienes permisos para borrar este comentario.");
      return;
    }

    setActiveCommentActionId(comment.id);
    setErrorMessage("");

    const { error } = await supabase.from("comments").delete().eq("id", comment.id);

    if (error) {
      setErrorMessage("No he podido borrar el comentario.");
      setActiveCommentActionId(null);
      return;
    }

    if (editingComment?.id === comment.id) {
      cancelEdit();
    }

    if (replyTo?.id === comment.id) {
      cancelReply();
    }

    await loadComments();
    setActiveCommentActionId(null);
    setCommentPendingDelete(null);
  }

  const tree = buildCommentTree(comments);

  function renderComment(comment: CommentNode, depth = 0) {
    const displayName = getDisplayName(comment);
    const avatarLabel = getInitials(displayName);
    const canEdit = canEditComment(comment);
    const canDelete = canDeleteComment(comment);
    const isBusy = activeCommentActionId === comment.id;

    return (
      <div
        key={comment.id}
        className={`${depth > 0 ? "ml-5 mt-5 border-l border-[#d6d1c8] pl-5 sm:ml-8 sm:pl-7" : ""}`}
      >
        <article className="editorial-card rounded-[1.75rem] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {comment.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comment.avatar_url}
                  alt={displayName}
                  className="h-11 w-11 rounded-full object-cover ring-1 ring-black/10"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/70 text-xs font-semibold">
                  {avatarLabel}
                </div>
              )}

              <div>
                <p className="text-[1.02rem] font-semibold">{displayName}</p>

                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#7a746b]">
                  {formatCommentTimestamp(comment.created_at)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => startReply(comment)}
                className="editorial-link-button"
              >
                Responder
              </button>

              {(canEdit || canDelete) && (
                <>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      className="editorial-link-button"
                    >
                      Editar
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setCommentPendingDelete(comment)}
                      disabled={isBusy}
                      className="editorial-link-button disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? "Borrando..." : "Borrar"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="mt-5 text-[1.03rem] leading-8 text-[#222] whitespace-pre-wrap">
            {comment.content}
          </p>

          {comment.replies.length > 0 && (
            <div className="mt-6">
              {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </div>
          )}
        </article>
      </div>
    );
  }

  const currentUserName =
    user?.user_metadata?.full_name || user?.email?.split("@")?.[0] || "Lector";

  return (
    <div className="mt-24">
      <AlertDialog.Root
        open={Boolean(commentPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setCommentPendingDelete(null);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />

          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-[#d6d1c8] bg-[#fffdf8] px-6 py-6 shadow-[0_24px_60px_rgba(17,17,17,0.18)]">
            <AlertDialog.Title className="text-2xl font-black newspaper-title text-[#111111]">
              Borrar comentario
            </AlertDialog.Title>

            <AlertDialog.Description className="mt-3 text-[1rem] leading-7 text-[#4f4a44]">
              Esta accion borrara tu comentario
              {commentPendingDelete?.parent_id ? " y lo sacará del post." : "."}
            </AlertDialog.Description>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <AlertDialog.Cancel className="editorial-cta bg-transparent">
                Cancelar
              </AlertDialog.Cancel>

              <AlertDialog.Action
                className="editorial-cta editorial-cta-dark"
                onClick={(event) => {
                  event.preventDefault();

                  if (!commentPendingDelete) {
                    return;
                  }

                  void deleteComment(commentPendingDelete);
                }}
              >
                Borrar
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <div className="mb-10 flex items-end justify-between gap-4 border-b border-[#d6d1c8] pb-5">
        <h3 className="text-4xl font-black newspaper-title">
          {comments.length === 0
            ? "Sin comentarios"
            : `${comments.length} ${comments.length === 1 ? "comentario" : "comentarios"}`}
        </h3>
      </div>

      <div className="space-y-8">
        {tree.length > 0 ? (
          tree.map((comment) => renderComment(comment))
        ) : (
          <div className="editorial-card rounded-[1.75rem] px-6 py-8 text-center">
            <p className="text-lg text-[#4f4a44]">
              Todavía no hay comentarios. Sé la primera persona en escribir algo.
            </p>
          </div>
        )}
      </div>

      <div
        id="comment-form"
        className="editorial-card mt-12 rounded-[2rem] border px-6 py-7 sm:px-8 sm:py-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xl font-semibold newspaper-title">
              {editingComment
                ? "Editar comentario"
                : replyTo
                  ? "Responder comentario"
                  : "Escribe un comentario"}
            </p>

            <p className="mt-2 text-sm text-[#6a645c]">
              {user
                ? `Comentando como ${currentUserName}`
                : "Puedes comentar con tu email o entrar con Google."}
            </p>
          </div>

          {!user ? (
            <button
              type="button"
              onClick={login}
              className="editorial-cta gap-3"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
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
              <span className="translate-y-[1px]">Login con Google</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="editorial-link-button"
            >
              Logout
            </button>
          )}
        </div>

        {editingComment && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-[#d6d1c8] bg-[#ece8df] px-4 py-3 text-sm text-[#4f4a44]">
            <span>
              Editando tu comentario
            </span>

            <button
              type="button"
              onClick={cancelEdit}
              className="editorial-link-button !px-0 !py-0"
            >
              Cancelar
            </button>
          </div>
        )}

        {replyTo && !editingComment && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-[#d6d1c8] bg-[#ece8df] px-4 py-3 text-sm text-[#4f4a44]">
            <span>
              Respondiendo a <strong>{getDisplayName(replyTo)}</strong>
            </span>

            <button
              type="button"
              onClick={cancelReply}
              className="editorial-link-button !px-0 !py-0"
            >
              Cancelar
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6">
          {!user && (
            <input
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder="tu@email.com"
              className="editorial-field mb-4"
              autoComplete="email"
              required
            />
          )}

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              editingComment
                ? "Edita tu comentario..."
                : replyTo
                ? "Escribe tu respuesta..."
                : "Escribe un comentario..."
            }
            className="editorial-field min-h-[160px] resize-y"
            required
          />

          {errorMessage && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="editorial-cta editorial-cta-dark"
            >
              {isSubmitting
                ? "Enviando..."
                : editingComment
                  ? "Guardar cambios"
                  : replyTo
                  ? "Responder"
                  : "Comentar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
