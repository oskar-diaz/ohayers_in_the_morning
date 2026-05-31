import type { Metadata } from "next";

import ForumUsersAdmin from "@/app/components/forum/ForumUsersAdmin";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Usuarios",
  description: "Panel privado de usuarios del foro.",
  alternates: {
    canonical: absoluteUrl("/forum/users"),
  },
  robots: {
    follow: false,
    index: false,
  },
  openGraph: {
    title: `Usuarios | ${siteName}`,
    description: "Panel privado de usuarios del foro.",
    url: absoluteUrl("/forum/users"),
    siteName,
    type: "website",
  },
};

export default function ForumUsersPage() {
  return <ForumUsersAdmin />;
}
