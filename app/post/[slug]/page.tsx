import { redis } from "@/lib/redis";
import Image from "next/image";
import Link from "next/link";

import { PortableText } from "@portabletext/react";

import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 0;

async function getPost(slug: string) {
  return client.fetch(`
    *[_type == "post" && slug.current == "${slug}"][0]{
      title,
      publishedAt,
      excerpt,
      body,
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
}

/* SEO + SOCIAL SHARE */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await getPost(slug);

  if (!post) {
    return {};
  }

  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(1200).height(630).url()
    : "";

  return {
    title: `${post.title} | OHAYERS IN THE MORNING`,

    description: post.excerpt,

    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await getPost(slug);

  if (!post) {
    return (
      <main className="p-10">
        <h1>Pues no fona esto, el ikigai que se ha ido por el orto</h1>
      </main>
    );
  }

  const viewsKey = `views:${slug}`;

  await redis.incr(viewsKey);

  const views = await redis.get<number>(viewsKey);

  return (
    <main className="bg-[#f8f6f2] min-h-screen">
      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center py-4 border-b newspaper-border text-sm">
          <p>{new Date().toLocaleDateString()}</p>

          <Link href="/">
            <p className="uppercase tracking-[0.3em] text-xs hover:opacity-70 transition">
              OHAYERS IN THE MORNING
            </p>
          </Link>

          <p>Tokyo 18°C</p>
        </div>
      </div>

      {/* HERO IMAGE */}
      {post.mainImage && (
        <div className="w-full bg-[#ece8df] border-b newspaper-border">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <Image
              src={urlFor(post.mainImage).url()}
              alt={post.title}
              width={1600}
              height={900}
              priority
              className="
          w-full
          h-auto
          object-contain
          max-h-[85vh]
        "
            />
          </div>
        </div>
      )}

      {/* ARTICLE */}
      <article className="max-w-5xl mx-auto px-6 py-16">
        {/* CATEGORY */}
        {post.categories?.[0]?.slug?.current && (
          <Link href={`/category/${post.categories[0].slug.current}`}>
            <p className="uppercase text-red-700 font-semibold tracking-wide text-sm mb-5 hover:opacity-60 transition">
              {post.categories[0].title}
            </p>
          </Link>
        )}

        {/* TITLE */}
        <h1 className="text-5xl md:text-7xl font-black leading-none newspaper-title">
          {post.title}
        </h1>

        {/* EXCERPT */}
        {post.excerpt && (
          <p className="mt-10 text-2xl text-gray-700 leading-relaxed font-light max-w-4xl">
            {post.excerpt}
          </p>
        )}

        {/* META */}
        <div className="flex items-center justify-between mt-12 pb-10 border-b newspaper-border">
          {/* AUTHOR */}
          <div className="flex items-center gap-4">
            {post.author?.image && (
              <div className="relative w-14 h-14 rounded-full overflow-hidden">
                <Image
                  src={urlFor(post.author.image).url()}
                  alt={post.author.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div>
              <p className="font-semibold text-lg">{post.author?.name}</p>

              <p className="text-gray-500 text-sm">Redacción Ohayers</p>
            </div>
          </div>

          {/* DATE */}
          <div className="text-right">
            <p className="text-gray-500">
              {new Date(post.publishedAt).toLocaleDateString()}
            </p>

            <p className="text-gray-400 text-sm mt-1">
              {views?.toLocaleString()} views
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="mt-16 max-w-[850px] mx-auto">
          <PortableText
            value={post.body}
            components={{
              types: {
                image: ({ value }) => (
                  <figure className="md:float-right w-full md:w-[320px] md:ml-8 md:mb-4 my-8">
                    <div className="relative overflow-hidden rounded-sm bg-[#ece8df]">
                      <Image
                        src={urlFor(value).url()}
                        alt={value.alt || "Article image"}
                        width={800}
                        height={1200}
                        className="w-full h-auto object-contain"
                      />
                    </div>

                    {value.alt && (
                      <figcaption className="text-xs text-gray-500 mt-2 italic leading-relaxed">
                        {value.alt}
                      </figcaption>
                    )}
                  </figure>
                ),
              },

              block: {
                h1: ({ children }) => (
                  <h1 className="text-5xl font-black newspaper-title mt-16 mb-8 leading-none">
                    {children}
                  </h1>
                ),

                h2: ({ children }) => (
                  <h2 className="text-4xl font-black newspaper-title mt-14 mb-6 leading-tight">
                    {children}
                  </h2>
                ),

                normal: ({ children }) => (
                  <p className="text-[1.15rem] md:text-[1.3rem] leading-[2] text-[#222] mb-7 font-light">
                    {children}
                  </p>
                ),

                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-black pl-6 italic text-3xl leading-relaxed newspaper-title py-4 my-10">
                    {children}
                  </blockquote>
                ),
              },
            }}
          />

          <div className="clear-both" />
        </div>
        {/* SHARE */}
        <div className="mt-24 pt-10 border-t newspaper-border">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex gap-4">
              {/* TWITTER/X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  post.title,
                )}&url=${encodeURIComponent(
                  `https://ohayers-in-the-morning.vercel.app/post/${slug}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="
          px-5
          py-3
          border
          newspaper-border
          uppercase
          text-sm
          tracking-wide
          hover:bg-black
          hover:text-white
          transition
        "
              >
                Pa twitter
              </a>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
