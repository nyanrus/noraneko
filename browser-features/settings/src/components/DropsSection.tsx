// SPDX-License-Identifier: MPL-2.0
// Drops: 棚を見る → 一枚を見る(何も実行しない) → 入れる → 戻す。中身は modules/Drops.sys.mts
//
// 棚に並ぶ字(名前・一言・連絡先)は registry から来たもの。**必ずテキストとして描く**。
// 並んでいるのは「その registry がいま配れるもの」だけ(判が通らないものは index に出てこない)。

import { useEffect, useState } from "preact/hooks";
import { dropsApi } from "../lib/privileged.ts";
import type { CatalogItem, DropInspection, InstalledDrop } from "../lib/privileged.ts";
import { useTask } from "../lib/useTask.ts";
import { Registries } from "./Registries.tsx";
import { DropSheet } from "./DropSheet.tsx";

// 絵が無い drop のタイル。サイト(noraneko.f3liz.casa)と同じ六色から、名前で決める
const TINTS = ["sakura", "tamago", "sora", "wakaba", "fuji", "momo"];
function tintOf(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % TINTS.length;
  return TINTS[n];
}
function Icon({ item }: { item: CatalogItem }) {
  if (item.icon) return <img class="icon" src={item.icon} alt="" />;
  return <span class={`icon tile ${tintOf(item.name)}`}>{[...item.name][0] ?? "?"}</span>;
}

/** 1.3.0 と 1.10.0 を数で比べる(字で比べると 10 < 3 になる) */
function newer(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const xs = a.split(".").map(Number), ys = b.split(".").map(Number);
  for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
    const x = xs[i] ?? 0, y = ys[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false;
    if (x !== y) return x > y;
  }
  return false;
}

function Shelf({ items, installed, busy, onSee, onRemove }: {
  items: CatalogItem[];
  installed: Record<string, InstalledDrop>;
  busy: boolean;
  onSee: (i: CatalogItem) => void;
  onRemove: (uuid: string) => void;
}) {
  return (
    <div class="installed">
      {items.map((i) => {
        const have = installed[i.uuid];
        const version = have?.versions?.[0];
        const update = have && newer(i.version, version);
        return (
          <div class="row" key={`${i.registry}:${i.uuid}`}>
            <Icon item={i} />
            <span class="text">
              <span class="label">
                {i.name}
                {have && <span class="pill">{update ? `新しい版 ${i.version}` : "入っている"}</span>}
              </span>
              <span class="desc">{i.note}</span>
              <code class="code">
                {i.version ?? "?"} · {i.registry}
                {i.rekor === null ? " · 判なし" : " · 判あり"}
                {i.shots > 0 && ` · 絵 ${i.shots}`}
                {have && ` · 入っているのは ${version ?? "?"}`}
              </code>
            </span>
            <button class={update ? "primary" : "quiet"} disabled={busy} onClick={() => onSee(i)}>
              {have ? (update ? "新しいのを見る" : "見る") : "見る"}
            </button>
            {have && <button class="quiet" disabled={busy} onClick={() => onRemove(i.uuid)}>戻す</button>}
          </div>
        );
      })}
    </div>
  );
}

