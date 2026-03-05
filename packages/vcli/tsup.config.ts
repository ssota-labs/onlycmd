import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli/index.ts",
  },
  format: ["esm"],
  dts: { entry: { index: "src/index.ts" } },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
