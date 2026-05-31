import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Perfil",
  description: "Gestiona tu nombre, avatar y bio.",
  alternates: {
    canonical: absoluteUrl("/forum/profile"),
  },
  openGraph: {
    title: `Perfil | ${siteName}`,
    description: "Gestiona tu perfil de Ohayers.",
    url: absoluteUrl("/forum/profile"),
    siteName,
    type: "website",
  },
};

export default function ForumProfilePage() {
  return <ForumClient profileOnly />;
}
