import Link from "next/link";
import Image from "next/image";

import { getDisplayAuthorName } from "@/lib/display-author";
import { getViewsBySlug } from "@/lib/views";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 0;

async function getCategoryPosts(slug: string) {
  return client.fetch(
    `
    *[
      _type == "post" &&
      $slug in categories[]->slug.current
    ] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      mainImage,
      author->{
        name,
        image
      },
      categories[]->{
        title,
        slug
      }
    }
  `,
    { slug },
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const posts = await getCategoryPosts(slug);
  const views = await getViewsBySlug(
    posts
      .map((post: any) => post.slug?.current)
      .filter((postSlug: string | undefined): postSlug is string =>
        Boolean(postSlug),
      ),
  );

  return (
    <main className="bg-[#f8f6f2] min-h-screen">
      {/* TOP */}
      <div className="max-w-7xl mx-auto px-6 py-10 border-b newspaper-border">
        <Link href="/">
          <h1 className="newspaper-title text-5xl font-black">
            OHAYERS IN THE MORNING
          </h1>
        </Link>

        <p className="uppercase text-red-700 tracking-[0.3em] text-xs mt-4">
          Categoría: {slug}
        </p>
      </div>

      {/* POSTS */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
        {posts.map((post: any) => {
          const displayAuthorName = getDisplayAuthorName(post.slug.current);

          return (
            <article key={post._id} className="border-b newspaper-border pb-10">
              {/* IMAGE */}
              <Link href={`/post/${post.slug.current}`}>
                <div className="relative aspect-[16/10] overflow-hidden mb-5">
                  {post.mainImage && (
                    <Image
                      src={urlFor(post.mainImage).url()}
                      alt={post.title}
                      fill
                      className="object-cover hover:scale-[1.02] transition duration-500"
                    />
                  )}
                </div>
              </Link>

              {/* CATEGORY */}
              {post.categories?.[0] && (
                <p className="uppercase text-red-700 font-semibold tracking-wide text-xs mb-3">
                  {post.categories[0].title}
                </p>
              )}

              {/* TITLE */}
              <Link href={`/post/${post.slug.current}`}>
                <h2 className="newspaper-title text-[clamp(2rem,3vw,3rem)] font-black leading-[0.95] hover:opacity-70 transition">
                  {post.title}
                </h2>
              </Link>

              {/* EXCERPT */}
              <p className="mt-4 text-gray-700 leading-relaxed text-lg">
                {post.excerpt}
              </p>

              {/* AUTHOR */}
              <div className="mt-6">
                <div>
                  <p className="font-medium text-sm">{displayAuthorName}</p>

                  <p className="text-gray-500 text-xs">
                    {new Date(post.publishedAt).toLocaleDateString()}
                    {" · "}
                    {(views[post.slug.current] ?? 0).toLocaleString()} vistas
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
