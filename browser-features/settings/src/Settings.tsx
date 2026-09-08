// SPDX-License-Identifier: MPL-2.0
import { useState } from "preact/hooks";

// Served as chrome UI (system principal) via about:nora:settings, so we can
// touch Services.prefs directly (about:config / about:preferences do the same).
declare const Services: any;
const prefsApi =
  typeof Services !== "undefined" ? Services?.prefs ?? null : null;

const readBool = (k: string): boolean =>
  prefsApi ? prefsApi.getBoolPref(k, false) : false;

type Row = { key: string; label: string; desc: string };

const ROWS: Row[] = [
  {
    key: "noraneko.webext-actors.settings-bridge.enabled",
    label: "Settings bridge (WebExtension)",
    desc: "Pref access for settings pages via the built-in WebExtension actor.",
  },
  {
    key: "noraneko.webext-actors.about-preferences.enabled",
    label: "about:preferences integration",
    desc: "Add the Noraneko entry to about:preferences via the WebExtension actor.",
  },
  {
    key: "noraneko.webext-actors.newtab.enabled",
    label: "New tab data feed",
    desc: "Feed Activity Stream data to the new tab page via the WebExtension actor.",
  },
];

const s = {
  main: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: "44rem",
    margin: "0 auto",
    padding: "2.5rem 1.5rem 4rem",
    color: "#1a1d24",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
    marginBottom: "1.5rem",
  },
  h1: { color: "#5b8def", margin: 0, fontSize: "1.7rem" },
  badge: (ok: boolean) => ({
    fontSize: "0.75rem",
    padding: "0.2rem 0.55rem",
    borderRadius: "999px",
    fontWeight: 600,
    background: ok ? "#e3f4e9" : "#fdeede",
    color: ok ? "#1c7a43" : "#9a5b13",
  }),
  section: {
    background: "#fff",
    border: "1px solid #e6e9f0",
    borderRadius: "0.75rem",
    padding: "1.25rem 1.4rem",
    marginTop: "1.25rem",
  },
  h2: { margin: "0 0 0.25rem", fontSize: "1.05rem" },
  hint: { margin: "0 0 1rem", color: "#6a7180", fontSize: "0.85rem" },
  row: {
    display: "flex",
    gap: "0.8rem",
    padding: "0.7rem 0",
    borderTop: "1px solid #eef0f5",
    cursor: "pointer",
  },
  rowText: { display: "flex", flexDirection: "column" as const, gap: "0.2rem" },
  label: { fontWeight: 600 },
  desc: { color: "#6a7180", fontSize: "0.85rem" },
  code: {
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.78rem",
    color: "#45506a",
    background: "#f0f3fa",
    padding: "0.1rem 0.35rem",
    borderRadius: "0.3rem",
    alignSelf: "flex-start" as const,
  },
};

function Toggle({ row }: { row: Row }) {
  const [value, setValue] = useState(readBool(row.key));
  const onChange = (e: Event) => {
    const next = (e.currentTarget as HTMLInputElement).checked;
    if (prefsApi) prefsApi.setBoolPref(row.key, next);
    setValue(prefsApi ? readBool(row.key) : next);
  };
  return (
    <label style={s.row}>
      <input
        type="checkbox"
        checked={value}
        disabled={!prefsApi}
        onChange={onChange}
        style={{ marginTop: "0.2rem", accentColor: "#5b8def" }}
      />
      <span style={s.rowText}>
        <span style={s.label}>{row.label}</span>
        <span style={s.desc}>{row.desc}</span>
        <code style={s.code}>{row.key} = {String(value)}</code>
      </span>
    </label>
  );
}

// ドロップ: コード一つで機能(webext-actor の xpi)が降ってくる。中身は modules/Drops.sys.mts
declare const ChromeUtils: any;
const dropsApi = (() => {
  try {
    return typeof ChromeUtils !== "undefined"
      ? ChromeUtils.importESModule("resource://noraneko/modules/Drops.sys.mjs")
      : null;
  } catch {
    return null;
  }
})();

