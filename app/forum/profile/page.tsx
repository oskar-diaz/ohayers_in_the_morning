import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Perfil del foro",
  description: "Gestiona tu nombre, avatar y bio del foro de Ohayers.",
  alternates: {
    canonical: absoluteUrl("/forum/profile"),
  },
  openGraph: {
    title: `Perfil del foro | ${siteName}`,
    description: "Gestiona tu perfil de la comunidad de Ohayers.",
    url: absoluteUrl("/forum/profile"),
    siteName,
    type: "website",
  },
};

export default function ForumProfilePage() {
  return <ForumClient profileOnly />;
}
