import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCheck } from "./check";

const repo = mkdtempSync(join(tmpdir(), "sutlac-check-"));
afterAll(() => rmSync(repo, { recursive: true, force: true }));
const write = (rel: string, text: string) => {
  mkdirSync(join(repo, rel, ".."), { recursive: true });
  writeFileSync(join(repo, rel), text);
};

test("olmayan yol ve kırık resim bulunur; yer tutucu, kod bloğu ve .checkignore atlanır", () => {
  write("src/a.ts", "");
  write("apps/api/src/b.ts", "");
  write("docs/images/x.png", "");
  write("docs/config.json", "{}");
  write(
    "CLAUDE.md",
    ["`src/a.ts` var", "`src/yok.ts` yok", "`docs/tasks/KES-N.md` yer tutucu", "`a/b` yol değil", "`src/eski.ts` bilerek", "```", "`src/blok.ts`", "```"].join("\n"),
  );
  write("apps/api/CLAUDE.md", "`src/b.ts` uygulamaya göre var, `src/c.ts` yok");
  write("docs/tasks/KES-1.md", "![](../images/x.png) ![](../images/yok.png) ![](https://x.dev/a.png)");
  write("docs/.checkignore", "# tarihsel\nsrc/eski.ts  # silindi\n");

  const { findings } = runCheck(repo, "docs");
  expect(findings.map((f) => `${f.file}:${f.line} ${f.path}`)).toEqual([
    "CLAUDE.md:2 src/yok.ts",
    "apps/api/CLAUDE.md:1 src/c.ts",
    "docs/tasks/KES-1.md:1 ../images/yok.png",
  ]);
});
