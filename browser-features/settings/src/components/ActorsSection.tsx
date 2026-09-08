// SPDX-License-Identifier: MPL-2.0
// noraneko の actor(xpi + JSWindowActor)を一つずつ on/off する。古い JSActor との二者択一。再起動で効く

import { useState } from "preact/hooks";
import { prefsApi, readBool } from "../lib/privileged.ts";

type Row = { key: string; label: string; desc: string };

const ROWS: Row[] = [
  {
    key: "noraneko.webext-actors.settings-bridge.enabled",
    label: "Settings bridge",
    desc: "設定ページが pref を読み書きする橋。",
  },
  {
    key: "noraneko.webext-actors.about-preferences.enabled",
    label: "about:preferences の項目",
    desc: "about:preferences の左の一覧に Noraneko を足す。",
  },
  {
    key: "noraneko.webext-actors.newtab.enabled",
    label: "新しいタブのデータ",
    desc: "よく見るサイトなど(Activity Stream)を新しいタブに渡す。",
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
    <label class="row click">
      <input type="checkbox" checked={value} disabled={!prefsApi} onChange={onChange} />
      <span class="text">
        <span class="label">{row.label}</span>
        <span class="desc">{row.desc}</span>
        <code class="code">{row.key} = {String(value)}</code>
      </span>
    </label>
  );
}

export function ActorsSection() {
  return (
    <section class="card">
      <h2>Actors</h2>
      <p class="hint">built-in の機能(xpi + JSWindowActor。Firefox の about:newtab と同じ形)。それぞれ古い JSActor と入れ替わる。再起動で効く。</p>
      {ROWS.map((row) => <Toggle key={row.key} row={row} />)}
    </section>
  );
}
