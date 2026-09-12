// SPDX-License-Identifier: MPL-2.0
// 読むための file の並べかた。
//
// 前は `<details>` を縦に積んでいた ── webpanel なら「書いたもの」九枚に「実際に
// 実行される」が続き、その下に使う library ぶんがまた続く。何が入っているのかは、
// 下まで巻かないと分からない。審査で読むところなのに、目次が無かった。
//
// 面に置く: 一枚が一つの札で、**名前と行数だけ**が見えている。押した一枚だけが
// 横いっぱいに広がる(`.filegrid details[open]`)。一覧としては二次元、読むときは
// 一次元 ── 読む字を狭い桁に押し込めない。
//
// そして **見ないでいいものは、開いていない**。出しておくことは読んだことにならないし、
// 六十四枚が並んでいると、読むべき三枚が埋もれる。畳むものには「なぜ読まなくていいか」を
// 一行つける ── 隠すのではなく、後回しにしていい理由を言う。

export interface Readable {
  path: string;
  text: string;
}

function lines(text: string): number {
  return text ? text.split("\n").length : 0;
}

/** dir は薄く、file 名は濃く。どこの一枚かが目で分かれるように */
function Name({ path }: { path: string }) {
  const cut = path.lastIndexOf("/") + 1;
  return (
    <span class="k">
      {cut > 0 && <span class="dir">{path.slice(0, cut)}</span>}
      {path.slice(cut)}
    </span>
  );
}

export function Files({ title, note, files, fold }: {
  title: string;
  note?: string;
  files: Readable[];
  /** 見ないでいいもの。畳んでおく(note がその理由になる) */
  fold?: boolean;
}) {
  if (!files.length) return null;
  const total = files.reduce((n, f) => n + lines(f.text), 0);
  const grid = (
    <div class="filegrid">
      {files.map((f) => (
        <details key={f.path}>
          <summary><Name path={f.path} /> <span class="n">{lines(f.text)}</span></summary>
          <pre class="code">{f.text}</pre>
        </details>
      ))}
    </div>
  );
  if (fold) {
    return (
      <details class="files fold">
        <summary>
          <span class="k">{title}</span>
          <span class="n">{files.length} files · {total} lines</span>
          {note && <span class="note">{note}</span>}
        </summary>
        {grid}
      </details>
    );
  }
  return (
    <div class="files">
      <div class="files-head">
        <span class="k">{title}</span>
        <span class="n">{files.length} files · {total} lines</span>
        {note && <span class="note">{note}</span>}
      </div>
      {grid}
    </div>
  );
}
