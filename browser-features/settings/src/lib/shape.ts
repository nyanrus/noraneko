// SPDX-License-Identifier: MPL-2.0
// 一枚の「かたち」── 読む前に、読む量と届く範囲を数で言う。
//
// 一枚には file が数十枚並ぶ(webpanel なら 64 枚・一万行)。人はそれを読めない。
// でも、そのうち **この drop 自身が書いた字**は数百行しかなくて、残りは
// どの drop にも同じものが入っている殻と、build が組んだものと、library。
//
// 同じかどうかは**中身で見る**(text が一字一句同じか)。ただし「同じ file が source/ と
// xpi の中の両方にある」のは当たり前なので、それは数えない ── **別の xpi にも同じ
// bytes があるか**で見る。殻は使う library の xpi にも入っているので、そこで分かれる。
// 「同じ名前だから同じ」ではなく「同じ bytes が N 個の xpi にある」なので、気休めでは
// なく事実として書ける。

import type { DropInspection, InspectedEntry } from "./privileged.ts";

export interface Bucket {
  files: number;
  lines: number;
}
export interface Shape {
  /** この drop 自身が書いた字(source のうち、殻でないもの) */
  own: Bucket;
  /** どの drop にも同じものが入っている殻。copies = この一枚の中に何か所あるか */
  shell: Bucket & { copies: number };
  /** build が組んだもの(入れると、これが動く) */
  built: Bucket;
  /** 使う library の数 */
  deps: number;
  where: string[];
  chrome: boolean;
  webFrame: boolean;
  functions: string[];
  /**
   * 決めるところが **sandbox の中**か。actor.ts が build の書いた殻への配線だけで、
   * logic は worker の中の Tsubaki ── DOM も Services も届かない。そういう drop は
   * 「できること」が**宣言だけで言い切れる**(下の VOCABULARY が天井)。
   * 自分の JS を窓の中で動かす drop は、そうではない。読むことになる。
   *
   * TODO: **sandbox は言語の性質ではなく、走る場所の性質**なので、JS の drop も
   * 同じ worker に入れれば同じことが言える(殻も、view の翻訳も、effect の carry out も
   * もう有る。足りないのは worker に Tsubaki の runtime ではなく drop の JS を読ませる
   * 入口だけ)。そうすると、この `sandboxed` が JS の drop でも true になって、UI は
   * 何も変えずに「この一覧が全部」と言えるようになる。
   * 正直なコスト: 語彙で届かない drop(rename-tab は SessionStore も `<key>` も触る)は、
   * 語彙を増やすことになる。設計と順番は `~/.shiro/js-sandbox-plan-2026-09-10.md`。
   */
  sandboxed: boolean;
  /** その配線そのもの(短いので、これは人が読める) */
  wiring: { path: string; text: string } | null;
}

/**
 * 殻が carry out できることの全部。sandbox の drop は、これ以上のことができない ──
 * 何をするかではなく、**何ができないか**が言えるのが、読まずに済むということ。
 * (tooling/webext-actors/_shared/tsubakiActor.ts の perform と、vnode.ts の ELEMENTS)
 */
export const VOCABULARY = [
  "決まった顔ぶれの要素を窓に置く(箱・ラベル・ボタン・メニューの行)",
  "about:config の pref を読む / 書く",
  "web の URL をタブで開く",
  "console に書く",
  "新しい uuid と、いま見ているタブの URL を訊く",
  "自分が置いたものの大きさを測る",
  "自分が置いた menupopup を開く",
];

const lines = (t: string) => (t ? t.split("\n").length : 0);

/**
 * 中身 → その bytes が入っている xpi の名前。二つ以上に入っていれば、それは
 * 「この drop のために書かれたもの」ではない。
 */
function byXpi(seen: DropInspection): Map<string, Set<string>> {
  const where = new Map<string, Set<string>>();
  const add = (text: string, xpi: string) => {
    const s = where.get(text) ?? new Set<string>();
    s.add(xpi);
    where.set(text, s);
  };
  for (const e of seen.entries ?? []) {
    for (const s of e.sources) add(s.text, e.file);
    for (const f of e.files) add(f.text, e.file);
  }
  for (const d of seen.deps ?? []) {
    for (const e of d.entries) for (const f of e.files) add(f.text, `${d.name}/${e.file}`);
  }
  return where;
}

export function shapeOf(seen: DropInspection): Shape {
  const entries: InspectedEntry[] = seen.entries ?? [];
  const deps = seen.deps ?? [];
  const where = byXpi(seen);

  const own: Bucket = { files: 0, lines: 0 };
  const shell = { files: 0, lines: 0, copies: 0 };
  const built: Bucket = { files: 0, lines: 0 };
  for (const e of entries) {
    for (const s of e.sources) {
      const copies = where.get(s.text)?.size ?? 1;
      if (copies > 1) {
        shell.files++; shell.lines += lines(s.text);
        shell.copies = Math.max(shell.copies, copies);
      } else {
        own.files++; own.lines += lines(s.text);
      }
    }
    for (const f of e.files) { built.files++; built.lines += lines(f.text); }
  }
  // 配線(actor.ts)が build の書いた殻への受け渡しだけかどうか。短いので、読む人も見て確かめられる
  const wiring = entries.flatMap((e) => e.sources).find((s) => /(^|\/)actor\.ts$/.test(s.path)) ?? null;
  const sandboxed = !!wiring && /runTsubakiActor\(/.test(wiring.text) && lines(wiring.text) < 40;

  return {
    own, shell, built, deps: deps.length, sandboxed, wiring,
    where: [...new Set(entries.flatMap((e) => e.matches))],
    chrome: entries.some((e) => e.chrome),
    webFrame: entries.some((e) => e.webFrame),
    functions: [...new Set(entries.flatMap((e) => e.functions))],
  };
}

/** 二つ以上の xpi に入っている bytes = どの drop にも入っている殻 */
export function duplicated(seen: DropInspection): Set<string> {
  return new Set([...byXpi(seen).entries()].filter(([, xs]) => xs.size > 1).map(([t]) => t));
}
