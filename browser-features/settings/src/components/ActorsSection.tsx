// SPDX-License-Identifier: MPL-2.0
// noraneko の actor(xpi + JSWindowActor)を一つずつ on/off する。古い JSActor との二者択一。再起動で効く

import { useState } from "preact/hooks";
import { prefsApi, readBool } from "../lib/privileged.ts";
import { color, s } from "../styles.ts";

type Row = { key: string; label: string; desc: string };

const ROWS: Row[] = [
  {
    key: "noraneko.webext-actors.settings-bridge.enabled",
    label: "Settings bridge",
    desc: "Pref access for settings pages via the built-in actor.",
  },
  {
    key: "noraneko.webext-actors.about-preferences.enabled",
    label: "about:preferences integration",
    desc: "Add the Noraneko entry to about:preferences via the built-in actor.",
  },
  {
    key: "noraneko.webext-actors.newtab.enabled",
    label: "New tab data feed",
    desc: "Feed Activity Stream data to the new tab page via the built-in actor.",
  },
];

function Toggle({ row }: { row: Row }) {
  const [value, setValue] = useState(readBool(row.key));
  const onChange = (e: Event) => {
    const next = (e.currentTarget as HTMLInputElement).checked;
    if (prefsApi) prefsApi.setBoolPref(row.key, next);
    setValue(prefsApi ? readBool(row.key) : next);
  };
  return (
    <label style={{ ...s.row, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={value}
        disabled={!prefsApi}
        onChange={onChange}
        style={{ marginTop: "0.2rem", accentColor: color.accent }}
      />
      <span style={s.rowText}>
        <span style={s.label}>{row.label}</span>
        <span style={s.desc}>{row.desc}</span>
        <code style={s.code}>{row.key} = {String(value)}</code>
      </span>
    </label>
  );
}

export function ActorsSection() {
  return (
    <section style={s.section}>
      <h2 style={s.h2}>Actors</h2>
      <p style={s.hint}>
        Built-in actors (xpi + JSWindowActor, the same shape as Firefox's own about:newtab). Each replaces a legacy JSActor. Changes apply after a restart.
      </p>
      {ROWS.map((row) => <Toggle key={row.key} row={row} />)}
    </section>
  );
}