// 連絡先の書きかた → リンク。gh/<user>、mail/<addr>、social/<@user@host か URL>、URL そのまま
function contactHref(c: string): string | null {
  if (c.startsWith("gh/")) return `https://github.com/${c.slice(3)}`;
  if (c.startsWith("mail/")) return `mailto:${c.slice(5)}`;
  if (c.startsWith("social/")) {
    const v = c.slice(7);
    if (/^https?:\/\//.test(v)) return v;
    const m = v.match(/^@?([^@]+)@([^@]+)$/);
    return m ? `https://${m[2]}/@${m[1]}` : null;
  }
  return /^https?:\/\//.test(c) ? c : null;
}

function Registries({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [identity, setIdentity] = useState("");
  const [err, setErr] = useState("");
  const list: any[] = dropsApi ? dropsApi.listRegistries() : [];
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} style={{ marginBottom: "0.8rem" }}>
      <summary style={s.desc}>レジストリ({list.length})。既定は f3liz。自分のや友だちのを足せる(iOS の代替ストアと同じ絵)</summary>
      {list.map((r) => (
        <div key={r.name} style={{ ...s.row, cursor: "default" }}>
          <span style={s.rowText}>
            <span style={s.label}>{r.name}</span>
            <code style={s.code}>{r.base}</code>
            <code style={s.code}>判: {r.identity}</code>
          </span>
          {r.name !== "f3liz" && (
            <button onClick={() => { dropsApi.removeRegistry(r.name); onChange(); }}>外す</button>
          )}
        </div>
      ))}
      <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.6rem" }}>
        <input placeholder="name(小文字と数字)" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value.trim())} />
        <input placeholder="base URL(https://…/drop)" value={base} onInput={(e) => setBase((e.currentTarget as HTMLInputElement).value.trim())} />
        <input placeholder="identity(判を押す workflow の URL)" value={identity} onInput={(e) => setIdentity((e.currentTarget as HTMLInputElement).value.trim())} />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            disabled={!dropsApi || !name || !base || !identity}
            onClick={() => {
              try {
                dropsApi.addRegistry({ name, base, identity, issuer: "https://token.actions.githubusercontent.com" });
                setName(""); setBase(""); setIdentity(""); setErr(""); onChange();
              } catch (e: any) { setErr(String(e?.message ?? e)); }
            }}
          >
            レジストリを足す
          </button>
          {err && <span style={s.desc}>{err}</span>}
        </div>
      </div>
    </details>
  );
}

