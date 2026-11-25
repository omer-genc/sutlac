#!/usr/bin/env bun
/**
 * Geliştirme girişi: arayüz HTML import'uyla çalışma anında paketlenir (HMR). Tailwind eklentisi
 * bunfig.toml'dan gelir; Bun onu çalıştığı klasörden okur, bu yüzden paket klasöründen başlat:
 * `bun run dev -- --dir <docs klasörü>`
 */
import index from "./index.html";
import { findRoot, start } from "./server";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

start({
  root: findRoot(flag("--dir") ?? process.env.DOCS_DIR),
  port: Number(flag("--port") ?? process.env.DOCS_PORT ?? 4400),
  open: !args.includes("--no-open"),
  index,
});
