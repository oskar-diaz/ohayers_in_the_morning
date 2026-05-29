"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Heart,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ChangeEvent,
  FormEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  getLikedPosts,
  useLikedPost,
  writeLikedPosts,
} from "@/app/components/likedPostsStore";
import PostShareButtons from "@/app/components/PostShareButtons";
import { ADMIN_EMAILS, normalizeEmail } from "@/lib/admin";
import { getCurrentAuthUrl, rememberAuthReturnTo } from "@/lib/auth-redirect";
import {
  FORUM_SMILIE_MAP,
  FORUM_SMILIE_PATTERN,
  FORUM_SMILIES,
  ForumCategory,
  ForumPost,
  ForumPostNode,
  ForumProfile,
  ForumTopic,
  buildForumPostTree,
  formatForumDate,
  getForumCategoryFromTopic,
  getForumInitials,
  getForumUserAvatarUrl,
  getForumUserName,
  slugifyForumValue,
} from "@/lib/forum";
import { siteUrl } from "@/lib/site";
import { supabase } from "@/lib/supabase";

type ForumClientProps = {
  categorySlug?: string;
  profileOnly?: boolean;
  topicSlug?: string;
};

type ForumCategorySummary = ForumCategory & {
  latestTopic: ForumTopic | null;
  latestTopics: ForumTopic[];
  postCount: number;
  threadCount: number;
  topicCount: number;
};

type ForumTopicPreview = {
  content: string;
  thumbnailUrl: string | null;
};

type ForumTopicMetrics = {
  likes: number;
  views: number;
};

type ForumTextAlign = "left" | "center" | "right";

type ProfileFormState = {
  bio: string;
  displayName: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    forumTextAlign: {
      setForumTextAlign: (alignment: ForumTextAlign) => ReturnType;
    };
  }
}

const ALLOWED_FORUM_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "div",
  "em",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "s",
  "strong",
  "u",
  "ul",
]);
const FORUM_IMAGE_BUCKET = "forum-images";
const FORUM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const FORUM_IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const FORUM_TEXT_ALIGNMENTS = new Set<ForumTextAlign>([
  "left",
  "center",
  "right",
]);
const FORUM_TEXT_ALIGN_TAGS = new Set(["blockquote", "div", "li", "p"]);
const FORUM_URL_PATTERN = /https?:\/\/[^\s<]+/g;
const EMPTY_FORUM_TOPIC_METRICS: ForumTopicMetrics = {
  likes: 0,
  views: 0,
};

function isForumTextAlign(value: unknown): value is ForumTextAlign {
  return (
    typeof value === "string" &&
    FORUM_TEXT_ALIGNMENTS.has(value as ForumTextAlign)
  );
}

function getForumCategoryMetricKey(categoryId: number) {
  return `forum-category-${categoryId}`;
}

function getForumPostMetricKey(postId: number) {
  return `forum-post-${postId}`;
}

function getForumTopicMetricKey(topicId: number) {
  return `forum-topic-${topicId}`;
}

function getForumShareUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

function getForumMetricCount(
  metrics: Record<string, number> | undefined,
  key: string,
) {
  const value = metrics?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isGoogleUser(user: User | null) {
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

function getTopicCategory(
  topic: ForumTopic,
  categories: ForumCategorySummary[],
) {
  return (
    categories.find((category) => category.id === topic.category_id) ??
    getForumCategoryFromTopic(topic) ??
    null
  );
}

function getTopicUrl(topic: ForumTopic, categories: ForumCategorySummary[]) {
  const category = getTopicCategory(topic, categories);

  return category ? `/forum/${category.slug}/${topic.slug}` : "/forum";
}

function getForumCategoryLatestTopicTime(category: ForumCategorySummary) {
  const value = category.latestTopic?.last_post_at;
  const time = value ? Date.parse(value) : 0;

  return Number.isNaN(time) ? 0 : time;
}

function getForumIndexCategories(categories: ForumCategorySummary[]) {
  return [...categories].sort((firstCategory, secondCategory) => {
    const firstTime = getForumCategoryLatestTopicTime(firstCategory);
    const secondTime = getForumCategoryLatestTopicTime(secondCategory);

    if (firstTime !== secondTime) {
      return secondTime - firstTime;
    }

    if (firstCategory.topicCount !== secondCategory.topicCount) {
      return secondCategory.topicCount - firstCategory.topicCount;
    }

    return firstCategory.title.localeCompare(secondCategory.title, "es");
  });
}

function getPlainExcerpt(value: string) {
  return getForumContentText(value).replace(/\s+/g, " ").trim().slice(0, 220);
}

function getForumPreviewText(value: string) {
  const text = getForumContentText(value).replace(/\s+/g, " ").trim();

  return text.length > 180 ? `${text.slice(0, 177).trim()}...` : text;
}

function formatForumCount(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function getSupabaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "";
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : "";
}

function getForumTagAttribute(tag: string, name: string) {
  const pattern = new RegExp(
    `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);

  return decodeForumHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function getForumTextAlignAttribute(tag: string) {
  const style = getForumTagAttribute(tag, "style");
  const alignment = style
    .match(/(?:^|;)\s*text-align\s*:\s*(left|center|right)\s*(?:;|$)/i)?.[1]
    ?.toLowerCase();

  return isForumTextAlign(alignment) ? ` style="text-align: ${alignment}"` : "";
}

function escapeForumHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeForumHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function escapeForumAttribute(value: string) {
  return escapeForumHtml(value).replace(/`/g, "&#96;");
}

function normalizeForumUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const url = new URL(withProtocol);

    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function normalizeForumImageUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^\/(?!\/)/.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    if (
      !url.pathname.startsWith(
        `/storage/v1/object/public/${FORUM_IMAGE_BUCKET}/`,
      )
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function getForumContentThumbnailUrl(value: string) {
  for (const match of value.matchAll(/<img\b[^>]*>/gi)) {
    const src = normalizeForumImageUrl(getForumTagAttribute(match[0], "src"));

    if (src) {
      return src;
    }
  }

  return null;
}

function getForumImageExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["gif", "jpg", "jpeg", "png", "webp"].includes(extensionFromName)) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function getForumImagePath(userId: string, file: File) {
  const extension = getForumImageExtension(file);
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${userId}/${Date.now()}-${randomId}.${extension}`;
}

function hasForumMeaningfulContent(value: string) {
  return getForumContentText(value).length >= 2 || /<img\s/i.test(value);
}

function getForumLinkHtml(href: string, label: string) {
  const safeHref = normalizeForumUrl(href);

  if (!safeHref) {
    return escapeForumHtml(label);
  }

  return `<a href="${escapeForumAttribute(
    safeHref,
  )}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
}

const ForumImageExtension = Node.create({
  name: "forumImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      alt: {
        default: "",
      },
      src: {
        default: null,
      },
      title: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

const ForumTextAlignExtension = Extension.create<{
  types: string[];
}>({
  name: "forumTextAlign",

  addOptions() {
    return {
      types: ["paragraph", "blockquote"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              const alignment = element.style.textAlign.toLowerCase();

              return isForumTextAlign(alignment) ? alignment : null;
            },
            renderHTML: (attributes) => {
              const alignment = attributes.textAlign;

              return isForumTextAlign(alignment)
                ? { style: `text-align: ${alignment}` }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setForumTextAlign:
        (alignment) =>
        ({ commands }) => {
          if (!isForumTextAlign(alignment)) {
            return false;
          }

          return this.options.types
            .map((type) =>
              commands.updateAttributes(type, {
                textAlign: alignment,
              }),
            )
            .some(Boolean);
        },
    };
  },
});

function renderForumSmiliesToHtml(value: string) {
  return value.split(FORUM_SMILIE_PATTERN).map((part) => {
    const smilie = FORUM_SMILIE_MAP[part];

    if (smilie) {
      if (smilie.src) {
        return `<img src="${escapeForumAttribute(
          smilie.src,
        )}" alt="${escapeForumAttribute(
          smilie.label,
        )}" title="${escapeForumAttribute(
          part,
        )}" class="forum-smilie inline-block h-auto max-h-10 w-auto -translate-y-[2px] align-middle object-contain" />`;
      }

      return `<span class="inline-block -translate-y-px font-mono text-[0.92em]" aria-label="${escapeForumAttribute(
        part,
      )}">${escapeForumHtml(smilie.value)}</span>`;
    }

    return escapeForumHtml(part);
  }).join("");
}

function renderForumTextSegment(
  value: string,
  renderSmilies: boolean,
  linkify: boolean,
) {
  const decodedValue = decodeForumHtmlEntities(value);
  let output = "";
  let cursor = 0;

  for (const match of linkify ? decodedValue.matchAll(FORUM_URL_PATTERN) : []) {
    const index = match.index ?? 0;
    const textBeforeUrl = decodedValue.slice(cursor, index);
    const url = match[0];

    output += renderSmilies
      ? renderForumSmiliesToHtml(textBeforeUrl)
      : escapeForumHtml(textBeforeUrl);
    output += getForumLinkHtml(url, escapeForumHtml(url));
    cursor = index + url.length;
  }

  const rest = decodedValue.slice(cursor);

  output += renderSmilies ? renderForumSmiliesToHtml(rest) : escapeForumHtml(rest);

  return output.replace(/\n/g, "<br />");
}

function sanitizeForumHtml(value: string, renderSmilies: boolean) {
  let output = "";
  let cursor = 0;
  let anchorDepth = 0;
  const normalizedValue = value.replace(/\r\n?/g, "\n");

  for (const match of normalizedValue.matchAll(/<\/?[^>]+>/g)) {
    const tag = match[0];
    const index = match.index ?? 0;
    const textBeforeTag = normalizedValue.slice(cursor, index);

    output += renderForumTextSegment(
      textBeforeTag,
      renderSmilies && anchorDepth === 0,
      anchorDepth === 0,
    );
    cursor = index + tag.length;

    const tagMatch = tag.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);

    if (!tagMatch) {
      continue;
    }

    const isClosing = Boolean(tagMatch[1]);
    const tagName = tagMatch[2].toLowerCase();

    if (!ALLOWED_FORUM_TAGS.has(tagName)) {
      continue;
    }

    if (tagName === "img") {
      if (isClosing || anchorDepth > 0) {
        continue;
      }

      const src = normalizeForumImageUrl(getForumTagAttribute(tag, "src"));

      if (!src) {
        continue;
      }

      const alt = getForumTagAttribute(tag, "alt").slice(0, 160);
      const title = getForumTagAttribute(tag, "title").slice(0, 160);
      const titleAttribute = title
        ? ` title="${escapeForumAttribute(title)}"`
        : "";

      output += `<img src="${escapeForumAttribute(
        src,
      )}" alt="${escapeForumAttribute(
        alt,
      )}"${titleAttribute} loading="lazy" class="my-4 max-h-[520px] w-auto max-w-full rounded-xl border border-[#d6d1c8] object-contain" />`;
      continue;
    }

    if (tagName === "br") {
      output += "<br />";
      continue;
    }

    const normalizedTagName = tagName === "div" ? "p" : tagName;
    const textAlignAttribute =
      FORUM_TEXT_ALIGN_TAGS.has(tagName) ? getForumTextAlignAttribute(tag) : "";

    if (isClosing) {
      if (tagName === "a") {
        anchorDepth = Math.max(0, anchorDepth - 1);
      }

      output += `</${normalizedTagName}>`;
      continue;
    }

    if (tagName === "a") {
      const hrefMatch = tag.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = normalizeForumUrl(
        hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "",
      );

      if (!href) {
        continue;
      }

      anchorDepth += 1;
      output += `<a href="${escapeForumAttribute(
        href,
      )}" target="_blank" rel="noopener noreferrer nofollow">`;
      continue;
    }

    output += `<${normalizedTagName}${textAlignAttribute}>`;
  }

  output += renderForumTextSegment(
    normalizedValue.slice(cursor),
    renderSmilies && anchorDepth === 0,
    anchorDepth === 0,
  );

  return output.trim();
}

function sanitizeForumContentForStorage(value: string) {
  return sanitizeForumHtml(value, false);
}

function renderForumContentHtml(value: string) {
  return sanitizeForumHtml(value, true);
}

function renderForumPreviewHtml(value: string) {
  return renderForumTextSegment(getForumPreviewText(value), true, false);
}

function getForumContentText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function ForumAvatar({
  avatarUrl,
  label,
  size = "md",
}: {
  avatarUrl?: string | null;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClassName =
    size === "lg" ? "h-16 w-16 text-base" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClassName} shrink-0 rounded-full object-cover ring-1 ring-black/10`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/75 font-black text-[#111111]`}
    >
      {getForumInitials(label)}
    </div>
  );
}

