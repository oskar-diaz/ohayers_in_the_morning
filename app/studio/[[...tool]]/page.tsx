export const dynamic = "force-static";

export { viewport } from "next-sanity/studio";

import StudioClient from "../StudioClient";

export default function StudioPage() {
  return <StudioClient />;
}
