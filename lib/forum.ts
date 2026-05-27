import type { User } from "@supabase/supabase-js";

const FORUM_SMILIE_ENTRIES = [
  ":cuner:",
  ":ikukeke:",
  ":ikurruku:",
  ":ikukuko:",
  ":ikurruke:",
  ":ikukin:",
  ":ikukuna:",
  ":kiss:",
  ":sobader:",
  ":insomnier:",
  ":bostecer:",
  ":ungusto:",
  ":ricachoner:",
  ":D",
  ":LOL:",
  "br",
  ";)",
  ":dientes:",
  ":yahaaa:",
  ":bailongo:",
  ":felicianer:",
  ":desquiciao:",
  ":gusteresque:",
  ":descojoner:",
  ":vainas:",
  ":amosahi:",
  ":aquiii:",
  ":flowers:",
  ":paz:",
  ":P",
  "br",
  ":(",
  ":vergonzer:",
  ":feliciano:",
  ":menfadao:",
  ":asi-no:",
  ":fliper:",
  ":flipader:",
  ":llorera:",
  ":ikullorer:",
  ":pirao:",
  ":espabilacopon:",
  ":otiaya:",
  ":palizero:",
  ":ostiejas:",
  ":nunchakero:",
  ":siono:",
  ":romeo:",
  ":secretico:",
  ":posna:",
  ":gambiters:",
  ":coleguicas:",
  ":comillo:",
  ":olakease:",
  ":cocinicas:",
  ":arrozico:",
  ":linchamiento:",
  ":pirader:",
  "br",
  ":viejuno:",
  ":cebolleter:",
  ":pelao:",
  ":flipanderer:",
  ":rascatecler:",
  ":osleo:",
  ":rabincher:",
  ":pedocuete:",
  ":hecho:",
  ":wink:",
  ":noseyo:",
  ":trato:",
  ":blblbl:",
  ":disimuler:",
  ":gambi:",
  ":ahivalaotia:",
  ":peneke:",
  ":gustico:",
  ":pliebre:",
  ":copon:",
  ":gatostiable:",
  ":ikugracias:",
  ":bythesegao:",
  ":regulero:",
  ":ojetepalinvierno:",
  ":porsaquil:",
  ":partytime:",
  ":maremia:",
  ":censurer:",
  ":goku:",
  ":triki:",
  ":ikufantasma:",
  ":estudier:",
  ":chiqui:",
  ":tasmanier:",
  ":almohading:",
  ":yoda:",
  ":mierdacas:",
  ":foreveralone:",
  ":perrete:",
] as const;

