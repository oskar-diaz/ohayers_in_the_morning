import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";

import { dataset, projectId } from "./sanity/env";
import { schema } from "./sanity/schemaTypes";

export default defineConfig({
  basePath: "/studio",

  projectId,
  dataset,

  schema,

  plugins: [visionTool()],
});
