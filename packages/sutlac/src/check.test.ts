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

test("alt projeye göreli yol: kendi belgesinde, tek alt projeli belgede ve bölüm bağlamında çözülür", () => {
  const r = mkdtempSync(join(tmpdir(), "sutlac-check-sub-"));
  const w = (rel: string, text: string) => {
    mkdirSync(join(r, rel, ".."), { recursive: true });
    writeFileSync(join(r, rel), text);
  };
  try {
    w("docs/config.json", "{}");
    w("scripts/root.sh", "");
    w("apps/api/CLAUDE.md", "`scripts/seed.ts` var, `scripts/yok.ts` yok");
    w("apps/api/scripts/seed.ts", "");
    w("apps/api/src/a.ts", "");
    w("apps/web/CLAUDE.md", "");
    w("apps/web/src/b.tsx", "");
    // Tek alt projeden söz eden belge: göreli yollar ona aittir.
    w("docs/knowledge/api.md", "`apps/api` üstüne.\n`scripts/seed.ts` var, `src/a.ts` var, `src/yok.ts` yok, `scripts/root.sh` kökte");
    // İki alt proje: aynı bölümde en son anılan; bağlam yoksa atlanır.
    w(
      "CLAUDE.md",
      ["`src/belirsiz.ts` bağlam yok, atlanır", "## Panel", "`apps/web` klasörü", "`src/b.tsx` var, `src/a.ts` yok (web'de değil)", "## Api", "`apps/api/src/a.ts` ve `src/a.ts` var", "## Başka", "`scripts/kayip.sh` kökte de scripts/ var, bağlam yok: kökte aranır"].join("\n"),
    );
    const { findings } = runCheck(r, "docs");
    expect(findings.map((f) => `${f.file}:${f.line} ${f.path}`)).toEqual([
      "CLAUDE.md:4 src/a.ts",
      "CLAUDE.md:8 scripts/kayip.sh",
      "apps/api/CLAUDE.md:1 scripts/yok.ts",
      "docs/knowledge/api.md:2 src/yok.ts",
    ]);
  } finally {
    rmSync(r, { recursive: true, force: true });
  }
});