function SmilieBar({ onPick }: { onPick: (value: string) => void }) {
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
            onClick={() => onPick(smilie.token)}
            className="inline-flex min-h-7 items-center justify-center border-0 bg-transparent p-0.5 text-left font-mono text-xs leading-none text-[#5f5952] transition hover:-translate-y-px hover:opacity-75"
          >
            {smilie.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={smilie.src}
                alt={smilie.label}
                className="h-auto max-h-10 w-auto object-contain"
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

function ForumMetricLikeButton({
  compact = false,
  likes,
  metricKey,
  onLiked,
  targetLabel = "este post",
}: {
  compact?: boolean;
  likes: number;
  metricKey: string;
  onLiked: (likes: number) => void;
  targetLabel?: string;
}) {
  const [isSubmittingLike, setIsSubmittingLike] = useState(false);
  const liked = useLikedPost(metricKey);

  async function likeMetric() {
    if (liked || isSubmittingLike) {
      return;
    }

    setIsSubmittingLike(true);

    try {
      const response = await fetch(`/api/likes/${encodeURIComponent(metricKey)}`, {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Forum metric like request failed");
      }

      const data = (await response.json()) as { likes?: number };
      const nextLikes = data.likes ?? likes + 1;
      const likedPosts = getLikedPosts();
      const nextLikedPosts = likedPosts.includes(metricKey)
        ? likedPosts
        : [...likedPosts, metricKey];

      writeLikedPosts(nextLikedPosts);

      startTransition(() => {
        onLiked(nextLikes);
      });
    } catch {
      // Ignore transient failures and keep the current UI state.
    } finally {
      setIsSubmittingLike(false);
    }
  }

  return (
    <button
      type="button"
      onClick={likeMetric}
      disabled={liked || isSubmittingLike}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#d6d1c8] bg-[#fffdf8] font-bold uppercase leading-none text-[#b93c3c] transition hover:border-[#b93c3c] hover:bg-white disabled:cursor-not-allowed disabled:opacity-100 ${
        compact
          ? "px-2.5 py-1.5 text-[0.68rem] tracking-[0.08em]"
          : "px-3 py-2 text-[0.74rem] tracking-[0.1em]"
      }`}
      aria-pressed={liked}
      aria-label={liked ? `Ya te gusta ${targetLabel}` : `Dar me gusta a ${targetLabel}`}
    >
      <Heart
        size={compact ? 14 : 15}
        strokeWidth={2.4}
        fill={liked ? "currentColor" : "none"}
      />
      <span>{likes.toLocaleString()}</span>
    </button>
  );
}

function RichTextEditor({
  onChange,
  placeholder,
  uploadOwnerId,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  uploadOwnerId?: string;
  value: string;
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUploadError, setImageUploadError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const editor = useEditor(
    {
      content: value || "",
      editorProps: {
        attributes: {
          class:
            "min-h-[170px] max-w-none outline-none",
        },
      },
      extensions: [
        StarterKit.configure({
          code: false,
          codeBlock: false,
          heading: false,
          horizontalRule: false,
          link: {
            autolink: true,
            defaultProtocol: "https",
            HTMLAttributes: {
              rel: "noopener noreferrer nofollow",
              target: "_blank",
            },
            openOnClick: false,
            protocols: ["http", "https", "mailto"],
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        ForumImageExtension,
        ForumTextAlignExtension,
      ],
      immediatelyRender: false,
      onUpdate: ({ editor: updatedEditor }) => {
        onChange(updatedEditor.getHTML());
      },
    },
    [onChange, placeholder],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentHtml = editor.getHTML();
    const nextValue = value || "";

    if (currentHtml !== nextValue) {
      editor.commands.setContent(nextValue, {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  function insertLink() {
    if (!editor) {
      return;
    }

    const currentHref = editor.getAttributes("link").href;
    const href = window.prompt(
      "URL",
      typeof currentHref === "string" ? currentHref : "",
    );

    if (href === null) {
      return;
    }

    const safeHref = normalizeForumUrl(href);

    if (!safeHref) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent(getForumLinkHtml(safeHref, escapeForumHtml(safeHref)))
        .run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: safeHref }).run();
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !editor || isUploadingImage) {
      return;
    }

    if (!uploadOwnerId) {
      setImageUploadError("Entra con Google para subir imágenes.");
      return;
    }

    if (!FORUM_IMAGE_MIME_TYPES.has(file.type)) {
      setImageUploadError("Solo se permiten imágenes JPG, PNG, WebP o GIF.");
      return;
    }

    if (file.size > FORUM_IMAGE_MAX_BYTES) {
      setImageUploadError("La imagen no puede pasar de 5 MB.");
      return;
    }

    setImageUploadError("");
    setIsUploadingImage(true);

    try {
      const imagePath = getForumImagePath(uploadOwnerId, file);
      const { error } = await supabase.storage
        .from(FORUM_IMAGE_BUCKET)
        .upload(imagePath, file, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from(FORUM_IMAGE_BUCKET)
        .getPublicUrl(imagePath);

      if (!data.publicUrl) {
        throw new Error("forum_image_public_url_missing");
      }

      const imageAlt = file.name.replace(/\.[^.]+$/, "").slice(0, 120);

      editor
        .chain()
        .focus()
        .insertContent(
          `<img src="${escapeForumAttribute(
            data.publicUrl,
          )}" alt="${escapeForumAttribute(
            imageAlt,
          )}" title="${escapeForumAttribute(imageAlt)}" />`,
        )
        .run();
    } catch (error) {
      console.error("Failed to upload forum image", error);
      setImageUploadError(
        "No he podido subir la imagen. Revisa el bucket forum-images en Supabase.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  }

  function insertPlainText(valueToInsert: string) {
    editor?.chain().focus().insertContent(valueToInsert).run();
  }

  function setTextAlignment(alignment: ForumTextAlign) {
    editor?.chain().focus().setForumTextAlign(alignment).run();
  }

  function isTextAlignmentActive(alignment: ForumTextAlign) {
    if (!editor) {
      return false;
    }

    if (alignment === "left") {
      return (
        editor.isActive({ textAlign: "left" }) ||
        (!editor.isActive({ textAlign: "center" }) &&
          !editor.isActive({ textAlign: "right" }))
      );
    }

    return editor.isActive({ textAlign: alignment });
  }

  const toolbarButtonClassName =
    "flex h-8 w-8 items-center justify-center rounded-full border border-[#d6d1c8] bg-[#fffdf8] text-[#111111] transition hover:bg-[#f5efe4] disabled:cursor-not-allowed disabled:opacity-40";
  const activeToolbarButtonClassName =
    "border-red-700 bg-[#fff3ed] text-red-700 shadow-[inset_0_0_0_1px_rgba(185,28,28,0.25)] hover:bg-[#ffe7dc]";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          title="Negrita"
          aria-label="Negrita"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("bold") ? activeToolbarButtonClassName : ""
          }`}
        >
          <Bold size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Cursiva"
          aria-label="Cursiva"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("italic") ? activeToolbarButtonClassName : ""
          }`}
        >
          <Italic size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Subrayar"
          aria-label="Subrayar"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("underline") ? activeToolbarButtonClassName : ""
          }`}
        >
          <Underline size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Tachar"
          aria-label="Tachar"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("strike") ? activeToolbarButtonClassName : ""
          }`}
        >
          <Strikethrough size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Enlace"
          aria-label="Enlace"
          disabled={!editor}
          onClick={insertLink}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("link") ? activeToolbarButtonClassName : ""
          }`}
        >
          <LinkIcon size={15} strokeWidth={2.4} />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/gif,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={uploadImage}
        />
        <button
          type="button"
          title="Imagen"
          aria-label="Imagen"
          disabled={!editor || isUploadingImage}
          onClick={() => imageInputRef.current?.click()}
          className={toolbarButtonClassName}
        >
          <ImageIcon size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Lista"
          aria-label="Lista"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("bulletList") ? activeToolbarButtonClassName : ""
          }`}
        >
          <List size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Lista numerada"
          aria-label="Lista numerada"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("orderedList") ? activeToolbarButtonClassName : ""
          }`}
        >
          <ListOrdered size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Cita"
          aria-label="Cita"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`${toolbarButtonClassName} ${
            editor?.isActive("blockquote") ? activeToolbarButtonClassName : ""
          }`}
        >
          <Quote size={15} strokeWidth={2.4} />
        </button>
        <span className="h-6 w-px bg-[#d6d1c8]" aria-hidden="true" />
        <button
          type="button"
          title="Alinear izquierda"
          aria-label="Alinear izquierda"
          aria-pressed={isTextAlignmentActive("left")}
          disabled={!editor}
          onClick={() => setTextAlignment("left")}
          className={`${toolbarButtonClassName} ${
            isTextAlignmentActive("left") ? activeToolbarButtonClassName : ""
          }`}
        >
          <AlignLeft size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Centrar"
          aria-label="Centrar"
          aria-pressed={isTextAlignmentActive("center")}
          disabled={!editor}
          onClick={() => setTextAlignment("center")}
          className={`${toolbarButtonClassName} ${
            isTextAlignmentActive("center") ? activeToolbarButtonClassName : ""
          }`}
        >
          <AlignCenter size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Alinear derecha"
          aria-label="Alinear derecha"
          aria-pressed={isTextAlignmentActive("right")}
          disabled={!editor}
          onClick={() => setTextAlignment("right")}
          className={`${toolbarButtonClassName} ${
            isTextAlignmentActive("right") ? activeToolbarButtonClassName : ""
          }`}
        >
          <AlignRight size={15} strokeWidth={2.4} />
        </button>
        <span className="h-6 w-px bg-[#d6d1c8]" aria-hidden="true" />
        <button
          type="button"
          title="Deshacer"
          aria-label="Deshacer"
          disabled={!editor}
          onClick={() => editor?.chain().focus().undo().run()}
          className={toolbarButtonClassName}
        >
          <Undo2 size={15} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Rehacer"
          aria-label="Rehacer"
          disabled={!editor}
          onClick={() => editor?.chain().focus().redo().run()}
          className={toolbarButtonClassName}
        >
          <Redo2 size={15} strokeWidth={2.4} />
        </button>
      </div>

      <div
        className="editorial-field min-h-[190px] cursor-text overflow-auto text-[1rem] leading-7 [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:font-bold [&_.ProseMirror_a]:text-red-700 [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-[#d6d1c8] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_img]:my-4 [&_.ProseMirror_img]:max-h-[380px] [&_.ProseMirror_img]:w-auto [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-xl [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-[#d6d1c8] [&_.ProseMirror_img]:object-contain [&_.ProseMirror_li]:ml-5 [&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#8b8379] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent
          editor={editor}
        />
      </div>

      {(isUploadingImage || imageUploadError) && (
        <p className="text-sm text-[#6a645c]">
          {isUploadingImage ? "Subiendo imagen..." : imageUploadError}
        </p>
      )}

      <SmilieBar onPick={insertPlainText} />
    </div>
  );
}

export default function ForumClient({
  categorySlug,
  profileOnly = false,
  topicSlug,
}: ForumClientProps) {
  const router = useRouter();
  const lastTrackedCategoryViewRef = useRef<string | null>(null);
  const lastTrackedPostViewsRef = useRef<Set<string>>(new Set());
  const lastTrackedTopicViewRef = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ForumProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    bio: "",
    displayName: "",
  });
  const [categories, setCategories] = useState<ForumCategorySummary[]>([]);
  const [currentCategory, setCurrentCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [forumMetrics, setForumMetrics] = useState<Record<string, ForumTopicMetrics>>({});
  const [topicPreviews, setTopicPreviews] = useState<Record<number, ForumTopicPreview>>({});
  const [currentTopic, setCurrentTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicContent, setNewTopicContent] = useState("");
  const [isTopicComposerOpen, setIsTopicComposerOpen] = useState(false);
  const [isCategoryComposerOpen, setIsCategoryComposerOpen] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#d93e3e");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyParent, setReplyParent] = useState<ForumPost | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");

  const user = session?.user ?? null;
  const isAdmin = Boolean(
    user?.email && ADMIN_EMAILS.has(normalizeEmail(user.email)) && isGoogleUser(user),
  );
  const postTree = useMemo(() => buildForumPostTree(posts), [posts]);
  const isTopicView = Boolean(categorySlug && topicSlug);
  const isCategoryView = Boolean(categorySlug && !topicSlug);
  const googleAvatarUrl = user ? getForumUserAvatarUrl(user) : null;
  const currentCategorySummary = currentCategory
    ? categories.find((category) => category.id === currentCategory.id) ?? null
    : null;
  const shouldShowCategorySidebar = isCategoryView || isTopicView;

  function canManageCategory(category: ForumCategory | null | undefined) {
    return Boolean(
      category &&
        user &&
        (isAdmin || category.author_id === user.id),
    );
  }

  function isTopicOpeningPost(post: ForumPost, depth: number) {
    return Boolean(
      currentTopic &&
        depth === 0 &&
        post.topic_id === currentTopic.id &&
        posts[0]?.id === post.id,
    );
  }

  function canEditForumPost(post: ForumPost, depth: number) {
    if (!user || post.hidden_at) {
      return false;
    }

    return (
      isAdmin ||
      post.author_id === user.id ||
      (isTopicOpeningPost(post, depth) && currentTopic?.author_id === user.id)
    );
  }

  function getForumMetrics(metricKey: string) {
    return forumMetrics[metricKey] ?? EMPTY_FORUM_TOPIC_METRICS;
  }

  function getCategoryOwnMetrics(categoryId: number) {
    return getForumMetrics(getForumCategoryMetricKey(categoryId));
  }

  function getPostMetrics(postId: number) {
    return getForumMetrics(getForumPostMetricKey(postId));
  }

  function getTopicMetrics(topicId: number) {
    return getForumMetrics(getForumTopicMetricKey(topicId));
  }

  function getCurrentTopicSharePath() {
    if (!currentTopic) {
      return "/forum";
    }

    const category = currentCategory ?? getForumCategoryFromTopic(currentTopic);

    return category
      ? `/forum/${category.slug}/${currentTopic.slug}`
      : "/forum";
  }

  function updateForumMetrics(metricKey: string, metrics: Partial<ForumTopicMetrics>) {
    setForumMetrics((currentMetrics) => ({
      ...currentMetrics,
      [metricKey]: {
        ...EMPTY_FORUM_TOPIC_METRICS,
        ...currentMetrics[metricKey],
        ...metrics,
      },
    }));
  }

  function updateCategoryMetrics(
    categoryId: number,
    metrics: Partial<ForumTopicMetrics>,
  ) {
    updateForumMetrics(getForumCategoryMetricKey(categoryId), metrics);
  }

  function updatePostMetrics(postId: number, metrics: Partial<ForumTopicMetrics>) {
    updateForumMetrics(getForumPostMetricKey(postId), metrics);
  }

  function updateTopicMetrics(topicId: number, metrics: Partial<ForumTopicMetrics>) {
    updateForumMetrics(getForumTopicMetricKey(topicId), metrics);
  }

  async function login() {
    rememberAuthReturnTo();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCurrentAuthUrl(),
      },
    });
  }

  async function ensureForumProfile(targetUser: User) {
    const googleAvatar = getForumUserAvatarUrl(targetUser);

    const { data: existingProfile, error: profileError } = await supabase
      .from("forum_profiles")
      .select("*")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (existingProfile) {
      if (existingProfile.avatar_url !== googleAvatar) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from("forum_profiles")
          .update({
            avatar_url: googleAvatar,
          })
          .eq("user_id", targetUser.id)
          .select("*")
          .single();

        if (updateError) {
          throw updateError;
        }

        return updatedProfile as ForumProfile;
      }

      return existingProfile as ForumProfile;
    }

    const fallbackProfile = {
      avatar_url: googleAvatar,
      bio: null,
      display_name: getForumUserName(targetUser),
      user_id: targetUser.id,
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("forum_profiles")
      .upsert(fallbackProfile, {
        onConflict: "user_id",
      })
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

    return createdProfile as ForumProfile;
  }

  async function loadProfile(targetUser: User) {
    const nextProfile = await ensureForumProfile(targetUser);

    setProfile(nextProfile);
    setProfileForm({
      bio: nextProfile.bio ?? "",
      displayName: nextProfile.display_name,
    });
  }

  async function loadTopicPreviews(nextTopics: ForumTopic[]) {
    const topicIds = nextTopics.map((topic) => topic.id);

    if (topicIds.length === 0) {
      setTopicPreviews({});
      return;
    }

    const { data, error } = await supabase
      .from("forum_posts")
      .select("topic_id, content")
      .in("topic_id", topicIds)
      .is("parent_id", null)
      .is("hidden_at", null)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const previews: Record<number, ForumTopicPreview> = {};

    for (const post of (data ?? []) as Pick<ForumPost, "content" | "topic_id">[]) {
      if (previews[post.topic_id]) {
        continue;
      }

      previews[post.topic_id] = {
        content: post.content,
        thumbnailUrl: getForumContentThumbnailUrl(post.content),
      };
    }

    setTopicPreviews(previews);
  }

  async function loadForumMetrics(metricKeys: string[]) {
    const uniqueMetricKeys = [...new Set(metricKeys)];

    if (uniqueMetricKeys.length === 0) {
      setForumMetrics({});
      return;
    }

    try {
      const response = await fetch("/api/forum/topic-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keys: uniqueMetricKeys,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Forum metrics request failed");
      }

      const data = (await response.json()) as {
        likes?: Record<string, number>;
        views?: Record<string, number>;
      };
      const nextMetrics = Object.fromEntries(
        uniqueMetricKeys.map((metricKey) => {
          return [
            metricKey,
            {
              likes: getForumMetricCount(data.likes, metricKey),
              views: getForumMetricCount(data.views, metricKey),
            },
          ];
        }),
      ) as Record<string, ForumTopicMetrics>;

      setForumMetrics((currentMetrics) => ({
        ...currentMetrics,
        ...nextMetrics,
      }));
    } catch (error) {
      console.error("Failed to load forum metrics", error);
      setForumMetrics((currentMetrics) => ({
        ...currentMetrics,
        ...Object.fromEntries(
          uniqueMetricKeys.map((metricKey) => [
            metricKey,
            EMPTY_FORUM_TOPIC_METRICS,
          ]),
        ),
      }));
    }
  }

  async function loadForumData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [categoriesResponse, topicsResponse] = await Promise.all([
        supabase
          .from("forum_categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          }),
        supabase
          .from("forum_topics")
          .select("*, forum_categories(*)")
          .is("hidden_at", null)
          .order("is_pinned", {
            ascending: false,
          })
          .order("last_post_at", {
            ascending: false,
          })
          .limit(100),
      ]);

      if (categoriesResponse.error) {
        throw categoriesResponse.error;
      }

      if (topicsResponse.error) {
        throw topicsResponse.error;
      }

      const nextCategories = (categoriesResponse.data ?? []) as ForumCategory[];
      const allTopics = (topicsResponse.data ?? []) as ForumTopic[];
      const summaries = nextCategories.map((category) => {
        const categoryTopics = allTopics
          .filter((topic) => topic.category_id === category.id)
          .sort((firstTopic, secondTopic) => {
            const firstTime = Date.parse(firstTopic.last_post_at);
            const secondTime = Date.parse(secondTopic.last_post_at);

            return (
              (Number.isNaN(secondTime) ? 0 : secondTime) -
              (Number.isNaN(firstTime) ? 0 : firstTime)
            );
          });

        return {
          ...category,
          latestTopic: categoryTopics[0] ?? null,
          latestTopics: categoryTopics.slice(0, 5),
          postCount: categoryTopics.reduce(
            (total, topic) => total + Number(topic.post_count ?? 0),
            0,
          ),
          threadCount: categoryTopics.reduce(
            (total, topic) => total + Number(topic.reply_count ?? 0),
            0,
          ),
          topicCount: categoryTopics.length,
        };
      });

      setCategories(summaries);
      const categoryMetricKeys = nextCategories.map((category) =>
        getForumCategoryMetricKey(category.id),
      );

      const nextCurrentCategory =
        categorySlug
          ? nextCategories.find((category) => category.slug === categorySlug) ?? null
          : null;

      setCurrentCategory(nextCurrentCategory);

      if (categorySlug && !nextCurrentCategory) {
        setTopics([]);
        setTopicPreviews({});
        setForumMetrics({});
        setCurrentTopic(null);
        setPosts([]);
        setErrorMessage("No he encontrado esta categoría del foro.");
        return;
      }

      if (topicSlug && nextCurrentCategory) {
        const { data: topicRow, error: topicError } = await supabase
          .from("forum_topics")
          .select("*, forum_categories(*)")
          .eq("category_id", nextCurrentCategory.id)
          .eq("slug", topicSlug)
          .maybeSingle();

        if (topicError) {
          throw topicError;
        }

        if (!topicRow) {
          setCurrentTopic(null);
          setPosts([]);
          setForumMetrics({});
          setErrorMessage("No he encontrado este post del foro.");
          return;
        }

        const nextTopic = topicRow as ForumTopic;
        const { data: postRows, error: postsError } = await supabase
          .from("forum_posts")
          .select("*")
          .eq("topic_id", nextTopic.id)
          .order("created_at", {
            ascending: true,
          });

        if (postsError) {
          throw postsError;
        }

        const nextPosts = (postRows ?? []) as ForumPost[];

        setCurrentTopic(nextTopic);
        setTopics([]);
        setTopicPreviews({});
        setPosts(nextPosts);
        setIsLoading(false);
        void loadForumMetrics([
          ...categoryMetricKeys,
          getForumTopicMetricKey(nextTopic.id),
          ...nextPosts.map((post) => getForumPostMetricKey(post.id)),
        ]);
        return;
      }

      setCurrentTopic(null);
      setPosts([]);
      const nextTopics = nextCurrentCategory
        ? allTopics.filter((topic) => topic.category_id === nextCurrentCategory.id)
        : allTopics.slice(0, 12);

      setTopics(nextTopics);
      setTopicPreviews({});
      setIsLoading(false);
      void loadForumMetrics([
        ...categoryMetricKeys,
        ...(nextCurrentCategory
          ? nextTopics.map((topic) => getForumTopicMetricKey(topic.id))
          : summaries.flatMap((category) =>
              category.latestTopics.map((topic) => getForumTopicMetricKey(topic.id)),
            )),
      ]);
      void loadTopicPreviews(nextTopics).catch((error) => {
        console.error("Failed to load forum topic previews", error);
      });
    } catch (error) {
      console.error("Failed to load forum", error);
      setErrorMessage(
        "No he podido cargar el foro. Revisa que hayas ejecutado `supabase/forum.sql`.",
      );
    } finally {
      setIsLoading(false);
    }
  }

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
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadForumData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, topicSlug]);

  useEffect(() => {
    if (!isCategoryView || !currentCategory) {
      return;
    }

    const categoryId = currentCategory.id;
    const metricKey = getForumCategoryMetricKey(categoryId);

    if (lastTrackedCategoryViewRef.current === metricKey) {
      return;
    }

    lastTrackedCategoryViewRef.current = metricKey;
    const controller = new AbortController();

    async function trackCategoryView() {
      try {
        const response = await fetch(`/api/views/${encodeURIComponent(metricKey)}`, {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { views?: number };
        const views = data.views;

        if (typeof views !== "number" || !Number.isFinite(views)) {
          return;
        }

        startTransition(() => {
          updateCategoryMetrics(categoryId, {
            views,
          });
        });
      } catch {
        // Ignore aborted or transient tracking failures and keep the loaded count.
      }
    }

    void trackCategoryView();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory?.id, isCategoryView]);

  useEffect(() => {
    if (!isTopicView || !currentTopic) {
      return;
    }

    const topicId = currentTopic.id;
    const metricKey = getForumTopicMetricKey(topicId);

    if (lastTrackedTopicViewRef.current === metricKey) {
      return;
    }

    lastTrackedTopicViewRef.current = metricKey;
    const controller = new AbortController();

    async function trackTopicView() {
      try {
        const response = await fetch(`/api/views/${encodeURIComponent(metricKey)}`, {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { views?: number };
        const views = data.views;

        if (typeof views !== "number" || !Number.isFinite(views)) {
          return;
        }

        startTransition(() => {
          updateTopicMetrics(topicId, {
            views,
          });
        });
      } catch {
        // Ignore aborted or transient tracking failures and keep the loaded count.
      }
    }

    void trackTopicView();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTopic?.id, isTopicView]);

  useEffect(() => {
    if (!isTopicView || posts.length === 0) {
      return;
    }

    const postsToTrack = posts
      .map((post) => ({
        id: post.id,
        metricKey: getForumPostMetricKey(post.id),
      }))
      .filter(({ metricKey }) => !lastTrackedPostViewsRef.current.has(metricKey));

    if (postsToTrack.length === 0) {
      return;
    }

    for (const { metricKey } of postsToTrack) {
      lastTrackedPostViewsRef.current.add(metricKey);
    }

    const controller = new AbortController();

    async function trackPostViews() {
      try {
        const response = await fetch("/api/forum/track-views", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keys: postsToTrack.map(({ metricKey }) => metricKey),
          }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          views?: Record<string, number>;
        };

        startTransition(() => {
          setForumMetrics((currentMetrics) => {
            const nextMetrics = {
              ...currentMetrics,
            };

            for (const { metricKey } of postsToTrack) {
              const views = getForumMetricCount(data.views, metricKey);

              nextMetrics[metricKey] = {
                ...EMPTY_FORUM_TOPIC_METRICS,
                ...currentMetrics[metricKey],
                views,
              };
            }

            return nextMetrics;
          });
        });
      } catch {
        // Ignore aborted or transient tracking failures and keep the loaded count.
      }
    }

    void trackPostViews();

    return () => {
      controller.abort();
    };
  }, [isTopicView, posts]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!user) {
        setProfile(null);
        setProfileForm({
          bio: "",
          displayName: "",
        });
        return;
      }

      loadProfile(user).catch((error) => {
        console.error("Failed to load forum profile", error);
        setErrorMessage(
          "No he podido cargar tu perfil del foro. Revisa que el SQL este aplicado.",
        );
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!isTopicComposerOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      document.getElementById("forum-post-composer")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isTopicComposerOpen]);

  useEffect(() => {
    if (!isCategoryComposerOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      document.getElementById("forum-category-composer")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCategoryComposerOpen]);

  function openTopicComposer() {
    if (!user) {
      void login();
      return;
    }

    setIsTopicComposerOpen(true);
  }

  async function submitTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || isSubmitting) {
      return;
    }

    const title = newTopicTitle.trim();
    const content = sanitizeForumContentForStorage(newTopicContent);
    const categoryId = currentCategory?.id ?? Number(selectedCategoryId);
    const category =
      categories.find((item) => item.id === categoryId) ??
      (currentCategory as ForumCategorySummary | null);

    if (!categoryId || !category) {
      setErrorMessage("Elige una categoría para el post.");
      return;
    }

    if (title.length < 4 || !hasForumMeaningfulContent(content)) {
      setErrorMessage("El título y el contenido necesitan un poco más de chicha.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const nextProfile = await ensureForumProfile(user);
      const nextAvatarUrl = getForumUserAvatarUrl(user);
      const topicSlugValue = `${slugifyForumValue(title)}-${Date.now().toString(36)}`;

      const { data: createdTopic, error: topicError } = await supabase
        .from("forum_topics")
        .insert({
          author_avatar_url: nextAvatarUrl,
          author_id: user.id,
          author_name: nextProfile.display_name,
          category_id: categoryId,
          excerpt: getPlainExcerpt(content),
          slug: topicSlugValue,
          title,
        })
        .select("*")
        .single();

      if (topicError) {
        throw topicError;
      }

      const topic = createdTopic as ForumTopic;
      const { error: postError } = await supabase.from("forum_posts").insert({
        author_avatar_url: nextAvatarUrl,
        author_id: user.id,
        author_name: nextProfile.display_name,
        content,
        parent_id: null,
        topic_id: topic.id,
      });

      if (postError) {
        throw postError;
      }

      setNewTopicTitle("");
      setNewTopicContent("");
      setIsTopicComposerOpen(false);
      router.push(`/forum/${category.slug}/${topic.slug}`);
    } catch (error) {
      console.error("Failed to create forum topic", error);
      setErrorMessage("No he podido crear el post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeCategoryComposer() {
    setEditingCategoryId(null);
    setNewCategoryTitle("");
    setNewCategoryDescription("");
    setNewCategoryColor("#d93e3e");
    setIsCategoryComposerOpen(false);
  }

  function openCategoryCreate() {
    if (!user) {
      return;
    }

    setEditingCategoryId(null);
    setNewCategoryTitle("");
    setNewCategoryDescription("");
    setNewCategoryColor("#d93e3e");
    setIsCategoryComposerOpen(true);
  }

  function openCategoryEdit(category: ForumCategorySummary) {
    if (!canManageCategory(category)) {
      return;
    }

    setEditingCategoryId(category.id);
    setNewCategoryTitle(category.title);
    setNewCategoryDescription(category.description ?? "");
    setNewCategoryColor(category.color);
    setIsCategoryComposerOpen(true);
  }

  function applyCategoryUpdate(updatedCategory: ForumCategory) {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === updatedCategory.id
          ? {
              ...category,
              ...updatedCategory,
            }
          : category,
      ),
    );
    setCurrentCategory((category) =>
      category?.id === updatedCategory.id
        ? {
            ...category,
            ...updatedCategory,
          }
        : category,
    );
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || isSubmitting) {
      return;
    }

    const title = newCategoryTitle.trim();
    const description = newCategoryDescription.trim();

    if (title.length < 2) {
      setErrorMessage("La categoría necesita un nombre un poco más claro.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      if (editingCategoryId) {
        const editingCategory = categories.find(
          (category) => category.id === editingCategoryId,
        );

        if (!canManageCategory(editingCategory)) {
          throw new Error("forum_category_update_blocked");
        }

        const { data, error } = await supabase
          .from("forum_categories")
          .update({
            color: newCategoryColor,
            description: description || null,
            title,
          })
          .eq("id", editingCategoryId)
          .select("*")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("forum_category_update_blocked");
        }

        applyCategoryUpdate(data as ForumCategory);
        closeCategoryComposer();
        setNoticeMessage("Categoría guardada.");
        return;
      }

      const categorySlugValue = `${slugifyForumValue(title)}-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("forum_categories")
        .insert({
          author_id: user.id,
          color: newCategoryColor,
          description: description || null,
          is_active: true,
          slug: categorySlugValue,
          sort_order: 1000,
          title,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const category = data as ForumCategory;

      closeCategoryComposer();
      await loadForumData();
      router.push(`/forum/${category.slug}`);
    } catch (error) {
      console.error("Failed to save forum category", error);
      const supabaseErrorCode = getSupabaseErrorCode(error);
      const isBlockedCategoryUpdate =
        error instanceof Error &&
        error.message === "forum_category_update_blocked";
      const isMissingCategoryOwnerColumn = supabaseErrorCode === "PGRST204";

      setErrorMessage(
        isMissingCategoryOwnerColumn
          ? "Falta la columna author_id en forum_categories. Ejecuta el SQL de ownership del foro en Supabase."
          : editingCategoryId
          ? isBlockedCategoryUpdate
            ? "Supabase no ha actualizado la categoría. Revisa la policy RLS de forum_categories."
            : "No he podido guardar la categoría."
          : "No he podido crear la categoría.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteCategory(category: ForumCategorySummary) {
    if (!canManageCategory(category)) {
      return;
    }

    const confirmed = window.confirm(
      `¿Borrar la categoría "${category.title}" y todos sus posts?`,
    );

    if (!confirmed) {
      return;
    }

    setActiveAction(`category-delete-${category.id}`);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const { data, error } = await supabase
        .from("forum_categories")
        .delete()
        .eq("id", category.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("forum_category_delete_blocked");
      }

      setCategories((currentCategories) =>
        currentCategories.filter((item) => item.id !== category.id),
      );
      setTopics((currentTopics) =>
        currentTopics.filter((topic) => topic.category_id !== category.id),
      );
      setNoticeMessage("Categoría borrada.");

      if (currentCategory?.id === category.id) {
        router.push("/forum");
      }
    } catch (error) {
      console.error("Failed to delete forum category", error);
      setErrorMessage("No he podido borrar la categoría.");
    } finally {
      setActiveAction("");
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !currentTopic || isSubmitting) {
      return;
    }

    const content = sanitizeForumContentForStorage(replyContent);

    if (!hasForumMeaningfulContent(content)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const nextProfile = await ensureForumProfile(user);
      const defaultReplyParent = postTree[0] ?? null;
      const replyTarget = replyParent ?? defaultReplyParent;
      const { error } = await supabase.from("forum_posts").insert({
        author_avatar_url: getForumUserAvatarUrl(user),
        author_id: user.id,
        author_name: nextProfile.display_name,
        content,
        parent_id: replyTarget?.id ?? null,
        topic_id: currentTopic.id,
      });

      if (error) {
        throw error;
      }

      setReplyContent("");
      setReplyParent(null);
      await loadForumData();
    } catch (error) {
      console.error("Failed to post forum reply", error);
      setErrorMessage("No he podido publicar la respuesta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || isSubmitting) {
      return;
    }

    const displayName = profileForm.displayName.trim();

    if (displayName.length < 2) {
      setErrorMessage("El nombre necesita al menos 2 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const { data, error } = await supabase
        .from("forum_profiles")
        .upsert(
          {
            avatar_url: googleAvatarUrl,
            bio: profileForm.bio.trim() || null,
            display_name: displayName,
            user_id: user.id,
          },
          {
            onConflict: "user_id",
          },
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setProfile(data as ForumProfile);
      setNoticeMessage("Perfil guardado.");
    } catch (error) {
      console.error("Failed to save forum profile", error);
      setErrorMessage("No he podido guardar el perfil.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateTopicModeration(values: Partial<ForumTopic>) {
    if (!isAdmin || !currentTopic || !user) {
      return;
    }

    setActiveAction("topic");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("forum_topics")
        .update(values)
        .eq("id", currentTopic.id);

      if (error) {
        throw error;
      }

      if (values.hidden_at) {
        const category = currentCategory ?? getForumCategoryFromTopic(currentTopic);
        router.push(category ? `/forum/${category.slug}` : "/forum");
        return;
      }

      await loadForumData();
    } catch (error) {
      console.error("Failed to moderate forum topic", error);
      setErrorMessage("No he podido moderar este post.");
    } finally {
      setActiveAction("");
    }
  }

  async function updatePostModeration(post: ForumPost, hidden: boolean) {
    if (!isAdmin || !user) {
      return;
    }

    setActiveAction(`post-${post.id}`);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("forum_posts")
        .update({
          hidden_at: hidden ? new Date().toISOString() : null,
          hidden_by: hidden ? user.id : null,
        })
        .eq("id", post.id);

      if (error) {
        throw error;
      }

      await loadForumData();
    } catch (error) {
      console.error("Failed to moderate forum post", error);
      setErrorMessage("No he podido moderar esta respuesta.");
    } finally {
      setActiveAction("");
    }
  }

  async function deleteCurrentTopic() {
    if (!isAdmin || !user || !currentTopic) {
      return;
    }

    const confirmed = window.confirm(
      "¿Borrar este post y todas sus respuestas?",
    );

    if (!confirmed) {
      return;
    }

    const category = currentCategory ?? getForumCategoryFromTopic(currentTopic);
    const deleteQuery = supabase
      .from("forum_topics")
      .delete()
      .eq("id", currentTopic.id);

    setActiveAction("delete-topic");
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const { error } = await deleteQuery;

      if (error) {
        throw error;
      }

      router.push(category ? `/forum/${category.slug}` : "/forum");
    } catch (error) {
      console.error("Failed to delete forum topic", error);
      setErrorMessage("No he podido borrar el post.");
    } finally {
      setActiveAction("");
    }
  }

  async function deletePost(post: ForumPost) {
    if (!user || (!isAdmin && post.author_id !== user.id)) {
      return;
    }

    const confirmed = window.confirm("¿Borrar esta respuesta?");

    if (!confirmed) {
      return;
    }

    let deleteQuery = supabase.from("forum_posts").delete().eq("id", post.id);

    if (!isAdmin) {
      deleteQuery = deleteQuery.eq("author_id", user.id);
    }

    setActiveAction(`delete-post-${post.id}`);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const { error } = await deleteQuery;

      if (error) {
        throw error;
      }

      if (editingPostId === post.id) {
        setEditingPostId(null);
        setEditingPostContent("");
        setEditingTopicTitle("");
      }

      setNoticeMessage("Respuesta borrada.");
      await loadForumData();
    } catch (error) {
      console.error("Failed to delete forum post", error);
      setErrorMessage("No he podido borrar la respuesta.");
    } finally {
      setActiveAction("");
    }
  }

  function startPostEdit(post: ForumPost, depth = 0) {
    setReplyParent(null);
    setEditingPostId(post.id);
    setEditingPostContent(sanitizeForumContentForStorage(post.content));
    setEditingTopicTitle(
      isTopicOpeningPost(post, depth) && currentTopic ? currentTopic.title : "",
    );
  }

  async function savePostEdit(post: ForumPost, depth = 0) {
    if (!user || !canEditForumPost(post, depth) || isSubmitting) {
      return;
    }

    const content = sanitizeForumContentForStorage(editingPostContent);
    const isTopicRootPost = isTopicOpeningPost(post, depth);
    const title = editingTopicTitle.trim();

    if (!hasForumMeaningfulContent(content)) {
      setErrorMessage("El contenido necesita un poco más de texto.");
      return;
    }

    if (isTopicRootPost && title.length < 4) {
      setErrorMessage("El título necesita un poco más de chicha.");
      return;
    }

    setActiveAction(`edit-${post.id}`);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      if (isTopicRootPost) {
        const topicId = currentTopic?.id;

        if (!topicId) {
          throw new Error("Missing forum topic while editing its opening post.");
        }

        let updateTopicQuery = supabase
          .from("forum_topics")
          .update({
            excerpt: getPlainExcerpt(content),
            title,
          })
          .eq("id", topicId);

        if (!isAdmin) {
          updateTopicQuery = updateTopicQuery.eq("author_id", user.id);
        }

        const { error: topicError } = await updateTopicQuery;

        if (topicError) {
          throw topicError;
        }
      }

      let updatePostQuery = supabase
        .from("forum_posts")
        .update({
          content,
        })
        .eq("id", post.id);

      if (!isAdmin && !isTopicRootPost) {
        updatePostQuery = updatePostQuery.eq("author_id", user.id);
      }

      const { error } = await updatePostQuery;

      if (error) {
        throw error;
      }

      setEditingPostId(null);
      setEditingPostContent("");
      setEditingTopicTitle("");
      setNoticeMessage("Cambios guardados.");
      await loadForumData();
    } catch (error) {
      console.error("Failed to edit forum post", error);
      setErrorMessage("No he podido guardar los cambios.");
    } finally {
      setActiveAction("");
    }
  }

  async function reportPost(post: ForumPost) {
    if (!user) {
      await login();
      return;
    }

    setActiveAction(`report-${post.id}`);
    setNoticeMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase.from("forum_post_reports").insert({
        post_id: post.id,
        reason: "Reportado desde la web",
        reporter_id: user.id,
      });

      if (error) {
        throw error;
      }

      setNoticeMessage("Reporte enviado. Gracias por echar una mano.");
    } catch {
      setNoticeMessage("Ya habías reportado este contenido o no se pudo enviar.");
    } finally {
      setActiveAction("");
    }
  }

  function renderTopicListItem(topic: ForumTopic) {
    const category = getTopicCategory(topic, categories);
    const topicUrl = getTopicUrl(topic, categories);
    const preview = topicPreviews[topic.id];
    const previewContent = preview?.content || topic.excerpt || "";
    const previewHtml = previewContent ? renderForumPreviewHtml(previewContent) : "";
    const thumbnailUrl = preview?.thumbnailUrl ?? null;
    const metrics = getTopicMetrics(topic.id);
    const metricKey = getForumTopicMetricKey(topic.id);

    return (
      <article
        key={topic.id}
        className="border-b border-[#d6d1c8] py-5 last:border-b-0"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
            {thumbnailUrl && (
              <Link
                href={topicUrl}
                className="block h-24 w-full shrink-0 overflow-hidden rounded-xl border border-[#d6d1c8] bg-[#ece8df] sm:w-32"
                aria-label={topic.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </Link>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#7a746b]">
                {topic.is_pinned && <span>Fijado</span>}
                {topic.is_locked && <span>Cerrado</span>}
                {category && (
                  <Link href={`/forum/${category.slug}`} className="hover:text-[#111111]">
                    {category.title}
                  </Link>
                )}
              </div>

              <Link
                href={topicUrl}
                className="mt-2 block newspaper-title text-[clamp(1.65rem,3vw,2.4rem)] font-black leading-[0.98] hover:opacity-70"
              >
                {topic.title}
              </Link>

              {previewHtml && (
                <div
                  className="mt-3 line-clamp-2 text-sm leading-6 text-[#5f5952] [&_.forum-smilie]:max-h-7"
                  dangerouslySetInnerHTML={{
                    __html: previewHtml,
                  }}
                />
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6a645c]">
                <span className="inline-flex min-w-0 items-center gap-3">
                  <ForumAvatar
                    avatarUrl={topic.author_avatar_url}
                    label={topic.author_name}
                    size="sm"
                  />
                  <span className="min-w-0 truncate">
                    {topic.author_name} · {formatForumDate(topic.last_post_at)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Eye size={15} strokeWidth={2.2} />
                  {metrics.views.toLocaleString()} vistas
                </span>
                <ForumMetricLikeButton
                  compact
                  metricKey={metricKey}
                  likes={metrics.likes}
                  targetLabel="este post"
                  onLiked={(likes) =>
                    updateTopicMetrics(topic.id, {
                      likes,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 text-center">
            <div className="rounded-xl border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2">
              <p className="text-lg font-black">{topic.reply_count}</p>
              <p className="text-[0.62rem] uppercase tracking-[0.14em] text-[#7a746b]">
                respuestas
              </p>
            </div>
          </div>
        </div>
      </article>
    );
  }

  function renderCategoryListItem(category: ForumCategorySummary) {
    const topicLabel = formatForumCount(category.topicCount, "post", "posts");
    const canManageCurrentCategory = canManageCategory(category);
    const isDeletingCategory = activeAction === `category-delete-${category.id}`;
    const metrics = getCategoryOwnMetrics(category.id);
    const metricKey = getForumCategoryMetricKey(category.id);

    return (
      <article
        key={category.id}
        className="editorial-card rounded-[1.6rem] px-5 py-5 transition hover:shadow-[0_16px_34px_rgba(17,17,17,0.08)] sm:px-6"
      >
        <div className="flex items-start justify-between gap-4">
          <Link href={`/forum/${category.slug}`} className="min-w-0 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: category.color }}
                />
                <h3 className="text-lg font-black leading-tight text-[#111111]">
                  {category.title}
                </h3>
              </div>
              {category.description && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5f5952]">
                  {category.description}
                </p>
              )}
            </div>
          </Link>

          <div className="flex shrink-0 items-start gap-2">
            <div className="shrink-0 rounded-xl border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2 text-center">
              <p className="text-lg font-black leading-none text-[#111111]">
                {category.topicCount}
              </p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-[#7a746b]">
                {category.topicCount === 1 ? "post" : "posts"}
              </p>
            </div>

            {canManageCurrentCategory && (
              <div className="flex flex-col gap-1 sm:flex-row">
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={() => openCategoryEdit(category)}
                  className="editorial-link-button !px-2.5 !py-1 !text-[0.62rem] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={() => void deleteCategory(category)}
                  className="editorial-link-button !px-2.5 !py-1 !text-[0.62rem] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6a645c]">
          <span>{topicLabel}</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Eye size={15} strokeWidth={2.2} />
            {metrics.views.toLocaleString()} vistas
          </span>
          <ForumMetricLikeButton
            compact
            metricKey={metricKey}
            likes={metrics.likes}
            targetLabel={`la categoría ${category.title}`}
            onLiked={(likes) =>
              updateCategoryMetrics(category.id, {
                likes,
              })
            }
          />
        </div>
        {category.latestTopics.length > 0 && (
          <div className="mt-5 border-t border-[#d6d1c8] pt-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#7a746b]">
              Últimos posts
            </p>
            <div className="mt-3 space-y-2">
              {category.latestTopics.map((topic) => {
                const topicMetrics = getTopicMetrics(topic.id);

                return (
                  <Link
                    key={topic.id}
                    href={getTopicUrl(topic, categories)}
                    className="block rounded-xl px-2 py-1.5 transition hover:bg-[#f5efe4]"
                  >
                    <span className="block text-sm font-bold leading-5 text-[#111111] transition hover:text-red-700">
                      {topic.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-semibold text-[#6a645c]">
                      <span>
                        {formatForumCount(
                          topic.reply_count,
                          "respuesta",
                          "respuestas",
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye size={13} strokeWidth={2.2} />
                        {topicMetrics.views.toLocaleString()} vistas
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart size={13} strokeWidth={2.2} />
                        {topicMetrics.likes.toLocaleString()} likes
                      </span>
                      <span>actualizado {formatForumDate(topic.last_post_at)}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <PostShareButtons
          title={`Foro: ${category.title}`}
          url={getForumShareUrl(`/forum/${category.slug}`)}
          className="mt-4"
        />
      </article>
    );
  }

  function renderTopicComposer() {
    if (categories.length === 0) {
      return null;
    }

    return (
      <section
        id="forum-post-composer"
        className="editorial-card scroll-mt-24 rounded-[2rem] px-5 py-6 sm:px-7"
      >
        {!user ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-[#5f5952]">
              Entra con Google para publicar en el foro.
            </p>
            <button type="button" onClick={login} className="editorial-cta">
              Login con Google
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-[#111111]">
                Escribir post
              </h2>
              <button
                type="button"
                onClick={() => setIsTopicComposerOpen(false)}
                className="editorial-link-button"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={submitTopic} className="mt-6 space-y-4">
              {!currentCategory && (
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="editorial-field"
                  required
                >
                  <option value="">Categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              )}

              <input
                value={newTopicTitle}
                onChange={(event) => setNewTopicTitle(event.target.value)}
                placeholder="Título del post"
                className="editorial-field"
                maxLength={140}
                required
              />

              <RichTextEditor
                value={newTopicContent}
                onChange={setNewTopicContent}
                placeholder="Contenido del post..."
                uploadOwnerId={user.id}
              />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="editorial-cta editorial-cta-dark"
                >
                  {isSubmitting ? "Publicando..." : "Publicar post"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    );
  }

  function renderCategoryComposer() {
    if (!user) {
      return null;
    }

    const isEditingCategory = Boolean(editingCategoryId);

    return (
      <section
        id="forum-category-composer"
        className="editorial-card scroll-mt-24 rounded-[2rem] px-5 py-6 sm:px-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#111111]">
            {isEditingCategory ? "Editar categoría" : "Añadir categoría"}
          </h2>
          <button
            type="button"
            onClick={closeCategoryComposer}
            className="editorial-link-button"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={submitCategory} className="mt-6 space-y-4">
          <input
            value={newCategoryTitle}
            onChange={(event) => setNewCategoryTitle(event.target.value)}
            placeholder="Nombre de categoría"
            className="editorial-field"
            maxLength={60}
            required
          />
          <textarea
            value={newCategoryDescription}
            onChange={(event) => setNewCategoryDescription(event.target.value)}
            placeholder="Descripcion breve"
            className="editorial-field min-h-[110px] resize-y"
            maxLength={180}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a746b]">
              <span>Color</span>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(event) => setNewCategoryColor(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-[#d6d1c8] bg-transparent"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="editorial-cta editorial-cta-dark"
            >
              {isSubmitting
                ? isEditingCategory
                  ? "Guardando..."
                  : "Creando..."
                : isEditingCategory
                  ? "Guardar categoría"
                  : "Crear categoría"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderPost(post: ForumPostNode, depth = 0): React.ReactNode {
    const isHidden = Boolean(post.hidden_at);
    const canReply = Boolean(user && currentTopic && !currentTopic.is_locked && !isHidden);
    const isOwnPost = user?.id === post.author_id;
    const isEditingPost = editingPostId === post.id;
    const canEditPost = canEditForumPost(post, depth);
    const canShowPostMetrics = !isHidden || isAdmin;
    const canDeletePost = Boolean(
      depth > 0 &&
        user &&
        !isEditingPost &&
        (isOwnPost || isAdmin),
    );
    const metrics = getPostMetrics(post.id);
    const metricKey = getForumPostMetricKey(post.id);

    return (
      <div
        key={post.id}
        className={depth > 0 ? "ml-4 mt-5 border-l border-[#d6d1c8] pl-4 sm:ml-8 sm:pl-6" : ""}
      >
        <article
          id={`forum-post-${post.id}`}
          className={`scroll-mt-24 rounded-[1.75rem] border px-5 py-5 shadow-[0_14px_32px_rgba(17,17,17,0.05)] sm:px-7 ${
            isHidden
              ? "border-[#d6d1c8] bg-[#ece8df]/80"
              : "border-[#d6d1c8] bg-[#fffdf8]"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <ForumAvatar
                avatarUrl={post.author_avatar_url}
                label={post.author_name}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-[1.02rem] font-semibold">
                  {post.author_name}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#7a746b]">
                  {formatForumDate(post.created_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {canReply && (
                <button
                  type="button"
                  onClick={() => setReplyParent(post)}
                  className="editorial-link-button"
                >
                  Responder
                </button>
              )}

              {canEditPost && !isEditingPost && (
                <button
                  type="button"
                  onClick={() => startPostEdit(post, depth)}
                  className="editorial-link-button"
                >
                  Editar
                </button>
              )}

              {user && !isOwnPost && !isHidden && (
                <button
                  type="button"
                  onClick={() => void reportPost(post)}
                  disabled={activeAction === `report-${post.id}`}
                  className="editorial-link-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reportar
                </button>
              )}

              {canDeletePost && (
                <button
                  type="button"
                  onClick={() => void deletePost(post)}
                  disabled={activeAction === `delete-post-${post.id}`}
                  className="editorial-link-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Borrar
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void updatePostModeration(post, !isHidden)}
                  disabled={activeAction === `post-${post.id}`}
                  className="editorial-link-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isHidden ? "Restaurar" : "Ocultar"}
                </button>
              )}
            </div>
          </div>

          {canShowPostMetrics && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6a645c]">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Eye size={15} strokeWidth={2.2} />
                {metrics.views.toLocaleString()} vistas
              </span>
              <ForumMetricLikeButton
                compact
                metricKey={metricKey}
                likes={metrics.likes}
                targetLabel={depth === 0 ? "este post" : "esta respuesta"}
                onLiked={(likes) =>
                  updatePostMetrics(post.id, {
                    likes,
                  })
                }
              />
            </div>
          )}

          {isHidden && !isAdmin ? (
            <p className="mt-5 text-sm italic text-[#6a645c]">
              Mensaje oculto por moderacion.
            </p>
          ) : isEditingPost ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void savePostEdit(post, depth);
              }}
              className="mt-5 space-y-4"
            >
              {isTopicOpeningPost(post, depth) && (
                <input
                  value={editingTopicTitle}
                  onChange={(event) => setEditingTopicTitle(event.target.value)}
                  placeholder="Título del post"
                  className="editorial-field"
                  maxLength={140}
                  required
                />
              )}

              <RichTextEditor
                value={editingPostContent}
                onChange={setEditingPostContent}
                placeholder={depth === 0 ? "Edita el post..." : "Edita la respuesta..."}
                uploadOwnerId={user?.id}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPostId(null);
                    setEditingPostContent("");
                    setEditingTopicTitle("");
                  }}
                  className="editorial-link-button"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activeAction === `edit-${post.id}`}
                  className="editorial-cta editorial-cta-dark"
                >
                  {activeAction === `edit-${post.id}` ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5">
              {isHidden && isAdmin && (
                <span className="mb-3 block text-sm font-bold uppercase tracking-[0.16em] text-red-700">
                  Oculto
                </span>
              )}
              <div
                className="break-words text-[1.03rem] leading-8 text-[#222] [&_a]:font-bold [&_a]:text-red-700 [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#d6d1c8] [&_blockquote]:pl-4 [&_li]:ml-5 [&_ol]:my-3 [&_ol]:list-decimal [&_p]:mb-3 [&_strong]:font-black [&_ul]:my-3 [&_ul]:list-disc"
                dangerouslySetInnerHTML={{
                  __html: renderForumContentHtml(post.content),
                }}
              />
            </div>
          )}
        </article>

        {post.replies.length > 0 && (
          <div className="mt-5">
            {post.replies.map((reply) => renderPost(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  function renderProfileView() {
    return (
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link href="/forum" className="editorial-link-button">
            Volver al foro
          </Link>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">
            Perfil
          </h1>
        </div>

        {!user ? (
          <div className="editorial-card rounded-[2rem] px-6 py-8 text-center">
            <p className="text-lg text-[#4f4a44]">
              Entra con Google para crear tu perfil del foro.
            </p>
            <button type="button" onClick={login} className="editorial-cta mt-6">
              Login con Google
            </button>
          </div>
        ) : (
          <form
            onSubmit={saveProfile}
            className="editorial-card rounded-[2rem] px-6 py-7 sm:px-8"
          >
            <div className="flex items-center gap-4">
              <ForumAvatar
                avatarUrl={googleAvatarUrl}
                label={profileForm.displayName || getForumUserName(user)}
                size="lg"
              />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#7a746b]">
                  Google
                </p>
                <p className="mt-1 text-sm text-[#6a645c]">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <input
                value={profileForm.displayName}
                onChange={(event) =>
                  setProfileForm((currentValue) => ({
                    ...currentValue,
                    displayName: event.target.value,
                  }))
                }
                placeholder="Nombre visible"
                className="editorial-field"
                maxLength={80}
                required
              />
              <textarea
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm((currentValue) => ({
                    ...currentValue,
                    bio: event.target.value,
                  }))
                }
                placeholder="Bio breve"
                className="editorial-field min-h-[120px] resize-y"
                maxLength={280}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="editorial-cta editorial-cta-dark"
              >
                {isSubmitting ? "Guardando..." : "Guardar perfil"}
              </button>
            </div>

            {profile && (
              <p className="mt-5 text-sm text-[#6a645c]">
                Perfil activo desde {formatForumDate(profile.created_at)}.
              </p>
            )}
          </form>
        )}
      </section>
    );
  }

  function renderForumHeader() {
    return (
      <section className="border-b border-[#d6d1c8] bg-[#fffdf8]">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-red-700">
                Comunidad
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                Foro Ohayers
              </h1>
            </div>

            {!user && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={login} className="editorial-cta">
                  Login con Google
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function renderForumBreadcrumbs() {
    const category = currentCategory ?? getForumCategoryFromTopic(currentTopic);
    const crumbs = [
      {
        href: "/forum",
        label: "Foro",
      },
    ];

    if (category && (isCategoryView || isTopicView)) {
      crumbs.push({
        href: `/forum/${category.slug}`,
        label: category.title,
      });
    }

    if (currentTopic && isTopicView) {
      crumbs.push({
        href: "",
        label: currentTopic.title,
      });
    }

    return (
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#6a645c]"
      >
        {crumbs.map((crumb, index) => {
          const isLastCrumb = index === crumbs.length - 1;

          return (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 && <span className="text-[#aaa39a]">&gt;</span>}
              {isLastCrumb || !crumb.href ? (
                <span className="text-[#111111]">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-[#111111]">
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    );
  }

  if (profileOnly) {
    return (
      <>
        {renderForumHeader()}
        {renderStatusMessages()}
        {renderProfileView()}
      </>
    );
  }

  function renderStatusMessages() {
    if (!errorMessage && !noticeMessage) {
      return null;
    }

    return (
      <div className="mx-auto mt-6 max-w-7xl px-6">
        {errorMessage && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        {noticeMessage && (
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {noticeMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {renderForumHeader()}
      {renderStatusMessages()}

      <main
        className={`mx-auto grid min-h-[70vh] max-w-7xl gap-10 px-6 py-12 ${
          shouldShowCategorySidebar ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-1"
        }`}
      >
        <section className="min-w-0">
          {user && isCategoryComposerOpen && (
            <div className="mb-8">{renderCategoryComposer()}</div>
          )}

          {!isLoading && renderForumBreadcrumbs()}

          {isLoading ? (
            null
          ) : isTopicView && currentTopic ? (
            <>
              <div className="mb-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#7a746b]">
                      {currentTopic.is_pinned && <span>Fijado</span>}
                      {currentTopic.is_locked && <span>Cerrado</span>}
                      {currentCategory && <span>{currentCategory.title}</span>}
                    </div>
                    <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                      {currentTopic.title}
                    </h2>
                    <PostShareButtons
                      title={currentTopic.title}
                      url={getForumShareUrl(getCurrentTopicSharePath())}
                      className="mt-5"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6a645c]">
                      <span>{currentTopic.reply_count} respuestas</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Eye size={15} strokeWidth={2.2} />
                        {getTopicMetrics(currentTopic.id).views.toLocaleString()} vistas
                      </span>
                      <span>actualizado {formatForumDate(currentTopic.last_post_at)}</span>
                      <ForumMetricLikeButton
                        compact
                        metricKey={getForumTopicMetricKey(currentTopic.id)}
                        likes={getTopicMetrics(currentTopic.id).likes}
                        targetLabel="este post"
                        onLiked={(likes) =>
                          updateTopicMetrics(currentTopic.id, {
                            likes,
                          })
                        }
                      />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 flex-wrap items-center gap-1 sm:justify-end">
                      <button
                        type="button"
                        disabled={activeAction === "topic"}
                        onClick={() =>
                          void updateTopicModeration({
                            is_locked: !currentTopic.is_locked,
                          })
                        }
                        className="editorial-link-button !px-2.5 !py-1 !text-[0.62rem] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {currentTopic.is_locked ? "Abrir" : "Cerrar"}
                      </button>
                      <button
                        type="button"
                        disabled={activeAction === "topic"}
                        onClick={() =>
                          void updateTopicModeration({
                            hidden_at: new Date().toISOString(),
                            hidden_by: user?.id ?? null,
                          })
                        }
                        className="editorial-link-button !px-2.5 !py-1 !text-[0.62rem] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ocultar
                      </button>
                      <button
                        type="button"
                        disabled={activeAction === "delete-topic"}
                        onClick={() => void deleteCurrentTopic()}
                        className="editorial-link-button !px-2.5 !py-1 !text-[0.62rem] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {postTree.map((post) => renderPost(post))}
              </div>

              <section className="editorial-card mt-10 rounded-[2rem] px-5 py-6 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xl font-semibold newspaper-title">
                      {replyParent
                        ? `Respuesta para ${replyParent.author_name}`
                        : currentTopic.is_locked
                          ? "Post cerrado"
                          : "Responder"}
                    </p>
                    <p className="mt-2 text-sm text-[#6a645c]">
                      {user
                        ? `Escribiendo como ${profile?.display_name ?? getForumUserName(user)}`
                        : "Entra con Google para escribir una respuesta."}
                    </p>
                  </div>

                  {replyParent && (
                    <button
                      type="button"
                      onClick={() => setReplyParent(null)}
                      className="editorial-link-button"
                    >
                      Cancelar respuesta
                    </button>
                  )}
                </div>

                {!user ? (
                  <button type="button" onClick={login} className="editorial-cta mt-5">
                    Login con Google
                  </button>
                ) : currentTopic.is_locked && !isAdmin ? (
                  <p className="mt-5 text-sm text-[#6a645c]">
                    Este post está cerrado a nuevas respuestas.
                  </p>
                ) : (
                  <form onSubmit={submitReply} className="mt-6 space-y-4">
                    <RichTextEditor
                      value={replyContent}
                      onChange={setReplyContent}
                      placeholder="Escribe una respuesta..."
                      uploadOwnerId={user.id}
                    />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="editorial-cta editorial-cta-dark"
                      >
                        {isSubmitting ? "Publicando..." : "Publicar respuesta"}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </>
          ) : (
            <>
              {isCategoryView && currentCategory ? (
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black leading-tight sm:text-3xl">
                      {currentCategory.title}
                    </h2>
                    {currentCategory.description && (
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f5952] sm:text-base">
                        {currentCategory.description}
                      </p>
                    )}
                    {currentCategorySummary && (
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6a645c]">
                        <span>
                          {formatForumCount(
                            currentCategorySummary.topicCount,
                            "post",
                            "posts",
                          )}
                        </span>
                        <span>
                          {formatForumCount(
                            currentCategorySummary.threadCount,
                            "respuesta",
                            "respuestas",
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Eye size={15} strokeWidth={2.2} />
                          {getCategoryOwnMetrics(
                            currentCategory.id,
                          ).views.toLocaleString()} vistas
                        </span>
                        <ForumMetricLikeButton
                          compact
                          metricKey={getForumCategoryMetricKey(currentCategory.id)}
                          likes={getCategoryOwnMetrics(currentCategory.id).likes}
                          targetLabel={`la categoría ${currentCategory.title}`}
                          onLiked={(likes) =>
                            updateCategoryMetrics(currentCategory.id, {
                              likes,
                            })
                          }
                        />
                      </div>
                    )}
                    <PostShareButtons
                      title={`Foro: ${currentCategory.title}`}
                      url={getForumShareUrl(`/forum/${currentCategory.slug}`)}
                      className="mt-5"
                    />
                  </div>

                  {topics.length > 0 && (
                    <button
                      type="button"
                      onClick={openTopicComposer}
                      className="editorial-cta editorial-cta-dark self-start !px-4 !py-2 !text-[0.68rem]"
                    >
                      Crear post
                    </button>
                  )}
                </div>
              ) : (
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-black leading-tight sm:text-3xl">
                    Categorías
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    <PostShareButtons
                      title="Foro Ohayers"
                      url={getForumShareUrl("/forum")}
                      className="justify-start sm:justify-end"
                    />
                    {user && !isCategoryComposerOpen && (
                      <button
                        type="button"
                        onClick={openCategoryCreate}
                        className="editorial-link-button"
                      >
                        Añadir categoría
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isCategoryView && isTopicComposerOpen && (
                <div className="mb-8">{renderTopicComposer()}</div>
              )}

              {isCategoryView ? (
                <div className="editorial-card rounded-[2rem] px-5 py-4 sm:px-7">
                  {topics.length > 0 ? (
                    topics.map((topic) => renderTopicListItem(topic))
                  ) : (
                    <div className="py-8 text-center text-[#5f5952]">
                      <p>Todavía no hay posts por aquí.</p>
                      <button
                        type="button"
                        onClick={openTopicComposer}
                        className="editorial-cta editorial-cta-dark mt-5 !px-4 !py-2 !text-[0.68rem]"
                      >
                        Crear post
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {categories.length > 0 ? (
                    getForumIndexCategories(categories).map((category) =>
                      renderCategoryListItem(category),
                    )
                  ) : (
                    <div className="editorial-card rounded-[2rem] px-5 py-8 text-center text-[#5f5952] sm:px-7">
                      <p>Todavía no hay categorías por aquí.</p>
                      {user ? (
                        <button
                          type="button"
                          onClick={openCategoryCreate}
                          className="editorial-cta editorial-cta-dark mt-5 !px-4 !py-2 !text-[0.68rem]"
                        >
                          Añadir categoría
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={login}
                          className="editorial-cta mt-5"
                        >
                          Login con Google
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {!isLoading && shouldShowCategorySidebar && (
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className="editorial-card rounded-[2rem] px-5 py-6 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col lg:overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black leading-tight">
                  Categorías
                </h2>
                {user && (
                  <button
                    type="button"
                    title="Añadir categoría"
                    aria-label="Añadir categoría"
                    onClick={openCategoryCreate}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6d1c8] bg-white text-[#111111] transition hover:bg-[#f5efe4]"
                  >
                    <Plus size={15} strokeWidth={2.4} />
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                {getForumIndexCategories(categories).map((category) => {
                  const canManageCurrentCategory = canManageCategory(category);
                  const isDeletingCategory =
                    activeAction === `category-delete-${category.id}`;
                  const metrics = getCategoryOwnMetrics(category.id);

                  return (
                    <div
                      key={category.id}
                      className="rounded-[1.35rem] border border-[#d6d1c8] bg-[#fffdf8] px-4 py-4 transition hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)]"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full"
                          style={{ background: category.color }}
                        />
                        <Link
                          href={`/forum/${category.slug}`}
                          className="min-w-0 flex-1"
                        >
                          <p className="font-bold text-[#111111]">
                            {category.title}
                          </p>
                          {category.description && (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6a645c]">
                              {category.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#7a746b]">
                            {formatForumCount(category.topicCount, "post", "posts")} ·{" "}
                            {formatForumCount(category.threadCount, "respuesta", "respuestas")}
                          </p>
                          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6a645c]">
                            <span className="inline-flex items-center gap-1">
                              <Eye size={13} strokeWidth={2.2} />
                              {metrics.views.toLocaleString()} vistas
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Heart size={13} strokeWidth={2.2} />
                              {metrics.likes.toLocaleString()} likes
                            </span>
                          </p>
                        </Link>

                        {canManageCurrentCategory && (
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              title={`Editar ${category.title}`}
                              aria-label={`Editar ${category.title}`}
                              disabled={isDeletingCategory}
                              onClick={() => openCategoryEdit(category)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d6d1c8] bg-white text-sm font-black text-[#111111] transition hover:bg-[#f5efe4] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Pencil size={13} strokeWidth={2.3} />
                            </button>
                            <button
                              type="button"
                              title={`Borrar ${category.title}`}
                              aria-label={`Borrar ${category.title}`}
                              disabled={isDeletingCategory}
                              onClick={() => void deleteCategory(category)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d6d1c8] bg-white text-sm font-black text-[#111111] transition hover:bg-[#f5efe4] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Trash2 size={13} strokeWidth={2.3} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        )}
      </main>
    </>
  );
}