const FORUM_SMILIE_SOURCES: Record<string, string> = {
  ":(": "/smilies/pissy.gif",
  ":)": "/smilies/icon_smile.gif",
  ":D": "/smilies/icon_razz.gif",
  ":LOL:": "/smilies/meparto.gif",
  ":P": "/smilies/icon_lol.gif",
  ":ahivalaotia:": "/smilies/ikuotia.gif",
  ":almohading:": "/smilies/pillowfight.gif",
  ":amosahi:": "/smilies/clapping.gif",
  ":aquiii:": "/smilies/oye.gif",
  ":arrozico:": "/smilies/arrozico.gif",
  ":asi-no:": "/smilies/noHijano.gif",
  ":atomarpolgete:": "/smilies/smiley_eatpaper.gif",
  ":bailongo:": "/smilies/dance.gif",
  ":blblbl:": "/smilies/tounge5.gif",
  ":bostecer:": "/smilies/yawn.gif",
  ":bythesegao:": "/smilies/ikusegao.gif",
  ":cebolleter:": "/smilies/sFun_oldguy.gif",
  ":censurer:": "/smilies/sSig_banned3.gif",
  ":chiqui:": "/smilies/sAni_monkey.gif",
  ":chupeter:": "/smilies/baby_smiley38.gif",
  ":cocinicas:": "/smilies/cocinicas.gif",
  ":coleguicas:": "/smilies/friends.gif",
  ":comillo:": "/smilies/comillas.gif",
  ":copon:": "/smilies/ikucopon.gif",
  ":cry:": "/smilies/m1524.gif",
  ":cuner:": "/smilies/baby_smiley20.gif",
  ":desquiciao:": "/smilies/vueltasss2wb.gif",
  ":descojoner:": "/smilies/meparto.gif",
  ":dientes:": "/smilies/m0192.gif",
  ":disimuler:": "/smilies/whistling.gif",
  ":eeehk:": "/smilies/eeek.gif",
  ":espabilacopon:": "/smilies/punish.gif",
  ":estudier:": "/smilies/sCh_reader.gif",
  ":feliciano:": "/smilies/sHa_runaround.gif",
  ":felicianer:": "/smilies/dancing.gif",
  ":fliper:": "/smilies/sSc_scarednervous.gif",
  ":flipader:": "/smilies/blink.gif",
  ":flipanderer:": "/smilies/written.gif",
  ":flowers:": "/smilies/flowers.gif",
  ":gambi:": "/smilies/gambiter.gif",
  ":gambiters:": "/smilies/gambiters.gif",
  ":gatostiable:": "/smilies/gatost.gif",
  ":goku:": "/smilies/sCh_Goku.png",
  ":gustico:": "/smilies/gustico.gif",
  ":gusteresque:": "/smilies/dance13fm0uv.gif",
  ":hecho:": "/smilies/gimmefive09.gif",
  ":ikufantasma:": "/smilies/ikufantasma.gif",
  ":ikugracias:": "/smilies/ikugracias.gif",
  ":ikukin:": "/smilies/animated-smileys-babies-007.gif",
  ":ikukeke:": "/smilies/t61009.gif",
  ":ikukike:": "/smilies/smiley5011.gif",
  ":ikukuko:": "/smilies/baby_smiley3.gif",
  ":ikukuna:": "/smilies/smilie_baby_076.gif",
  ":ikullorer:": "/smilies/cry.gif",
  ":ikurruke:": "/smilies/smileys-baby-050603.gif",
  ":ikurruku:": "/smilies/connie_rockingbaby.gif",
  ":insomnier:": "/smilies/countsheep0.gif",
  ":kiss:": "/smilies/1150903199-air_kiss.gif",
  ":linchamiento:": "/smilies/smiley-talk038.gif",
  ":llorera:": "/smilies/icon_cry.gif",
  ":malico:": "/smilies/malico.gif",
  ":maremia:": "/smilies/dots.gif",
  ":menfadao:": "/smilies/enfadau.gif",
  ":mierdacas:": "/smilies/kngt.gif",
  ":noseyo:": "/smilies/thinking.gif",
  ":nunchakero:": "/smilies/nunchakus.gif",
  ":ojetepalinvierno:": "/smilies/ojete.gif",
  ":olakease:": "/smilies/smiley-with-glasses23.gif",
  ":osleo:": "/smilies/aAx4PX5g_o.gif",
  ":ostiejas:": "/smilies/ostiejas.gif",
  ":otiaya:": "/smilies/mosqueao.gif",
  ":palizero:": "/smilies/punish.gif",
  ":partytime:": "/smilies/party_time.gif",
  ":paz:": "/smilies/flag_of_truce.gif",
  ":pedocuete:": "/smilies/firefart.gif",
  ":pelao:": "/smilies/cold.gif",
  ":peneke:": "/smilies/peneke.gif",
  ":perrete:": "/smilies/cheerdoge.001.png",
  ":pirao:": "/smilies/pirao.gif",
  ":pirader:": "/smilies/skrewball004.gif",
  ":pliebre:": "/smilies/pataliebre.gif",
  ":posna:": "/smilies/sCo_idk2.gif",
  ":porsaquil:": "/smilies/porsaquil.gif",
  ":rabincher:": "/smilies/X3.gif",
  ":rascatecler:": "/smilies/computer_smiley4.gif",
  ":ricachoner:": "/smilies/homebrew.001.gif",
  ":regulero:": "/smilies/regulero.gif",
  ":romeo:": "/smilies/smiley-love034.gif",
  ":secretico:": "/smilies/secretico.gif",
  ":siono:": "/smilies/smiley-love048.gif",
  ":sobader:": "/smilies/lazy2.gif",
  ":foreveralone:": "/smilies/tumbleweed.gif",
  ":tasmanier:": "/smilies/sCh_taz.gif",
  ":trato:": "/smilies/shake.gif",
  ":triki:": "/smilies/sCh_cookiemonster.gif",
  ":ungusto:": "/smilies/ungusto.gif",
  ":vainas:": "/smilies/vainas.gif",
  ":vergonzer:": "/smilies/rolley.gif",
  ":viejuno:": "/smilies/viejuno.gif",
  ":wink:": "/smilies/icon_wink.gif",
  ":yahaaa:": "/smilies/120.gif",
  ":yoda:": "/smilies/yoda.gif",
  ";)": "/smilies/icon_wink.gif",
};

