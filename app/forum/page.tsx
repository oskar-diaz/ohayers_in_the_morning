import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Foro",
  description:
    "Foro de Ohayers in the Morning para hablar de Japón, noticias, ideas y divagues varios.",
  alternates: {
    canonical: absoluteUrl("/forum"),
  },
  openGraph: {
    title: `Foro | ${siteName}`,
    description:
      "Categorías, posts y respuestas de la comunidad de Ohayers in the Morning.",
    url: absoluteUrl("/forum"),
    siteName,
    type: "website",
  },
};

export default function ForumPage() {
  return <ForumClient />;
}
