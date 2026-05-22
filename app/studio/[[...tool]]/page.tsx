export const dynamic = "force-static";

export { metadata, viewport } from "next-sanity/studio";

import StudioClient from "../StudioClient";

export default function StudioPage() {
  return <StudioClient />;
}
