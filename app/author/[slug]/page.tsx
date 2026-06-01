import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SanityImageSource } from "@sanity/image-url";
import { cache } from "react";

import { formatPublicationDateTime } from "@/lib/format-date";
import {
  absoluteUrl,
  getSanityOgImageUrl,
  resolveSeoDescription,
  toJsonLd,
} from "@/lib/seo";
import {
  siteDescription,
  siteLocale,
  siteName,
} from "@/lib/site";
import { getViewsBySlug } from "@/lib/views";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 60;

type AuthorImage = SanityImageSource & {
  alt?: string;
};

type Author = {
  name?: string;
  image?: AuthorImage;
  slug?: {
    current?: string;
  };
};

type AuthorPostCategory = {
  title: string;
  slug?: {
    current?: string;
  };
};

type AuthorPost = {
  _id: string;
  title: string;
  excerpt?: string;
  publishedAt: string;
  mainImage?: AuthorImage;
  slug?: {
    current?: string;
  };
  categories?: AuthorPostCategory[];
};

const getAuthor = cache(async (slug: string) => {
  return client.fetch<Author | null>(
    `
    *[
      _type == "author" &&
      (
        slug.current == $slug ||
        (
          $slug == "oskar-diaz" &&
          name in ["Oskar Díaz", "Oskar Diaz"]
        )
      )
    ][0]{
      name,
      slug,
      image
    }
  `,
    { slug },
  );
});

const getAuthorPosts = cache(async (slug: string) => {
  return client.fetch<AuthorPost[]>(
    `
    *[
      _type == "post" &&
      (
        author->slug.current == $slug ||
        (
          $slug == "oskar-diaz" &&
          author->name in ["Oskar Díaz", "Oskar Diaz"]
        )
      )
    ] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      mainImage,
      categories[]->{
        title,
        slug
      }
    }
  `,
    { slug },
  );
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [author, posts] = await Promise.all([
    getAuthor(slug),
    getAuthorPosts(slug),
  ]);

  if (!author?.name) {
    return {
      title: "Autor no encontrado",
      description: siteDescription,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = absoluteUrl(`/author/${slug}`);
  const description = resolveSeoDescription(
    posts[0]?.excerpt,
    `Noticias enviadas por ${author.name} en ${siteName}.`,
  );
  const imageUrl =
    getSanityOgImageUrl(author.image) || getSanityOgImageUrl(posts[0]?.mainImage);

  return {
    title: author.name,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "profile",
      locale: siteLocale,
      url,
      siteName,
      title: `${author.name} | ${siteName}`,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: author.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${author.name} | ${siteName}`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [author, posts] = await Promise.all([
    getAuthor(slug),
    getAuthorPosts(slug),
  ]);

  if (!author?.name) {
    notFound();
  }

  const validPosts = posts.filter(
    (post): post is AuthorPost & { slug: { current: string } } =>
      Boolean(post.slug?.current),
  );
  const views = await getViewsBySlug(validPosts.map((post) => post.slug.current));
  const authorUrl = absoluteUrl(`/author/${slug}`);
  const authorJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: author.name,
        url: authorUrl,
      },
      {
        "@type": "CollectionPage",
        name: `${author.name} | ${siteName}`,
        url: authorUrl,
        description: `Noticias enviadas por ${author.name}.`,
        inLanguage: "es",
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: validPosts.length,
          itemListElement: validPosts.slice(0, 24).map((post, index) => ({
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
    <main className="min-h-screen bg-[#f8f6f2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(authorJsonLd) }}
      />

      <div className="mx-auto max-w-7xl border-b newspaper-border px-6 py-10">
        <Link href="/">
          <h1 className="newspaper-title text-5xl font-black">
            OHAYERS IN THE MORNING
          </h1>
        </Link>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          {author.image && (
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[#d6d1c8] bg-[#ece8df]">
              <Image
                src={urlFor(author.image).width(240).height(240).fit("crop").url()}
                alt={author.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Autor
            </p>
            <h2 className="mt-3 newspaper-title text-[clamp(2.4rem,5vw,4.8rem)] font-black leading-none">
              {author.name}
            </h2>
            <p className="mt-4 text-sm uppercase tracking-[0.16em] text-[#7a746b]">
              {validPosts.length === 1
                ? "1 noticia enviada"
                : `${validPosts.length} noticias enviadas`}
            </p>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2">
        {validPosts.map((post) => {
          const postSlug = post.slug.current;
          const postViews = views[postSlug] ?? 0;

          return (
            <article key={post._id} className="border-b newspaper-border pb-10">
              <Link href={`/post/${postSlug}`}>
                <div className="relative mb-5 aspect-[16/10] overflow-hidden bg-[#ece8df]">
                  {post.mainImage && (
                    <Image
                      src={urlFor(post.mainImage).url()}
                      alt={post.mainImage.alt || post.title}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-500 hover:scale-[1.02]"
                    />
                  )}
                </div>
              </Link>

              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                {post.categories?.[0]?.slug?.current && (
                  <Link
                    href={`/category/${post.categories[0].slug.current}`}
                    className="transition hover:opacity-60"
                  >
                    {post.categories[0].title}
                  </Link>
                )}
              </div>

              <Link href={`/post/${postSlug}`}>
                <h3 className="newspaper-title text-[clamp(2rem,3vw,3rem)] font-black leading-[0.95] transition hover:opacity-70">
                  {post.title}
                </h3>
              </Link>

              {post.excerpt && (
                <p className="mt-4 text-lg leading-relaxed text-gray-700">
                  {post.excerpt}
                </p>
              )}

              <p className="mt-6 text-xs text-gray-500">
                {formatPublicationDateTime(post.publishedAt)}
                {postViews > 0 && (
                  <>
                    {" · "}
                    {postViews.toLocaleString()} vistas
                  </>
                )}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
