// SPDX-License-Identifier: MPL-2.0
// 棚: drop を面に並べる。一件が一枚の札で、押すとその drop のパネルへ。
//
// 前は一列の行だった。数が増えると、上から下へ読むしかない ── 名前も一言も
// 端に押しやられて、絵の意味も無くなる。GNOME Software と同じ形にした:
// 面に並べて、選んだ一つは**別のパネル**で開く。
//
// 並ぶ字(名前・一言)は registry から来たもの。**必ずテキストとして描く**。

import type { CatalogItem, InstalledDrop } from "../lib/privileged.ts";

// 絵が無い drop のタイル。サイト(noraneko.f3liz.casa)と同じ六色から、名前で決める
const TINTS = ["sakura", "tamago", "sora", "wakaba", "fuji", "momo"];
export function tintOf(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % TINTS.length;
  return TINTS[n];
}
export function Icon({ item }: { item: { icon?: string | null; name: string } }) {
  if (item.icon) return <img class="icon" src={item.icon} alt="" />;
  return <span class={`icon tile ${tintOf(item.name)}`}>{[...item.name][0] ?? "?"}</span>;
}

/** 1.3.0 と 1.10.0 を数で比べる(字で比べると 10 < 3 になる) */
export function newer(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const xs = a.split(".").map(Number), ys = b.split(".").map(Number);
  for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
    const x = xs[i] ?? 0, y = ys[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false;
    if (x !== y) return x > y;
  }
  return false;
}

export function Shelf({ items, installed, onOpen }: {
  items: CatalogItem[];
  installed: Record<string, InstalledDrop>;
  onOpen: (i: CatalogItem) => void;
}) {
  return (
    <div class="shelf">
      {items.map((i) => {
        const have = installed[i.uuid];
        const update = have && newer(i.version, have?.versions?.[0]);
        return (
          <button
            class="tile-card"
            key={`${i.registry}:${i.uuid}`}
            onClick={() => onOpen(i)}
            title={i.uuid}
          >
            <Icon item={i} />
            <span class="name">{i.name}</span>
            <span class="desc">{i.note}</span>
            <span class="foot">
              <code class="code">{i.version ?? "?"}</code>
              <span class="mark">{i.rekor === null ? "判なし" : "判あり"}</span>
              {have && <span class="pill">{update ? "新しい版" : "入っている"}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
