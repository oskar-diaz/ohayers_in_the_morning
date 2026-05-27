import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { SanityImageSource } from "@sanity/image-url";
import { cache } from "react";

import NewsTipCta from "@/app/components/NewsTipCta";
import InstagramEmbed from "@/app/components/InstagramEmbed";
import StoryLikeButton from "@/app/components/StoryLikeButton";
import XEmbed from "@/app/components/XEmbed";
import { getCommentCountsBySlug } from "@/lib/comments";
import { getDisplayAuthorName } from "@/lib/display-author";
import { formatPublicationDateTime } from "@/lib/format-date";
import { getLikesBySlug } from "@/lib/likes";
import {
  absoluteUrl,
  getSanityOgImageUrl,
  resolveSeoDescription,
  toJsonLd,
} from "@/lib/seo";
import {
  siteKeywords,
  siteLocale,
  siteName,
} from "@/lib/site";
import { getViewsBySlug } from "@/lib/views";
import { blogCategory } from "@/lib/wordpress";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 300;

const VIDEO_OF_THE_DAY_URL =
  "https://x.com/HappyPunch/status/2058641063011651951";
const LEAD_FEATURED_VIDEO_URL =
  "https://x.com/asuka_481/status/2059159320374497679";
const FEATURED_INSTAGRAM_VIDEO_URL =
  "https://www.instagram.com/p/DYvlH_mSSD5/";
const SECOND_FEATURED_VIDEO_URL =
  "https://x.com/naomi2943/status/2058476849613721671";
const THIRD_FEATURED_VIDEO_URL =
  "https://x.com/Ryo_Saeba_3/status/2058505716227531140";
const FOURTH_FEATURED_VIDEO_URL =
  "https://x.com/0Ari_/status/2058515430260822494";
const FIFTH_FEATURED_VIDEO_URL =
  "https://x.com/NicoleA18060980/status/2058340964960539094";
const SIXTH_FEATURED_VIDEO_URL =
  "https://x.com/mrjeffu/status/2056223011334918254";
const SEVENTH_FEATURED_VIDEO_URL =
  "https://x.com/jt_mag_os/status/2057425874933395960";
const EIGHTH_FEATURED_VIDEO_URL =
  "https://x.com/NicoleA18060980/status/2058176545320268140";
const NINTH_FEATURED_VIDEO_URL =
  "https://x.com/jasminogpw/status/2054463896065552560";
const TENTH_FEATURED_VIDEO_URL =
  "https://x.com/douga111www/status/2058171976703934905";
const ELEVENTH_FEATURED_VIDEO_URL =
  "https://x.com/masanews3/status/2057980095676252187";
const TWELFTH_FEATURED_VIDEO_URL =
  "https://x.com/5chmatme/status/2058162044264681637";
const THIRTEENTH_FEATURED_VIDEO_URL =
  "https://x.com/seisaku_tyosaku/status/2058336725374832771";
const FOURTEENTH_FEATURED_VIDEO_URL =
  "https://x.com/kkkfff1234k/status/2058249042338214193";

type HomeImage = SanityImageSource & {
  alt?: string;
};

type HomeCategory = {
  title: string;
  slug?: {
    current?: string;
  };
};

type HomePost = {
  _id: string;
  title: string;
  slug?: {
    current?: string;
  };
  publishedAt: string;
  excerpt?: string;
  mainImage?: HomeImage;
  categories?: HomeCategory[];
  author?: {
    name?: string;
    image?: HomeImage;
  };
};

const getPosts = cache(async () => {
  return client.fetch<HomePost[]>(`
    *[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      mainImage,
      categories[]->{
        title,
        slug
      },
      author->{
        name,
        image
      }
    }
  `);
});

const getCategories = cache(async () => {
  return client.fetch<HomeCategory[]>(`
    *[_type == "category"] | order(title asc){
      title,
      slug
    }
  `);
});

