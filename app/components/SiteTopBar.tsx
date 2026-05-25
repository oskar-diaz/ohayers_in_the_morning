import Image from "next/image";
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
    <div className="relative overflow-hidden md:overflow-visible border-b border-[#d93e3e] bg-[linear-gradient(135deg,#ff7167_0%,#ff5a58_30%,#ff4b4b_56%,#eb4050_78%,#cc3150_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,224,224,0.34),rgba(255,224,224,0)_34%),radial-gradient(circle_at_bottom_right,rgba(157,18,45,0.3),rgba(157,18,45,0)_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />

      <div className="relative mx-auto max-w-7xl px-4 py-4 text-sm sm:px-6 md:pt-10 md:pb-6">
        <Link href="/" className="mb-3 block text-center md:hidden">
          <Image
            src="/logo.png"
            alt="Ohayers in the Morning"
            width={320}
            height={72}
            className="mx-auto h-auto w-full max-w-[220px] drop-shadow-[0_4px_12px_rgba(90,9,9,0.28)] transition hover:opacity-90"
            priority
          />
        </Link>

        <div className="grid grid-cols-2 gap-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2 text-center shadow-[0_10px_26px_rgba(17,17,17,0.05)]">
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
              <p className="text-[0.78rem] font-semibold text-[#111111] sm:text-sm">
                {formatTokyoDate()}
              </p>

              {featuredAnniversary && (
                <p className="mt-1 truncate text-xs text-[#5f5952]">
                  {featuredAnniversary}
                </p>
              )}
            </div>
          </div>

          <Weather />
        </div>

        <div className="relative hidden md:flex md:min-h-[210px] md:items-center">
          <div className="absolute left-1/2 top-1/2 z-20 flex w-full max-w-[310px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
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
  );
}
