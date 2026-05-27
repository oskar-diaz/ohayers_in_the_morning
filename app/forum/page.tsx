import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import {
  forumDefaultDescription,
  getForumShareMetadata,
} from "@/lib/forum-seo";

export const metadata: Metadata = {
  title: "Foro",
  ...getForumShareMetadata({
    description: forumDefaultDescription,
    path: "/forum",
    title: "Foro",
  }),
};

export default function ForumPage() {
  return <ForumClient />;
}
