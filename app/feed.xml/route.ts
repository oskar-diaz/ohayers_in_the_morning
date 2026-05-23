import { client } from "@/sanity/lib/client";
import { siteName, siteUrl } from "@/lib/site";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 1800;

type FeedPost = {
  title: string;
  slug: {
    current: string;
  };
  publishedAt: string;
  excerpt?: string;
  mainImage?: unknown;
  author?: {
    name?: string;
  };
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeCdata(value: string) {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

async function getFeedPosts() {
  return client.fetch<FeedPost[]>(`
    *[_type == "post"] | order(publishedAt desc) {
      title,
      slug,
      publishedAt,
      excerpt,
      mainImage,
      author->{
        name
      }
    }
  `);
}

export async function GET() {
  const posts = await getFeedPosts();
  const buildDate = posts[0]?.publishedAt || new Date().toISOString();

  const items = posts
    .filter((post) => post.slug?.current)
    .map((post) => {
      const url = `${siteUrl}/post/${post.slug.current}`;
      const title = escapeXml(post.title);
      const imageUrl = post.mainImage
        ? urlFor(post.mainImage).width(1200).height(630).fit("crop").url()
        : "";
      const descriptionHtml = `
        ${imageUrl ? `<p><img src="${imageUrl}" alt="${escapeXml(post.title)}" /></p>` : ""}
        ${post.excerpt ? `<p>${escapeXml(post.excerpt)}</p>` : ""}
      `.trim();
      const author = post.author?.name
        ? `<author>${escapeXml(post.author.name)}</author>`
        : "";
      const mediaContent = imageUrl
        ? `<media:content url="${imageUrl}" medium="image" />`
        : "";

      return `
        <item>
          <title>${title}</title>
          <link>${url}</link>
          <guid>${url}</guid>
          <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
          <description><![CDATA[${escapeCdata(descriptionHtml)}]]></description>
          ${mediaContent}
          ${author}
        </item>
      `.trim();
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>Las ultimas noticias de ${escapeXml(siteName)}</description>
    <language>es</language>
    <lastBuildDate>${new Date(buildDate).toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
