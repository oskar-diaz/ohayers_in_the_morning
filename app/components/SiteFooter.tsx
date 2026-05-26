import Image from "next/image";

const footerLinks = [
  {
    href: "http://instagram.com/ikusuki",
    label: "Instagram",
    icon: "instagram",
  },
  {
    href: "https://x.com/ikusuki",
    label: "Twitter",
    icon: "x",
  },
  {
    href: "https://www.tiktok.com/@ikusukinews",
    label: "TikTok",
    icon: "tiktok",
  },
  {
    href: "https://www.youtube.com/ikusuki",
    label: "YouTube",
    icon: "youtube",
  },
  {
    href: "https://ikublog.com",
    label: "Blog",
    icon: "blog",
  },
  {
    href: "https://ikulibro.ikublog.com",
    label: "Libro",
    icon: "book",
  },
] as const;

function getFooterLinkStyles(icon: (typeof footerLinks)[number]["icon"]) {
  if (icon === "instagram") {
    return {
      buttonClassName:
        "border-[#d08ab2] bg-[linear-gradient(180deg,#ff7bb8_0%,#d94f93_100%)] text-white",
      iconClassName:
        "bg-[linear-gradient(135deg,#f9c96d_0%,#ee2a7b_55%,#6228d7_100%)] text-white",
    };
  }

  if (icon === "x") {
    return {
      buttonClassName:
        "border-[#2f3642] bg-[linear-gradient(180deg,#2f3440_0%,#16181d_100%)] text-[#f8f6f2]",
      iconClassName: "bg-white/10 text-white",
    };
  }

  if (icon === "tiktok") {
    return {
      buttonClassName:
        "border-[#5f5f73] bg-[linear-gradient(180deg,#3a3d57_0%,#1c1d2f_100%)] text-white",
      iconClassName:
        "bg-[linear-gradient(135deg,#25f4ee_0%,#25f4ee_45%,#fe2c55_100%)] text-[#111111]",
    };
  }

  if (icon === "youtube") {
    return {
      buttonClassName:
        "border-[#da4538] bg-[linear-gradient(180deg,#ff5b4d_0%,#d92d20_100%)] text-white",
      iconClassName: "bg-white/12 text-white",
    };
  }

  if (icon === "blog") {
    return {
      buttonClassName:
        "border-[#ccae74] bg-[linear-gradient(180deg,#efd28f_0%,#cda156_100%)] text-[#3f2a10]",
      iconClassName: "bg-white/28 text-[#5b3b08]",
    };
  }

  return {
    buttonClassName:
      "border-[#b88d75] bg-[linear-gradient(180deg,#d8ac90_0%,#b7795a_100%)] text-white",
    iconClassName: "bg-white/18 text-white",
  };
}

