// SPDX-License-Identifier: MPL-2.0
// 一枚の頭。**読む前に読む量と届く範囲を言う。**
//
// 下には file が数十枚並ぶ(webpanel なら 64 枚・一万行)。人はそれを読めない。
// 読めないものを出して「審査した」と呼ぶのは嘘に近いので、読まなくても確かめられる
// ものを先に、大きく出す:
//
//   どこで動くか    ページか、ブラウザの窓そのものか
//   できること      sandbox の drop なら、**宣言だけで言い切れる**(殻の語彙が天井)
//   読むところ      この drop 自身の字は何行か(残りは殻と build の産物と library)

import type { DropInspection } from "../lib/privileged.ts";
import { VOCABULARY, shapeOf } from "../lib/shape.ts";

export function Summary({ seen }: { seen: DropInspection }) {
  const s = shapeOf(seen);
  return (
    <div class="summary">
      <div class="sum-row">
        <span class="sum-k">どこで動くか</span>
        <span class="sum-v">
          {s.chrome
            ? <><b>ブラウザの窓そのもの</b> — タブや画面を作り替えられる場所</>
            : <>ページの中だけ</>}
          <span class="sum-sub">{s.where.join(" · ") || "(書かれていない)"}</span>
        </span>
      </div>

      <div class="sum-row">
        <span class="sum-k">できること</span>
        <span class="sum-v">
          {s.sandboxed
            ? (
              <>
                <b>この一覧が全部</b> — 決めているのは sandbox(worker)の中で、窓に触るのは殻だけ。
                DOM も Services も、そこには届かない。
                <ul class="sum-list">
                  {VOCABULARY.map((v) => <li key={v}>{v}</li>)}
                  {s.webFrame && <li><b>ページを読み込む窓を置く</b>(この drop は、これも宣言している)</li>}
                </ul>
                <span class="sum-sub">
                  この話が成り立つ配線は {s.wiring?.path}({s.wiring ? s.wiring.text.split("\n").length : 0} 行)。
                  短いので、下でそのまま読める。
                </span>
              </>
            )
            : (
              <>
                <b>書いてある JS 次第</b> — この drop は自分の JS を窓の中で動かす。
                何ができるかは、下の「実際に実行される」を読んで決めることになる。
                {s.functions.length > 0 && <span class="sum-sub">親プロセスで呼べる関数: {s.functions.join(", ")}</span>}
              </>
            )}
        </span>
      </div>

      <div class="sum-row">
        <span class="sum-k">読むところ</span>
        <span class="sum-v">
          <b>この drop 自身の字 {s.own.files} files · {s.own.lines} lines</b>
          <span class="sum-sub">
            これだけが、この drop のために書かれたもの。残りは畳んである ──
            どの drop も同じ殻 {s.shell.lines} lines
            {s.shell.copies > 1 && `(同じ bytes が ${s.shell.copies} つの xpi に)`}
            {" / "}build が組んだもの {s.built.lines} lines
            {s.deps > 0 && ` / 使う library ${s.deps} つ`}
          </span>
          {(seen.deps ?? []).length > 0 && (
            <span class="sum-sub">
              使う library:{" "}
              {(seen.deps ?? []).map((d, i) => (
                <span key={d.uuid}>{i > 0 && " · "}{d.name} <code class="code">{d.version}</code></span>
              ))}
              {" "}— それぞれが registry の一枚で、判もそこで押されている
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
