#!/usr/bin/env bun
// Arayüzü `dist/`e paketler; yayınlanan paket onu sunar, çalışma anında bağımlılık gerekmez.
import { rmSync } from "node:fs";
import tailwind from "bun-plugin-tailwind";

rmSync("dist", { recursive: true, force: true });
const out = await Bun.build({
  entrypoints: ["src/index.html"],
  outdir: "dist",
  minify: true,
  plugins: [tailwind],
  define: { "process.env.NODE_ENV": '"production"' },
});
if (!out.success) {
  for (const log of out.logs) console.error(log);
  process.exit(1);
}
for (const o of out.outputs) console.log(`  ${o.path.replace(`${process.cwd()}/`, "")}  ${(o.size / 1024).toFixed(0)} kB`);