function FooterLinkIcon({
  icon,
}: {
  icon: (typeof footerLinks)[number]["icon"];
}) {
  if (icon === "instagram") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="17.3" cy="6.8" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (icon === "x") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M5.5 4.75h3.2l4.08 5.55 4.88-5.55h2.9l-6.44 7.33 7.13 9.17h-3.22l-4.74-6.2-5.4 6.2H5.02l6.95-7.98-6.47-8.52Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (icon === "tiktok") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M14.4 3.75c.42 1.16 1.34 2.2 2.54 2.85.78.43 1.62.65 2.47.67v2.85a8.23 8.23 0 0 1-3.95-1.03v5.13a5.3 5.3 0 1 1-5.3-5.29c.36 0 .7.03 1.03.1v2.92a2.55 2.55 0 1 0 1.52 2.33V3.75h2.7Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (icon === "youtube") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M21 12.02c0 2.22-.26 4.14-.5 5.01a2.7 2.7 0 0 1-1.89 1.9c-.88.23-3.5.5-6.61.5s-5.73-.27-6.61-.5a2.7 2.7 0 0 1-1.89-1.9c-.24-.87-.5-2.8-.5-5.01 0-2.22.26-4.14.5-5.01a2.7 2.7 0 0 1 1.89-1.9c.88-.23 3.5-.5 6.61-.5s5.73.27 6.61.5a2.7 2.7 0 0 1 1.89 1.9c.24.87.5 2.8.5 5.01Z"
          fill="currentColor"
        />
        <path d="m10.2 8.65 5.25 3.37-5.25 3.33V8.65Z" fill="#fffdf8" />
      </svg>
    );
  }

  if (icon === "blog") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M6.25 4.75h11.5A1.75 1.75 0 0 1 19.5 6.5v11a1.75 1.75 0 0 1-1.75 1.75H6.25A1.75 1.75 0 0 1 4.5 17.5v-11A1.75 1.75 0 0 1 6.25 4.75Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 9h8M8 12h8M8 15h5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      <path
        d="M6.25 5.25h8.5l3 3v10a1.75 1.75 0 0 1-1.75 1.75h-9.75A1.75 1.75 0 0 1 4.5 18.25V7A1.75 1.75 0 0 1 6.25 5.25Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 11h6M9 14.25h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M14.75 5.25V8.5h3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function SiteFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-[#d93e3e] bg-[linear-gradient(135deg,#ff7167_0%,#ff5a58_30%,#ff4b4b_56%,#eb4050_78%,#cc3150_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,224,224,0.34),rgba(255,224,224,0)_34%),radial-gradient(circle_at_bottom_right,rgba(157,18,45,0.3),rgba(157,18,45,0)_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 text-center">

        <p className="handwritten-title mx-auto max-w-4xl text-balance text-[19px] font-medium italic leading-[1.05] tracking-[-0.03em] text-[#f2eeee] drop-shadow-[0_6px_18px_rgba(90,9,9,0.4)] md:text-[22px]">
          ¿¡A que estamos aqui, copón!? ¿¡A ikigais o a setas?!?
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {footerLinks.map((link) => {
            const styles = getFooterLinkStyles(link.icon);

            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border px-3.5 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] shadow-[0_10px_22px_rgba(66,42,18,0.16),inset_0_-2px_0_rgba(0,0,0,0.12)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(66,42,18,0.22),inset_0_-2px_0_rgba(0,0,0,0.14)] ${styles.buttonClassName}`}
              >
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.06)_34%,rgba(255,255,255,0)_45%,rgba(0,0,0,0.08)_100%)]" />
                <span
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${styles.iconClassName}`}
                >
                  <FooterLinkIcon icon={link.icon} />
                </span>
                <span className="relative leading-none">
                  {link.label === "Libro" ? "Afinando un sueño" : link.label}
                </span>
              </a>
            );
          })}
        </div>

        <div className="mt-8 flex items-end justify-between sm:hidden">
          <Image
            src="/darumer.png"
            alt=""
            width={92}
            height={92}
            className="h-auto w-[76px] opacity-95 drop-shadow-[0_10px_22px_rgba(123,26,26,0.35)]"
          />
          <Image
            src="/darumerborracher.png"
            alt=""
            width={92}
            height={92}
            className="h-auto w-[76px] opacity-95 drop-shadow-[0_10px_22px_rgba(123,26,26,0.35)]"
          />
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 hidden sm:block md:bottom-4 md:left-4">
          <Image
            src="/darumer.png"
            alt=""
            width={92}
            height={92}
            className="h-auto w-[72px] opacity-95 drop-shadow-[0_10px_22px_rgba(123,26,26,0.35)] md:w-[92px]"
          />
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 hidden sm:block md:bottom-4 md:right-4">
          <Image
            src="/darumerborracher.png"
            alt=""
            width={92}
            height={92}
            className="h-auto w-[72px] opacity-95 drop-shadow-[0_10px_22px_rgba(123,26,26,0.35)] md:w-[92px]"
          />
        </div>
      </div>
    </footer>
  );
}
