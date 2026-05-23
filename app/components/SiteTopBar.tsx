import Link from "next/link";

import Weather from "./Weather";

const TOKYO_TIMEZONE = "Asia/Tokyo";

type AnniversaryResponse = {
  anniv1?: string;
  anniv2?: string;
  anniv3?: string;
  anniv4?: string;
  anniv5?: string;
};

function getTokyoNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TOKYO_TIMEZONE,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }

      return accumulator;
    }, {});

  return {
    day: parts.day,
    month: parts.month,
    year: parts.year,
    mmdd: `${parts.month}${parts.day}`,
  };
}

function formatTokyoDate() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: TOKYO_TIMEZONE,
  }).formatToParts(new Date());

  const weekday =
    parts.find((part) => part.type === "weekday")?.value.replaceAll(".", "") ||
    "";

  const date = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TOKYO_TIMEZONE,
  }).format(new Date());

  return `${date} （${weekday}）`;
}

async function getTokyoAnniversary(mmdd: string) {
  try {
    const response = await fetch(`https://api.whatistoday.cyou/v3/anniv/${mmdd}`, {
      next: {
        revalidate: 21600,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Tokyo anniversary");
    }

    const data = (await response.json()) as AnniversaryResponse;

    return [data.anniv1, data.anniv2, data.anniv3, data.anniv4, data.anniv5]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item));
  } catch {
    return [];
  }
}

export default async function SiteTopBar() {
  const tokyoNow = getTokyoNow();
  const anniversaries = await getTokyoAnniversary(tokyoNow.mmdd);
  const featuredAnniversary = anniversaries[0];

  return (
    <div className="border-b newspaper-border">
      <div className="mx-auto max-w-7xl px-4 py-4 text-sm sm:px-6">
        <Link href="/" className="mb-3 block text-center md:hidden">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[#111111] transition hover:opacity-70">
            OHAYERS IN THE MORNING
          </p>
        </Link>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2 text-center shadow-[0_10px_26px_rgba(17,17,17,0.05)] md:h-[82px] md:w-[350px] md:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ece8df] text-[#111111]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                d="M7.5 2.75v2.5M16.5 2.75v2.5M4.75 8.25h14.5M6.5 5.25h11a1.75 1.75 0 0 1 1.75 1.75v10.5a1.75 1.75 0 0 1-1.75 1.75h-11a1.75 1.75 0 0 1-1.75-1.75V7A1.75 1.75 0 0 1 6.5 5.25Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.7"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[0.78rem] font-semibold text-[#111111] sm:text-sm md:text-base">
              {formatTokyoDate()}
            </p>

            {featuredAnniversary && (
              <p className="mt-1 truncate text-xs text-[#5f5952]">
                {featuredAnniversary}
              </p>
            )}
          </div>
          </div>

          <Link href="/" className="hidden justify-self-center md:block">
            <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#111111] transition hover:opacity-70 sm:text-xs">
              OHAYERS IN THE MORNING
            </p>
          </Link>

          <div className="md:justify-self-end">
            <Weather />
          </div>
        </div>
      </div>
    </div>
  );
}
