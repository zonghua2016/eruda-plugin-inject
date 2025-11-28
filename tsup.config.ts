import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // 确认文件存在
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  outDir: "dist",
});