export function DropsSection() {
  const [ref, setRef] = useState(""); // uuid(棚に無いものを、字で)
  const [tick, setTick] = useState(0); // registry の一覧が変わったら引き直す
  const [q, setQ] = useState("");
  const [shelf, setShelf] = useState<CatalogItem[] | null>(null);
  const [failed, setFailed] = useState<{ registry: string; reason: string }[]>([]);
  const [seen, setSeen] = useState<DropInspection | null>(null);
  const [installed, setInstalled] = useState<Record<string, InstalledDrop>>(dropsApi ? dropsApi.listDrops() : {});
  const { busy, msg, run } = useTask(() => setInstalled(dropsApi ? dropsApi.listDrops() : {}));

  // 棚を引く(registry ごとの /index.json)。一つ転んでも、残りは並べる
  useEffect(() => {
    if (!dropsApi) return;
    let alive = true;
    dropsApi.listCatalog().then(
      (r) => { if (alive) { setShelf(r.items); setFailed(r.failed); } },
      (e) => { if (alive) { setShelf([]); setFailed([{ registry: "?", reason: String(e?.message ?? e) }]); } },
    );
    return () => { alive = false; };
  }, [tick]);

  const inspect = (u = ref, registry?: string) =>
    run(async () => { setSeen(null); setSeen(await dropsApi!.inspectDrop(u, registry)); }, `見た: ${u}(まだ入れていない)`);
  // registry の xpi へのリンクから(DropLinks.sys.mts): about:nora:settings#drop=<uuid>&registry=<name> で開いて、まず見る
  useEffect(() => {
    const p = new URLSearchParams(location.hash.slice(1));
    const u = p.get("drop")?.trim().toLowerCase();
    if (u && dropsApi) { setRef(u); inspect(u, p.get("registry") || undefined); }
  }, []);
  const install = (d: DropInspection) => run(async () => { await dropsApi!.installDrop(d); setSeen(null); }, `入った: ${d.name}`);
  const remove = (c: string) => run(() => dropsApi!.removeDrop(c), `戻した: ${c}`);

  // library は棚に並べない(人が選んで入れるものではなく、使う drop が連れてくる)
  const shown = (shelf ?? []).filter((i) => !i.lib);
  const libs = (shelf ?? []).length - shown.length;
  const hit = shown.filter((i) => {
    const needle = q.trim().toLowerCase();
    return !needle || i.name.includes(needle) || i.note.toLowerCase().includes(needle) || i.uuid.startsWith(needle);
  });
  // 棚に無いのに入っているもの(registry を外した、手元で入れた)も、戻せるように出す
  const orphans = Object.entries(installed).filter(([u]) => !(shelf ?? []).some((i) => i.uuid === u));

  return (
    <section class="card">
      <h2>Drops</h2>
      <p class="hint">機能が一つずつ降ってくる。押すとまず<b>中身を見る</b>(何も実行しない) — source、実際に動く file、誰が判を押したか、連絡先。それから「入れる」で built-in と入れ替わる。戻せば built-in に戻る。再起動は要らない。</p>
      <Registries onChange={() => setTick(tick + 1)} />

      <div class="drop-input">
        <input
          value={q}
          placeholder="棚をさがす(名前・一言)"
          disabled={!dropsApi}
          onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
        />
      </div>
      {shelf === null && <p class="msg">棚を読んでいる…</p>}
      {shelf !== null && hit.length === 0 && <p class="msg">{q ? "見つからない" : "棚は空(registry が index.json を返さないか、まだ何も無い)"}</p>}
      {failed.map((f) => <p class="msg" key={f.registry}>{f.registry} の棚が読めない: {f.reason}</p>)}
      {hit.length > 0 && <Shelf items={hit} installed={installed} busy={busy} onSee={(i) => inspect(i.uuid, i.registry)} onRemove={remove} />}
      {libs > 0 && <p class="msg">ほかに library が {libs} 件(使う drop が連れてくるので、棚には並べない)</p>}

      <details class="by-uuid">
        <summary>棚に無いものを uuid で</summary>
        <div class="drop-input">
          <input
            key={tick}
            value={ref}
            placeholder="uuid(例: ec4dfa7c-9e5a-4c1d-8d0d-771e3ee81030)"
            disabled={!dropsApi || busy}
            onInput={(e) => setRef((e.currentTarget as HTMLInputElement).value.trim())}
            onKeyDown={(e) => { if (e.key === "Enter" && ref && !busy) inspect(); }}
          />
          <button class="primary" disabled={!dropsApi || busy || !ref} onClick={() => inspect()}>見る</button>
        </div>
      </details>

      {msg && <p class="msg">{msg}</p>}
      {seen && <DropSheet seen={seen} busy={busy} onInstall={() => install(seen)} />}
      {orphans.length > 0 && (
        <div class="installed">
          <div class="k">棚に無いのに入っているもの</div>
          {orphans.map(([u, d]) => (
            <div class="row" key={u}>
              <span class="text">
                <span class="label">{d.name ?? u}</span>
                <span class="desc">{d.note ?? ""}</span>
                <code class="code">{u}</code>
                <code class="code">{d.ids.join(", ")} @ {(d.versions ?? []).join(", ")} · {d.registry ?? "?"}</code>
              </span>
              <button class="quiet" disabled={busy} onClick={() => remove(u)}>戻す</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
