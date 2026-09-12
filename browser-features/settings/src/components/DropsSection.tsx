// SPDX-License-Identifier: MPL-2.0
// Drops: コードを入れる → 見る(何も実行しない) → 入れる → 戻す。中身は modules/Drops.sys.mts

import { useEffect, useState } from "preact/hooks";
import { dropsApi } from "../lib/privileged.ts";
import type { DropInspection, InstalledDrop } from "../lib/privileged.ts";
import { useTask } from "../lib/useTask.ts";
import { Registries } from "./Registries.tsx";
import { DropSheet } from "./DropSheet.tsx";

function Installed({ uuid, d, busy, onRemove }: { uuid: string; d: InstalledDrop; busy: boolean; onRemove: () => void }) {
  return (
    <div class="row">
      <span class="text">
        <span class="label">{d.name ?? uuid}</span>
        <span class="desc">{d.note ?? ""}</span>
        <code class="code">{uuid}</code>
        <code class="code">{d.ids.join(", ")} @ {(d.versions ?? []).join(", ")} · {d.registry ?? "?"}</code>
      </span>
      <button class="quiet" disabled={busy} onClick={onRemove}>戻す</button>
    </div>
  );
}

export function DropsSection() {
  const [ref, setRef] = useState(""); // uuid(正体。registry は一覧に順に訊く)
  const [tick, setTick] = useState(0); // registry の一覧が変わったら描き直す
  const [seen, setSeen] = useState<DropInspection | null>(null);
  const [installed, setInstalled] = useState<Record<string, InstalledDrop>>(dropsApi ? dropsApi.listDrops() : {});
  const { busy, msg, run } = useTask(() => setInstalled(dropsApi ? dropsApi.listDrops() : {}));
  const entries = Object.entries(installed);

  const inspect = (u = ref, registry?: string) =>
    run(async () => { setSeen(null); setSeen(await dropsApi!.inspectDrop(u, registry)); }, `見た: ${u}(まだ入れていない)`);
  // registry の xpi へのリンクから(DropLinks.sys.mts): about:nora:settings#drop=<uuid>&registry=<name> で開いて、まず見る
  useEffect(() => {
    const q = new URLSearchParams(location.hash.slice(1));
    const u = q.get("drop")?.trim().toLowerCase();
    if (u && dropsApi) { setRef(u); inspect(u, q.get("registry") || undefined); }
  }, []);
  const install = (d: DropInspection) => run(async () => { await dropsApi!.installDrop(d); setSeen(null); }, `入った: ${d.name}`);
  const remove = (c: string) => run(() => dropsApi!.removeDrop(c), `戻した: ${c}`);

  return (
    <section class="card">
      <h2>Drops</h2>
      <p class="hint">uuid 一つで機能が降ってくる(名前は札、uuid が正体。drop のページからコピーする)。入れると、まず中身を見る(何も実行しない)。それから「入れる」で built-in と入れ替わる。戻せば built-in に戻る。再起動は要らない。</p>
      <Registries onChange={() => setTick(tick + 1)} />
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
      {msg && <p class="msg">{msg}</p>}
      {seen && <DropSheet seen={seen} busy={busy} onInstall={() => install(seen)} />}
      {entries.length > 0 && (
        <div class="installed">
          <div class="k">入っているもの</div>
          {entries.map(([u, d]) => <Installed key={u} uuid={u} d={d} busy={busy} onRemove={() => remove(u)} />)}
        </div>
      )}
    </section>
  );
}
