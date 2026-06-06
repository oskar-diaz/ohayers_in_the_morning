import Image from "next/image";
import Link from "next/link";

import Weather from "./Weather";

const TOKYO_TIMEZONE = "Asia/Tokyo";
const TICKER_MESSAGE = "Desaparecido estudiante americano en Kioto";
const TICKER_URL =
  "https://japantoday.com/category/national/american-college-student-missing-in-kyoto-last-seen-by-family-one-week-ago";
const TICKER_LINK_LABEL = "Ver noticia";
export const SITE_TICKER_IS_VISIBLE = false;

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

function formatTokyoCompactDate() {
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
    timeZone: TOKYO_TIMEZONE,
  }).format(new Date());

  return `${date} (${weekday})`;
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
    <>
      {SITE_TICKER_IS_VISIBLE && (
        <a
          href={TICKER_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${TICKER_MESSAGE} ${TICKER_LINK_LABEL}`}
          className="sticky top-0 z-[90] flex h-[var(--site-ticker-height)] items-center justify-center border-b border-[#ffaca1]/70 bg-[#111111] px-3 text-center text-[#fffdf8] shadow-[0_8px_24px_rgba(111,16,16,0.18)] transition hover:bg-[#2a2a2a]"
        >
          <span className="inline-flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-0.5 leading-tight">
            <span className="text-[0.7rem] tracking-[0.04em] sm:text-[0.9rem] sm:tracking-[0.08em]">
              {TICKER_MESSAGE}
            </span>
            <span className="text-[0.7rem] tracking-[0.04em] text-[#ffd84f] sm:text-[0.9rem] sm:tracking-[0.08em]">
              {TICKER_LINK_LABEL}
            </span>
          </span>
        </a>
      )}

      <div className="relative overflow-hidden border-b border-[#d93e3e] bg-[linear-gradient(135deg,#ff7167_0%,#ff5a58_30%,#ff4b4b_56%,#eb4050_78%,#cc3150_100%)] min-[770px]:overflow-visible">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,224,224,0.34),rgba(255,224,224,0)_34%),radial-gradient(circle_at_bottom_right,rgba(157,18,45,0.3),rgba(157,18,45,0)_42%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />

        <div className="relative mx-auto max-w-7xl px-3 py-2 text-sm sm:px-5 min-[770px]:pt-14 min-[770px]:pb-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 min-[770px]:hidden">
            <div className="min-w-0 w-[78px] rounded-xl border border-[#d6d1c8] bg-[#fffdf8] px-2 py-1.5 text-center shadow-[0_8px_20px_rgba(17,17,17,0.05)] min-[360px]:w-[84px] min-[390px]:w-[92px] sm:w-[100px]">
              <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#7a746b]">
                {formatTokyoCompactDate()}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.62rem] font-semibold leading-[1.05] text-[#111111]">
                {featuredAnniversary || "Hoy en Tokio"}
              </p>
            </div>

            <Link href="/" className="block text-center">
              <Image
                src="/logo.png"
                alt="Ohayers in the Morning"
                width={320}
                height={72}
                className="mx-auto h-auto w-full max-w-[124px] drop-shadow-[0_4px_12px_rgba(90,9,9,0.28)] transition hover:opacity-90 min-[360px]:max-w-[136px] min-[390px]:max-w-[148px] sm:max-w-[168px]"
                priority
              />
            </Link>

            <Weather
              className="w-[78px] justify-self-end min-[360px]:w-[84px] min-[390px]:w-[92px] sm:w-[100px]"
              variant="compact"
            />
          </div>

          <div className="relative hidden min-[770px]:flex min-[770px]:min-h-[226px] min-[770px]:items-center">
            <div className="absolute left-1/2 top-[56%] z-20 flex w-full max-w-[310px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <Link href="/" className="block w-full">
                <Image
                  src="/logo.png"
                  alt="Ohayers in the Morning"
                  width={420}
                  height={420}
                  className="mx-auto h-auto w-full max-w-[285px] drop-shadow-[0_18px_34px_rgba(90,9,9,0.3)] transition hover:opacity-90"
                  priority
                />
              </Link>
            </div>

            <div className="flex w-full items-center">
              <div className="flex w-1/2">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.35rem] border border-[#d6d1c8] bg-[#fffdf8] px-5 py-3 pr-24 text-left shadow-[0_14px_32px_rgba(17,17,17,0.06)] md:-mr-14 md:h-[82px]">
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
                    <p className="text-base font-semibold text-[#111111]">
                      {formatTokyoDate()}
                    </p>

                    {featuredAnniversary && (
                      <p className="mt-1 truncate text-xs text-[#5f5952]">
                        {featuredAnniversary}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-1/2">
                <Weather className="flex-1 rounded-[1.35rem] px-5 py-3 pl-24 shadow-[0_14px_32px_rgba(17,17,17,0.06)] md:-ml-14 md:!h-[82px] md:!w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
