"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { FormEvent, startTransition, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Heart } from "lucide-react";

import AuthPanel from "@/app/components/AuthPanel";
import {
  getLikedPosts,
  useLikedPost,
  writeLikedPosts,
} from "@/app/components/likedPostsStore";
import { ADMIN_EMAILS, normalizeEmail } from "@/lib/admin";
import { getConfirmedSession } from "@/lib/auth-confirmation";
import {
  FORUM_SMILIE_MAP,
  FORUM_SMILIE_PATTERN,
  FORUM_SMILIES,
} from "@/lib/forum";
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

function getCommentLikeKey(commentId: CommentId) {
  return `news-comment-${commentId}`;
}

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

function escapeCommentHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeCommentAttribute(value: string) {
  return escapeCommentHtml(value).replace(/`/g, "&#096;");
}

function renderCommentSmiliesToHtml(value: string) {
  return value
    .split(FORUM_SMILIE_PATTERN)
    .map((part) => {
      const smilie = FORUM_SMILIE_MAP[part];

      if (smilie) {
        if (smilie.src) {
          return `<img src="${escapeCommentAttribute(
            smilie.src,
          )}" alt="${escapeCommentAttribute(
            smilie.label,
          )}" title="${escapeCommentAttribute(
            part,
          )}" class="forum-smilie inline-block h-auto w-auto -translate-y-[2px] object-contain" />`;
        }

        return `<span class="inline-block -translate-y-px font-mono text-[0.92em]" aria-label="${escapeCommentAttribute(
          part,
        )}">${escapeCommentHtml(smilie.value)}</span>`;
      }

      return escapeCommentHtml(part);
    })
    .join("");
}

function CommentSmilieBar({ onPick }: { onPick: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {FORUM_SMILIES.map((smilie, index) =>
        smilie.type === "break" ? (
          <span
            key={`break-${index}`}
            className="h-0 basis-full"
            aria-hidden="true"
          />
        ) : (
          <button
            key={`${smilie.token}-${index}`}
            type="button"
            title={smilie.label}
            aria-label={`Añadir ${smilie.label}`}
            onClick={() => onPick(smilie.token)}
            className="inline-flex min-h-7 items-center justify-center border-0 bg-transparent p-0.5 text-left font-mono text-xs leading-none text-[#5f5952] transition hover:-translate-y-px hover:opacity-75"
          >
            {smilie.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={smilie.src}
                alt={smilie.label}
                className="h-auto w-auto object-contain"
              />
            ) : (
              smilie.value
            )}
          </button>
        ),
      )}
    </div>
  );
}

function CommentLikeButton({
  commentKey,
  likes,
  onLiked,
}: {
  commentKey: string;
  likes: number;
  onLiked: (likes: number) => void;
}) {
  const liked = useLikedPost(commentKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function likeComment() {
    if (liked || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/likes/${encodeURIComponent(commentKey)}`, {
        cache: "no-store",
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("comment_like_failed");
      }

      const data = (await response.json()) as { likes?: number };
      const nextLikes = data.likes ?? likes + 1;
      const likedPosts = getLikedPosts();
      const nextLikedPosts = likedPosts.includes(commentKey)
        ? likedPosts
        : [...likedPosts, commentKey];

      writeLikedPosts(nextLikedPosts);

      startTransition(() => {
        onLiked(nextLikes);
      });
    } catch {
      // Keep the current UI if the like request fails transiently.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={likeComment}
      disabled={liked || isSubmitting}
      aria-pressed={liked}
      aria-label={
        liked
          ? "Ya te gusta este comentario"
          : "Dar me gusta a este comentario"
      }
      className="inline-flex items-center gap-1.5 rounded-full border border-[#d6d1c8] bg-[#fffdf8] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#b93c3c] transition hover:border-[#b93c3c] hover:text-[#8f1f1f] disabled:cursor-not-allowed disabled:opacity-100"
    >
      {likes > 0 && <span>{likes.toLocaleString()}</span>}
      <Heart
        size={14}
        strokeWidth={2.4}
        fill={liked ? "currentColor" : "none"}
      />
    </button>
  );
}

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function isAdmin() {
    const normalizedUserEmail = normalizeEmail(user?.email);

    return Boolean(
      normalizedUserEmail &&
        ADMIN_EMAILS.has(normalizedUserEmail),
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

    const nextComments = (data as CommentRecord[]) || [];

    setComments(nextComments);
    void loadCommentLikes(nextComments);
  }

  async function loadCommentLikes(nextComments: CommentRecord[]) {
    const slugs = nextComments.map((comment) => getCommentLikeKey(comment.id));

    if (slugs.length === 0) {
      setCommentLikes({});
      return;
    }

    try {
      const response = await fetch("/api/likes", {
        body: JSON.stringify({ slugs }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("comment_likes_failed");
      }

      const data = (await response.json()) as {
        likes?: Record<string, number>;
      };

      setCommentLikes(data.likes ?? {});
    } catch {
      setCommentLikes(
        Object.fromEntries(slugs.map((commentKey) => [commentKey, 0])),
      );
    }
  }

  function updateCommentLike(commentId: CommentId, likes: number) {
    const commentKey = getCommentLikeKey(commentId);

    setCommentLikes((currentLikes) => ({
      ...currentLikes,
      [commentKey]: likes,
    }));
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

        const nextComments = (data as CommentRecord[]) || [];

        setComments(nextComments);
        void loadCommentLikes(nextComments);
      });

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }

      setUser(getConfirmedSession(data.session ?? null)?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isActive) {
          setUser(getConfirmedSession(session ?? null)?.user ?? null);
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

  function insertCommentSmilie(token: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setText((currentText) => `${currentText}${token}`);
      return;
    }

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${token}${text.slice(end)}`;
    const nextCursorPosition = start + token.length;

    setText(nextText);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
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
    if (!user?.email) {
      return false;
    }

    if (isAdmin()) {
      return true;
    }

    return normalizeEmail(comment.email) === normalizeEmail(user.email);
  }

  function canEditComment(comment: CommentRecord) {
    if (isAdmin()) {
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
    const commentLikeKey = getCommentLikeKey(comment.id);

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
              <CommentLikeButton
                commentKey={commentLikeKey}
                likes={commentLikes[commentLikeKey] ?? 0}
                onLiked={(likes) => updateCommentLike(comment.id, likes)}
              />

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

          <p
            className="mt-5 text-[1.03rem] leading-8 text-[#222] whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: renderCommentSmiliesToHtml(comment.content),
            }}
          />

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
                : "Puedes comentar con tu email o entrar con tu cuenta."}
            </p>
          </div>

          {!user ? (
            <AuthPanel
              compact
              embedded
              className="w-full sm:max-w-sm"
              description="Entra con tu cuenta para comentar como usuario, o escribe tu email para comentar como invitado."
            />
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
            ref={textareaRef}
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

          <div className="mt-3 max-h-40 overflow-y-auto rounded-[1rem] border border-[#d6d1c8] bg-[#fffdf8] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] sm:max-h-52">
            <CommentSmilieBar onPick={insertCommentSmilie} />
          </div>

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
