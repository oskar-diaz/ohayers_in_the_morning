"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function HideOnStudio({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/studio")) {
    return null;
  }

  return <>{children}</>;
}