function getPostsWithSlug(posts: HomePost[]) {
  return posts.filter(
    (post): post is HomePost & { slug: { current: string } } =>
      Boolean(post.slug?.current),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  const featuredPost = getPostsWithSlug(posts)[0];
  const description = resolveSeoDescription(
    featuredPost?.excerpt,
    "Noticias de Japón, actualidad japonesa, cultura y tendencias desde una mirada editorial propia.",
  );
  const imageUrl = getSanityOgImageUrl(featuredPost?.mainImage);

  return {
    title: "Noticias de Japón, actualidad japonesa y cultura",
    description,
    keywords: [
      ...siteKeywords,
      "periódico de Japón",
      "medio sobre Japón",
      ...categories.map((category) => category.title),
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: siteLocale,
      url: absoluteUrl("/"),
      siteName,
      title: `Noticias de Japón | ${siteName}`,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: featuredPost?.title ?? siteName,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `Noticias de Japón | ${siteName}`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

function StoryMeta({
  slug,
  publishedAt,
  views,
  likes,
  comments,
  compact = false,
}: {
  slug: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  compact?: boolean;
}) {
  const itemClassName = compact
    ? "inline-flex items-center gap-1.5 text-[0.82rem] font-medium tracking-[0.04em] text-[#7a746b] leading-none"
    : "inline-flex items-center gap-2 text-[0.9rem] font-medium tracking-[0.04em] text-[#7a746b] leading-none";

  const iconClassName = compact
    ? "h-[20px] w-[20px] shrink-0"
    : "h-[24px] w-[24px] shrink-0";
  const commentLabel =
    comments === 1
      ? "1 comentario"
      : `${comments.toLocaleString()} comentarios`;

  return (
    <div
      className={`flex w-full items-center justify-between gap-4 ${
        compact ? "mt-4" : "mt-6"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className={itemClassName}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`${iconClassName} text-[#8f6a2a]`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17" />
          </svg>
          <span>{formatPublicationDateTime(publishedAt)}</span>
        </span>

        <span className={itemClassName}>
          <span>{views.toLocaleString()} vistas</span>
        </span>

        {comments > 0 && (
          <span className={itemClassName}>
            <span>{commentLabel}</span>
          </span>
        )}
      </div>

      <StoryLikeButton slug={slug} initialLikes={likes} compact={compact} />
    </div>
  );
}


export default async function Home() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()]);
  const postsWithSlug = getPostsWithSlug(posts);
  const featured = postsWithSlug[0];
  const latest = featured ? postsWithSlug.slice(1) : postsWithSlug;
  const visiblePosts = featured ? [featured, ...latest] : postsWithSlug;
  const visibleSlugs = visiblePosts.map((post) => post.slug.current);
  const categoryLinks = categories.filter(
    (category): category is HomeCategory & { slug: { current: string } } =>
      Boolean(category.slug?.current),
  );
  const navigationCategories = [
    ...categoryLinks,
    ...(!categoryLinks.some((category) => category.slug.current === blogCategory.slug)
      ? [{ title: blogCategory.title, slug: { current: blogCategory.slug } }]
      : []),
  ];

  const [views, commentCounts, likes] = await Promise.all([
    getViewsBySlug(visibleSlugs),
    getCommentCountsBySlug(visibleSlugs),
    getLikesBySlug(visibleSlugs),
  ]);
  const featuredAuthorName = featured
    ? getDisplayAuthorName(featured.slug.current, featured.author?.name)
    : null;
  const featuredPrimaryCategory = featured?.categories?.[0];
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteName,
        alternateName: "Noticias de Japón",
        url: absoluteUrl("/"),
        description:
          "Noticias de Japón, actualidad japonesa y cultura contadas con voz editorial propia.",
        inLanguage: "es",
      },
      {
        "@type": "CollectionPage",
        name: `Noticias de Japón | ${siteName}`,
        url: absoluteUrl("/"),
        description:
          "Portada con noticias de Japón, actualidad japonesa, tendencias y cultura.",
        inLanguage: "es",
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: visiblePosts.length,
          itemListElement: visiblePosts.slice(0, 12).map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/post/${post.slug.current}`),
            name: post.title,
          })),
        },
      },
    ],
  };

  return (
    <main className="bg-[#f8f6f2] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(homeJsonLd) }}
      />

      {/* HEADER */}
      <header className="max-w-7xl mx-auto px-6 py-10 border-b newspaper-border">
        {/* LOGO */}
        <div className="text-center">
          <Link href="/">
            <h1
              className="
                newspaper-title
                font-black
                uppercase
                leading-[0.92]
                tracking-[-0.055em]
                text-[clamp(2.7rem,11vw,5.8rem)]
                lg:text-[clamp(3.6rem,7.9vw,5.45rem)]
                xl:text-[clamp(4.6rem,6.2vw,6.5rem)]
                xl:whitespace-nowrap
              "
            >
              <span className="block md:inline">OHAYERS IN THE</span>
              <span className="block md:inline md:ml-[0.24em]">MORNING</span>
            </h1>
          </Link>

          <p
            className="
              mt-5
              uppercase
              text-red-700
              tracking-[0.35em]
              text-xs
              md:text-sm
              font-semibold
            "
          >
            El periodico a tope de Ikigai
          </p>

          <p className="mx-auto mt-4 max-w-3xl text-balance text-sm leading-6 text-[#5f5952] md:text-base">
            Noticias de Japón, actualidad japonesa, cultura y tendencias
            contadas con el estilo editorial de Ohayers.
          </p>
        </div>

        {/* NAV */}
        <div className="flex justify-center mt-10">
          <nav className="flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-3 uppercase text-sm">
            {navigationCategories.map((category) => (
              <Link
                key={category.slug.current}
                href={`/category/${category.slug.current}`}
              >
                <p className="hover:opacity-60 transition cursor-pointer whitespace-nowrap">
                  {category.title}
                </p>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* HERO */}
      {featured && (
        <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-[1.4fr_1fr] gap-12 border-b newspaper-border">
          {/* IMAGE */}
          <Link href={`/post/${featured.slug.current}`}>
            <div className="relative h-[420px] md:h-[560px] overflow-hidden flex items-center justify-center">
              {featured.mainImage && (
                <Image
                  src={urlFor(featured.mainImage).url()}
                  alt={featured.mainImage.alt || featured.title}
                  width={1600}
                  height={1000}
                  priority
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="
                    w-full
                    h-full
                    object-contain
                    p-4
                    hover:scale-[1.01]
                    transition
                    duration-500
                  "
                />
              )}
            </div>
          </Link>

          {/* TEXT */}
          <div className="flex flex-col justify-center">
            {featuredPrimaryCategory?.title &&
              (featuredPrimaryCategory.slug?.current ? (
                <Link href={`/category/${featuredPrimaryCategory.slug.current}`}>
                  <p className="uppercase text-red-700 font-semibold tracking-[0.18em] text-sm mb-4 hover:opacity-60 transition">
                    {featuredPrimaryCategory.title}
                  </p>
                </Link>
              ) : (
                <p className="uppercase text-red-700 font-semibold tracking-[0.18em] text-sm mb-4">
                  {featuredPrimaryCategory.title}
                </p>
              ))}

            <Link href={`/post/${featured.slug.current}`}>
              <h2
                className="
                  newspaper-title
                  text-[clamp(2.2rem,4vw,4.5rem)]
                  font-black
                  leading-[0.92]
                  tracking-[-0.04em]
                  hover:opacity-70
                  transition
                  max-w-[11ch]
                "
              >
                {featured.title}
              </h2>
            </Link>

            <StoryMeta
              slug={featured.slug.current}
              publishedAt={featured.publishedAt}
              views={views[featured.slug.current] ?? 0}
              likes={likes[featured.slug.current] ?? 0}
              comments={commentCounts[featured.slug.current] ?? 0}
            />

            <p className="mt-8 text-2xl text-gray-700 leading-relaxed font-light">
              {featured.excerpt}
            </p>

            {/* AUTHOR */}
            <div className="mt-10">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#7a746b]">
                  {featuredAuthorName}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 py-12 border-b newspaper-border">
        <div className="mx-auto max-w-[620px]">
          <p className="text-center text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-red-700">
            Instagram
          </p>

          <h2 className="mt-4 text-center newspaper-title text-[clamp(2.6rem,5vw,4.8rem)] font-black leading-[0.92] tracking-[-0.045em]">
            Video destacado
          </h2>

          <InstagramEmbed
            url={FEATURED_INSTAGRAM_VIDEO_URL}
            className="mx-auto mt-8 w-full max-w-[560px]"
          />
        </div>
      </section>

      <NewsTipCta />

      {/* NEWS GRID */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
        {latest.map((post) => {
          const displayAuthorName = getDisplayAuthorName(
            post.slug.current,
            post.author?.name,
          );

          return (
            <article key={post._id} className="border-b newspaper-border pb-10">
              {/* IMAGE */}
              <Link href={`/post/${post.slug.current}`}>
                <div className="relative h-[320px] overflow-hidden mb-5 bg-[#ece8df]">
                  {post.mainImage && (
                    <Image
                      src={urlFor(post.mainImage).url()}
                      alt={post.mainImage.alt || post.title}
                      width={1200}
                      height={800}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="
                        w-full
                        h-full
                        object-cover
                        hover:scale-[1.02]
                        transition
                        duration-500
                      "
                    />
                  )}
                </div>
              </Link>

              {/* CATEGORY */}
              {post.categories?.[0]?.slug?.current && (
                <Link href={`/category/${post.categories[0].slug.current}`}>
                  <p className="uppercase text-red-700 font-semibold tracking-wide text-xs mb-3 hover:opacity-60 transition">
                    {post.categories[0].title}
                  </p>
                </Link>
              )}

              {/* TITLE */}
              <Link href={`/post/${post.slug.current}`}>
                <h3 className="newspaper-title text-[clamp(2rem,3vw,3.2rem)] font-black leading-[0.95] hover:opacity-70 transition">
                  {post.title}
                </h3>
              </Link>

              <StoryMeta
                slug={post.slug.current}
                publishedAt={post.publishedAt}
                views={views[post.slug.current] ?? 0}
                likes={likes[post.slug.current] ?? 0}
                comments={commentCounts[post.slug.current] ?? 0}
                compact
              />

              {/* EXCERPT */}
              <p className="mt-4 text-gray-700 leading-relaxed text-lg">
                {post.excerpt}
              </p>

              {/* AUTHOR */}
              <div className="mt-6">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#7a746b]">
                    {displayAuthorName}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14 border-t newspaper-border">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-red-700">
          Destacado
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:items-start">
          <XEmbed
            url={LEAD_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={VIDEO_OF_THE_DAY_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={SECOND_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={THIRD_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={FOURTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={FIFTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={SIXTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={SEVENTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={EIGHTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={NINTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={TENTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={ELEVENTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={TWELFTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={THIRTEENTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
          <XEmbed
            url={FOURTEENTH_FEATURED_VIDEO_URL}
            className="[&_iframe]:mx-auto [&_iframe]:max-w-full"
          />
        </div>
      </section>

    </main>
  );
}
