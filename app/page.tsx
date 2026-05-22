import Link from "next/link";
import Image from "next/image";

import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 0;

async function getPosts() {
  return client.fetch(`
    *[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      mainImage,
      categories[]->{
        title
      },
      author->{
        name,
        image
      }
    }
  `);
}

export default async function Home() {
  const posts = await getPosts();

  const featured = posts[0];
  const latest = posts.slice(1, 5);

  return (
    <main className="bg-[#f8f6f2] min-h-screen">
      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center py-4 border-b newspaper-border text-sm">
          <p>{new Date().toLocaleDateString()}</p>

          <p className="uppercase tracking-[0.3em] text-xs">
            Noticias falsas. Verdad absoluta.
          </p>

          <p>Tokio 18°C</p>
        </div>
      </div>

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
    leading-[0.9]
    tracking-[-0.055em]
    whitespace-nowrap
    text-[clamp(2.8rem,8vw,6.5rem)]
  "
            >
              OHAYERS IN THE MORNING
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
            El periódico a tope de Ikigai
          </p>
        </div>

        {/* NAV */}
        <div className="flex justify-center mt-10">
          <nav className="flex gap-8 uppercase text-sm overflow-x-auto">
            <p className="hover:opacity-60 transition cursor-pointer">Japón</p>

            <p className="hover:opacity-60 transition cursor-pointer">
              Tecnología
            </p>

            <p className="hover:opacity-60 transition cursor-pointer">
              Economía
            </p>

            <p className="hover:opacity-60 transition cursor-pointer">
              Cultura
            </p>

            <p className="hover:opacity-60 transition cursor-pointer">
              Opinión
            </p>
          </nav>
        </div>
      </header>

      {/* HERO */}
      {featured && (
        <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-[1.4fr_1fr] gap-12 border-b newspaper-border">
          {/* IMAGE */}
          <Link href={`/post/${featured.slug.current}`}>
            <div className="relative aspect-[16/10] overflow-hidden">
              {featured.mainImage && (
                <Image
                  src={urlFor(featured.mainImage).url()}
                  alt={featured.title}
                  fill
                  priority
                  className="object-cover hover:scale-[1.02] transition duration-500"
                />
              )}
            </div>
          </Link>

          {/* TEXT */}
          <div className="flex flex-col justify-center">
            {featured.categories?.[0] && (
              <p className="uppercase text-red-700 font-semibold tracking-wide text-sm mb-4">
                {featured.categories[0].title}
              </p>
            )}

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

            <p className="mt-8 text-2xl text-gray-700 leading-relaxed font-light">
              {featured.excerpt}
            </p>

            {/* AUTHOR */}
            <div className="flex items-center gap-4 mt-10">
              {featured.author?.image && (
                <div className="relative w-14 h-14 rounded-full overflow-hidden">
                  <Image
                    src={urlFor(featured.author.image).url()}
                    alt={featured.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div>
                <p className="font-semibold">{featured.author?.name}</p>

                <p className="text-gray-500 text-sm">
                  {new Date(featured.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* NEWS GRID */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
        {latest.map((post: any) => (
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
              <h3 className="newspaper-title text-[clamp(2rem,3vw,3.2rem)] font-black leading-[0.95] hover:opacity-70 transition">
                {post.title}
              </h3>
            </Link>

            {/* EXCERPT */}
            <p className="mt-4 text-gray-700 leading-relaxed text-lg">
              {post.excerpt}
            </p>

            {/* AUTHOR */}
            <div className="flex items-center gap-3 mt-6">
              {post.author?.image && (
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={urlFor(post.author.image).url()}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div>
                <p className="font-medium text-sm">{post.author?.name}</p>

                <p className="text-gray-500 text-xs">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* FOOTER */}
      <footer className="border-t newspaper-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="italic text-xl newspaper-title">
            ¿¡A qué estamos aquí, copón!? ¿¡A ikigais o a setas?!?
          </p>

          <div className="flex justify-center gap-8 mt-8 uppercase text-sm">
            <p>Instagram</p>
            <p>X</p>
            <p>TikTok</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