function Drops() {
  const [code, setCode] = useState("");
  const [registry, setRegistry] = useState<string>(dropsApi ? dropsApi.listRegistries()[0]?.name ?? "" : "");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [seen, setSeen] = useState<any>(null); // inspectDrop の結果(まだ何も実行していない)
  const [installed, setInstalled] = useState<Record<string, any>>(
    dropsApi ? dropsApi.listDrops() : {},
  );
  const refresh = () => setInstalled(dropsApi ? dropsApi.listDrops() : {});
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(ok);
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setBusy(false);
      refresh();
    }
  };
  const sheetText = (d: any) =>
    d.entries
      .map((e: any) =>
        [
          `# ${e.name}  ${e.id}  ${e.version}`,
          `registry: ${d.registry.name}  判: ${d.attestations.map((a: any) => `${a.who}=${a.ok ? "ok" : "NG"}`).join(", ")}  連絡先: ${(Array.isArray(d.manifest.contact) ? d.manifest.contact : [d.manifest.contact ?? "-"]).join(" ")}`,
          `sha256: ${e.sha256}`,
          `注入するページ: ${e.matches.join(", ") || "(なし)"}`,
          `権限: ${e.permissions.join(", ") || "(なし)"}`,
          `親プロセスで呼べる関数: ${e.functions.join(", ") || "(なし)"}`,
          ...e.sources.map((s: any) => `\n--- source/${s.path}(書いたもの)---\n${s.text}`),
          ...e.files.map((f: any) => `\n--- ${f.path}(実際に実行される)---\n${f.text}`),
        ].join("\n"),
      )
      .join("\n\n");
  return (
    <section style={s.section}>
      <h2 style={s.h2}>Drops</h2>
      <p style={s.hint}>
        コードを入れると、まず中身を見る(何も実行しない)。それから「入れる」で built-in を置き換える。戻すと built-in に戻る。再起動は要らない。
      </p>
      <Registries onChange={() => setTick(tick + 1)} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <select value={registry} onChange={(e) => setRegistry((e.currentTarget as HTMLSelectElement).value)} disabled={!dropsApi || busy}>
          {(dropsApi ? dropsApi.listRegistries() : []).map((r: any) => <option key={r.name + tick} value={r.name}>{r.name}</option>)}
        </select>
        <input
          value={code}
          placeholder="code"
          disabled={!dropsApi || busy}
          onInput={(e) => setCode((e.currentTarget as HTMLInputElement).value.trim())}
          style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid #e6e9f0", borderRadius: "0.4rem" }}
        />
        <button
          disabled={!dropsApi || busy || !code}
          onClick={() => run(async () => setSeen(await dropsApi.inspectDrop(code, registry)), `見た: ${code}(まだ入れていない)`)}
        >
          見る
        </button>
      </div>
      {msg && <p style={{ ...s.hint, marginTop: "0.6rem" }}>{msg}</p>}
      {seen && (
        <div style={{ marginTop: "0.8rem" }}>
          {seen.manifest.note && <p style={s.hint}>{seen.manifest.note}</p>}
          {seen.attestations.map((a: any) => (
            <p key={a.who} style={{ ...s.hint, color: a.ok ? "#1c7a43" : "#b3261e" }}>
              {a.ok ? "判あり" : "判なし/合わない"}: {a.who}({seen.registry.name})— {a.identity}
              {a.rekorUrl && <> · <a href={a.rekorUrl} target="_blank">Rekor</a></>}
              {!a.ok && a.reason && <> · {a.reason}</>}
            </p>
          ))}
          {seen.manifest.contact && (
            <p style={s.hint}>
              連絡先: {(Array.isArray(seen.manifest.contact) ? seen.manifest.contact : [seen.manifest.contact]).map((c: string, i: number) => {
                const href = contactHref(c);
                return <span key={c}>{i > 0 && " · "}{href ? <a href={href} target="_blank">{c}</a> : c}</span>;
              })}
            </p>
          )}
          {seen.manifest.source?.repo && (
            <p style={s.hint}>
              source: <a href={`${seen.manifest.source.repo}/tree/${seen.manifest.source.commit ?? ""}`} target="_blank">
                {seen.manifest.source.repo} @ {(seen.manifest.source.commit ?? "").slice(0, 10)}
              </a>
            </p>
          )}
          {seen.entries.map((e: any) => (
            <div key={e.id} style={{ ...s.row, cursor: "default", flexDirection: "column" as const }}>
              <span style={s.label}>{e.name} <code style={s.code}>{e.id} @ {e.version}</code></span>
              <span style={s.desc}>注入するページ: {e.matches.join(", ") || "(なし)"}</span>
              <span style={s.desc}>権限: {e.permissions.join(", ") || "(なし)"}</span>
              <span style={s.desc}>親プロセスで呼べる関数: {e.functions.join(", ") || "(なし)"}</span>
              {e.sources.map((src: any) => (
                <details key={src.path} style={{ width: "100%" }}>
                  <summary style={s.desc}>書いたもの: source/{src.path}</summary>
                  <pre style={{ ...s.code, whiteSpace: "pre-wrap", maxHeight: "24rem", overflow: "auto", padding: "0.6rem" }}>{src.text}</pre>
                </details>
              ))}
              {e.files.map((f: any) => (
                <details key={f.path} style={{ width: "100%" }}>
                  <summary style={s.desc}>実際に実行される: {f.path}</summary>
                  <pre style={{ ...s.code, whiteSpace: "pre-wrap", maxHeight: "24rem", overflow: "auto", padding: "0.6rem" }}>{f.text}</pre>
                </details>
              ))}
            </div>
          ))}
          {!seen.attestations.every((a: any) => a.ok) && (
            <div style={{ marginTop: "0.8rem", padding: "0.7rem 0.9rem", borderRadius: "0.5rem", background: "#fdeaea", border: "1px solid #f2b8b5", color: "#8c1d18", fontSize: "0.9rem" }}>
              <strong>入れるときは、特に注意して。</strong>
              <br />
              この registry の判が無いか、合っていない。中身が registry のレビューを通ったものかどうか、ここからは分からない。
              上の「書いたもの」と「実際に実行される」を自分で読んで、それでも入れたいときだけ「入れる」を押して。
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
            <button disabled={busy} onClick={() => navigator.clipboard.writeText(sheetText(seen))}>
              コピー(AI や人に見せる一枚)
            </button>
            <button
              disabled={busy}
              style={seen.attestations.every((a: any) => a.ok) ? undefined : { borderColor: "#b3261e", color: "#8c1d18" }}
              onClick={() => run(async () => { await dropsApi.installDrop(seen); setSeen(null); }, `入った: ${seen.code}`)}
            >
              {seen.attestations.every((a: any) => a.ok) ? "入れる" : "判なしでも入れる"}
            </button>
          </div>
        </div>
      )}
      {Object.entries(installed).map(([c, d]) => (
        <div key={c} style={s.row}>
          <span style={s.rowText}>
            <span style={s.label}>{c}</span>
            <span style={s.desc}>{(d as any).note ?? ""}</span>
            <code style={s.code}>{(d as any).ids.join(", ")} @ {((d as any).versions ?? []).join(", ")} · {(d as any).registry ?? "?"}</code>
          </span>
          <button disabled={busy} onClick={() => run(() => dropsApi.removeDrop(c), `戻した: ${c}`)}>
            戻す
          </button>
        </div>
      ))}
    </section>
  );
}

export function Settings() {
  const newtabPageEnabled = prefsApi
    ? String(prefsApi.getBoolPref("browser.newtabpage.enabled", false))
    : "n/a";

  return (
    <main style={s.main}>
      <header style={s.header}>
        <h1 style={s.h1}>Noraneko Settings</h1>
        <span style={s.badge(!!prefsApi)}>
          {prefsApi ? "privileged - Services available" : "unprivileged - read-only"}
        </span>
      </header>

      <section style={s.section}>
        <h2 style={s.h2}>WebExtension actors</h2>
        <p style={s.hint}>
          Parallel mechanism to the JSActors. Changes apply after a restart.
        </p>
        {ROWS.map((row) => <Toggle key={row.key} row={row} />)}
      </section>

      <Drops />

      <section style={s.section}>
        <h2 style={s.h2}>Read check</h2>
        <p style={s.hint}>
          A direct read of a built-in Firefox pref, proving arbitrary reads work.
        </p>
        <code style={s.code}>browser.newtabpage.enabled = {newtabPageEnabled}</code>
      </section>
    </main>
  );
}
