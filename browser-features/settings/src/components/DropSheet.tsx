// SPDX-License-Identifier: MPL-2.0
// 一枚の裏 ── **中身を読むところ**。絵と説明と「ねこにいれる」は表(Store.tsx)にあって、
// ここには読むためのものだけが並ぶ: 要約(どこで動く / できること / 読むところ)、
// この drop 自身の字、そして畳んである残り。
// ここに出ているものは全部「読んだだけ」で、まだ何も実行していない

import type { AttestationCheck, DropInspection, InspectedDep, InspectedEntry } from "../lib/privileged.ts";
import { allAttested } from "../lib/privileged.ts";
import { sheetText } from "../lib/sheet.ts";
import { Files } from "./Files.tsx";
import { Summary } from "./Summary.tsx";
import { duplicated } from "../lib/shape.ts";

function Stamp({ a, registry }: { a: AttestationCheck; registry: string }) {
  return (
    <div class={`stamp ${a.ok ? "ok" : "ng"}`}>
      <span class="who">{a.ok ? "判あり" : "判なし / 合わない"} · {a.who}({registry})</span>
      <span class="id">{a.identity}</span>
      {a.rekorUrl && <a href={a.rekorUrl} target="_blank">Rekor</a>}
      {!a.ok && a.reason && <span class="id">{a.reason}</span>}
    </div>
  );
}

function Entry({ e, shell }: { e: InspectedEntry; shell: Set<string> }) {
  const own = e.sources.filter((s) => !shell.has(s.text));
  const same = e.sources.filter((s) => shell.has(s.text));
  return (
    <div class="entry">
      <span class="name">{e.name} <code class="code">{e.id} @ {e.version}</code></span>
      <span class="fact">動くページ: {e.matches.join(", ") || "(なし)"}</span>
      {e.chrome && <span class="fact">ブラウザの窓そのものに効く(タブや画面を作り替えられる)</span>}
      <span class="fact">権限: {e.permissions.join(", ") || "(なし)"}</span>
      <span class="fact">親プロセスで呼べる関数: {e.functions.join(", ") || "(なし)"}</span>
      <Files title="この drop 自身の字" note="ここだけが、この drop のために書かれたもの"
        files={own.map((s) => ({ path: s.path, text: s.text }))} />
      <Files fold title="どの drop も同じ殻" note="使う library の xpi にも同じ bytes が入っている。一度読めば、ぜんぶの drop に効く"
        files={same.map((s) => ({ path: s.path, text: s.text }))} />
      <Files fold title="実際に実行される" note="上の source から build が組んだもの。sha256 が、判の押された manifest と合っている"
        files={e.files.map((f) => ({ path: f.path, text: f.text }))} />
    </div>
  );
}

/** 使う library drop(std など)。版は manifest に固定されたもの。判と中身はこの drop と同じように読める */
function Dep({ d, registry }: { d: InspectedDep; registry: string }) {
  const ok = d.attestations.every((a) => a.ok);
  return (
    <details class="entry fold">
      {/* 版は、開かなくても見えるところに。正体は sha256 と判のほうだけれど、
          「入っているものと較べる」「壊れたときに言う」には、まずこれが要る */}
      <summary>
        <span class="name">使う: {d.name}</span>
        <code class="code">{d.version}</code>
        <span class={`mark ${ok ? "ok" : "ng"}`}>{ok ? "判あり" : "判なし"}</span>
        <span class="n">{d.manifest.note ?? ""}</span>
      </summary>
      <span class="fact">
        {d.lib && "lib.js を同じ scope に読む"}
        {d.lib && d.wasm && " · "}
        {d.wasm && "wasm(Tsubaki の runtime)を sandbox で起こす"}
      </span>
      {d.attestations.map((a, i) => <Stamp key={i} a={a} registry={registry} />)}
      <Files fold title="実際に実行される" note="この library の中身。それ自身が registry の一枚で、判もそこで押されている"
        files={d.entries.flatMap((e) => e.files.map((f) => ({ path: `${e.file}/${f.path}`, text: f.text })))} />
    </details>
  );
}

function Caution() {
  return (
    <div class="caution">
      <strong>入れるときは、特に注意して。</strong>
      <br />
      この registry の判が無いか、合っていない。中身が registry のレビューを通ったものかどうか、ここからは分からない。
      上の「書いたもの」と「実際に実行される」を自分で読んで、それでも入れたいときだけ押して。
    </div>
  );
}

export function DropSheet({ seen, busy, onInstall }: { seen: DropInspection; busy: boolean; onInstall: () => void }) {
  const ok = allAttested(seen);
  // 同じ bytes が二か所以上にあるもの = どの drop にも入っている殻
  const shell = duplicated(seen);
  return (
    <div class="sheet">
      <p class="meta" style={{ margin: "0 0 0.5rem" }}>
        {/* 落とした xpi の中から読んだ絵。ここでは何も取りに行かない */}
        {seen.icon && <img class="icon" src={seen.icon} alt="" />}
        <span class="k">{seen.name}</span> <code class="code">{seen.uuid}</code> <span>· {seen.registry.name}</span></p>
      {seen.attestations.map((a) => <Stamp key={a.who} a={a} registry={seen.registry.name} />)}
      <Summary seen={seen} />
      {seen.entries.map((e) => <Entry key={e.id} e={e} shell={shell} />)}
      {(seen.deps ?? []).map((d) => <Dep key={d.uuid} d={d} registry={seen.registry.name} />)}
      {!ok && <Caution />}
      <div class="actions">
        <button class={ok ? "primary" : "danger"} disabled={busy} onClick={onInstall}>
          {ok ? "入れる" : "判なしでも入れる"}
        </button>
        <button class="quiet" disabled={busy} onClick={() => navigator.clipboard.writeText(sheetText(seen))}>
          コピー(AI や人に見せる一枚)
        </button>
      </div>
    </div>
  );
}
