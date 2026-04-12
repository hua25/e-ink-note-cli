import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  outExtension: () => ({ js: ".js" }),
  target: "node18",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
