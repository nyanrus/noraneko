// SPDX-License-Identifier: MPL-2.0
// Drops: コードを入れる → 見る(何も実行しない) → 入れる → 戻す。中身は modules/Drops.sys.mts

import { useState } from "preact/hooks";
import { dropsApi } from "../lib/privileged.ts";
import type { DropInspection, InstalledDrop } from "../lib/privileged.ts";
import { useTask } from "../lib/useTask.ts";
import { s } from "../styles.ts";
import { Registries } from "./Registries.tsx";
import { DropSheet } from "./DropSheet.tsx";

function Installed({ code, d, busy, onRemove }: { code: string; d: InstalledDrop; busy: boolean; onRemove: () => void }) {
  return (
    <div style={s.row}>
      <span style={s.rowText}>
        <span style={s.label}>{code}</span>
        <span style={s.desc}>{d.note ?? ""}</span>
        <code style={s.code}>{d.ids.join(", ")} @ {(d.versions ?? []).join(", ")} · {d.registry ?? "?"}</code>
      </span>
      <button disabled={busy} onClick={onRemove}>戻す</button>
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

  const inspect = () => run(async () => setSeen(await dropsApi!.inspectDrop(code, registry)), `見た: ${code}(まだ入れていない)`);
  const install = (d: DropInspection) => run(async () => { await dropsApi!.installDrop(d); setSeen(null); }, `入った: ${d.code}`);
  const remove = (c: string) => run(() => dropsApi!.removeDrop(c), `戻した: ${c}`);

  return (
    <section style={s.section}>
      <h2 style={s.h2}>Drops</h2>
      <p style={s.hint}>
        コードを入れると、まず中身を見る(何も実行しない)。それから「入れる」で built-in を置き換える。戻すと built-in に戻る。再起動は要らない。
      </p>
      <Registries onChange={() => setTick(tick + 1)} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <select value={registry} onChange={(e) => setRegistry((e.currentTarget as HTMLSelectElement).value)} disabled={!dropsApi || busy}>
          {registries.map((r) => <option key={r.name + tick} value={r.name}>{r.name}</option>)}
        </select>
        <input
          value={code}
          placeholder="code"
          disabled={!dropsApi || busy}
          onInput={(e) => setCode((e.currentTarget as HTMLInputElement).value.trim())}
          style={s.input}
        />
        <button disabled={!dropsApi || busy || !code} onClick={inspect}>見る</button>
      </div>
      {msg && <p style={{ ...s.hint, marginTop: "0.6rem" }}>{msg}</p>}
      {seen && <DropSheet seen={seen} busy={busy} onInstall={() => install(seen)} />}
      {Object.entries(installed).map(([c, d]) => (
        <Installed key={c} code={c} d={d} busy={busy} onRemove={() => remove(c)} />
      ))}
    </section>
  );
}