function escapeForumSmilieToken(token: string) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ForumSmilie =
  | {
      type: "break";
    }
  | {
      label: string;
      src?: string;
      token: string;
      type: "smilie";
      value: string;
    };

export const FORUM_SMILIES: ForumSmilie[] = FORUM_SMILIE_ENTRIES.map((entry) =>
  entry === "br"
    ? {
        type: "break",
      }
    : {
        label: entry,
        src: FORUM_SMILIE_SOURCES[entry],
        token: entry,
        type: "smilie",
        value: entry,
      },
);

const FORUM_LEGACY_SMILIES: Extract<ForumSmilie, { type: "smilie" }>[] = [
  {
    label: ":)",
    src: "/smilies/icon_smile.gif",
    token: ":)",
    type: "smilie",
    value: ":)",
  },
  {
    label: ":meparto:",
    src: "/smilies/meparto.gif",
    token: ":meparto:",
    type: "smilie",
    value: ":meparto:",
  },
  {
    label: ":thinking:",
    src: "/smilies/thinking.gif",
    token: ":thinking:",
    type: "smilie",
    value: ":thinking:",
  },
  {
    label: ":heart:",
    token: ":heart:",
    type: "smilie",
    value: "❤️",
  },
  {
    label: ":tea:",
    token: ":tea:",
    type: "smilie",
    value: "🍵",
  },
  {
    label: ":news:",
    token: ":news:",
    type: "smilie",
    value: "📰",
  },
];

export const FORUM_SMILIE_MAP = Object.fromEntries(
  [
    ...FORUM_SMILIES.filter((smilie) => smilie.type === "smilie"),
    ...FORUM_LEGACY_SMILIES,
  ].map((smilie) => [smilie.token, smilie]),
) as Record<string, Extract<ForumSmilie, { type: "smilie" }>>;

export const FORUM_SMILIE_PATTERN = new RegExp(
  `(${Object.keys(FORUM_SMILIE_MAP)
    .sort((left, right) => right.length - left.length)
    .map(escapeForumSmilieToken)
    .join("|")})`,
  "g",
);

export type ForumCategory = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  color: string;
  author_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type ForumTopic = {
  id: number;
  category_id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  reply_count: number;
  post_count: number;
  is_locked: boolean;
  is_pinned: boolean;
  hidden_at: string | null;
  hidden_by: string | null;
  created_at: string;
  updated_at: string;
  last_post_at: string;
  forum_categories?: ForumCategory | ForumCategory[] | null;
};

export type ForumPost = {
  id: number;
  topic_id: number;
  parent_id: number | null;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  content: string;
  hidden_at: string | null;
  hidden_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ForumPostNode = ForumPost & {
  replies: ForumPostNode[];
};

export type ForumProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export function getForumUserName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return metadataName.trim() || user.email?.split("@")[0] || "Lector";
}

export function getForumUserAvatarUrl(user: User) {
  const avatarUrl = user.user_metadata?.avatar_url;

  return typeof avatarUrl === "string" ? avatarUrl : null;
}

export function getForumInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "F";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function formatForumDate(value: string) {
  const date = new Date(value);

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

export function slugifyForumValue(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || "hilo";
}

export function buildForumPostTree(records: ForumPost[]) {
  const nodes = new Map<number, ForumPostNode>();

  for (const record of records) {
    nodes.set(record.id, {
      ...record,
      replies: [],
    });
  }

  const firstRecord = records[0];
  const rootNode = firstRecord ? nodes.get(firstRecord.id) ?? null : null;
  const roots: ForumPostNode[] = [];

  for (const record of records) {
    const node = nodes.get(record.id);

    if (!node) {
      continue;
    }

    if (rootNode && record.id === rootNode.id) {
      roots.push(node);
      continue;
    }

    if (
      record.parent_id &&
      record.parent_id !== record.id &&
      nodes.has(record.parent_id)
    ) {
      nodes.get(record.parent_id)?.replies.push(node);
      continue;
    }

    if (rootNode) {
      rootNode.replies.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

export function getForumCategoryFromTopic(topic?: ForumTopic | null) {
  const category = topic?.forum_categories;

  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category ?? null;
}
