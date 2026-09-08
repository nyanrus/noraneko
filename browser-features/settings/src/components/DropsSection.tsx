// SPDX-License-Identifier: MPL-2.0
// Drops: コードを入れる → 見る(何も実行しない) → 入れる → 戻す。中身は modules/Drops.sys.mts

import { useState } from "preact/hooks";
import { dropsApi } from "../lib/privileged.ts";
import type { DropInspection, InstalledDrop } from "../lib/privileged.ts";
import { useTask } from "../lib/useTask.ts";
import { Registries } from "./Registries.tsx";
import { DropSheet } from "./DropSheet.tsx";

function Installed({ code, d, busy, onRemove }: { code: string; d: InstalledDrop; busy: boolean; onRemove: () => void }) {
  return (
    <div class="row">
      <span class="text">
        <span class="label">{code}</span>
        <span class="desc">{d.note ?? ""}</span>
        <code class="code">{d.ids.join(", ")} @ {(d.versions ?? []).join(", ")} · {d.registry ?? "?"}</code>
      </span>
      <button class="quiet" disabled={busy} onClick={onRemove}>戻す</button>
    </div>
  );
}

export function DropsSection() {
  const [code, setCode] = useState("");
  const [registry, setRegistry] = useState<string>(dropsApi?.listRegistries()[0]?.name ?? "");
  const [tick, setTick] = useState(0); // registry の一覧が変わったら select を描き直す
  const [seen, setSeen] = useState<DropInspection | null>(null);
  const [installed, setInstalled] = useState<Record<string, InstalledDrop>>(dropsApi ? dropsApi.listDrops() : {});
  const { busy, msg, run } = useTask(() => setInstalled(dropsApi ? dropsApi.listDrops() : {}));
  const registries = dropsApi ? dropsApi.listRegistries() : [];
  const entries = Object.entries(installed);

  const inspect = () => run(async () => setSeen(await dropsApi!.inspectDrop(code, registry)), `見た: ${code}(まだ入れていない)`);
  const install = (d: DropInspection) => run(async () => { await dropsApi!.installDrop(d); setSeen(null); }, `入った: ${d.code}`);
  const remove = (c: string) => run(() => dropsApi!.removeDrop(c), `戻した: ${c}`);

  return (
    <section class="card">
      <h2>Drops</h2>
      <p class="hint">コード一つで機能が降ってくる。入れると、まず中身を見る(何も実行しない)。それから「入れる」で built-in と入れ替わる。戻せば built-in に戻る。再起動は要らない。</p>
      <Registries onChange={() => setTick(tick + 1)} />
      <div class="drop-input">
        <select value={registry} onChange={(e) => setRegistry((e.currentTarget as HTMLSelectElement).value)} disabled={!dropsApi || busy}>
          {registries.map((r) => <option key={r.name + tick} value={r.name}>{r.name}</option>)}
        </select>
        <input
          value={code}
          placeholder="code"
          disabled={!dropsApi || busy}
          onInput={(e) => setCode((e.currentTarget as HTMLInputElement).value.trim())}
          onKeyDown={(e) => { if (e.key === "Enter" && code && !busy) inspect(); }}
        />
        <button class="primary" disabled={!dropsApi || busy || !code} onClick={inspect}>見る</button>
      </div>
      {msg && <p class="msg">{msg}</p>}
      {seen && <DropSheet seen={seen} busy={busy} onInstall={() => install(seen)} />}
      {entries.length > 0 && (
        <div class="installed">
          <div class="k">入っているもの</div>
          {entries.map(([c, d]) => <Installed key={c} code={c} d={d} busy={busy} onRemove={() => remove(c)} />)}
        </div>
      )}
    </section>
  );
}
