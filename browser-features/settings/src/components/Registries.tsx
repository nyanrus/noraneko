// SPDX-License-Identifier: MPL-2.0
// drop を配る registry の一覧と、足す口。既定は f3liz。iOS の代替ストアと同じ絵

import { useState } from "preact/hooks";
import { dropsApi } from "../lib/privileged.ts";

const DEFAULT_ISSUER = "https://token.actions.githubusercontent.com";
const DEFAULT_NAME = "f3liz";

const value = (e: Event) => (e.currentTarget as HTMLInputElement).value.trim();

export function Registries({ onChange }: { onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [identity, setIdentity] = useState("");
  const [err, setErr] = useState("");
  const list = dropsApi ? dropsApi.listRegistries() : [];

  const add = () => {
    if (!dropsApi) return;
    try {
      dropsApi.addRegistry({ name, base, identity, issuer: DEFAULT_ISSUER });
      setName("");
      setBase("");
      setIdentity("");
      setErr("");
      onChange();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    }
  };

  return (
    <details class="fold" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>レジストリ({list.length})。既定は {DEFAULT_NAME}。自分のや友だちのを足せる(それぞれ別の URL と置き場。npm と jsr が別なのと同じ)</summary>
      {list.map((r) => (
        <div key={r.name} class="row">
          <span class="text">
            <span class="label">{r.name}</span>
            <code class="code">{r.base}</code>
            <code class="code">判: {r.identity}</code>
          </span>
          {r.name !== DEFAULT_NAME && (
            <button class="quiet" onClick={() => { dropsApi?.removeRegistry(r.name); onChange(); }}>外す</button>
          )}
        </div>
      ))}
      <div class="form">
        <input placeholder="name(小文字と数字)" value={name} onInput={(e) => setName(value(e))} />
        <input placeholder="base URL(https://…/drop)" value={base} onInput={(e) => setBase(value(e))} />
        <input placeholder="identity(判を押す workflow の URL)" value={identity} onInput={(e) => setIdentity(value(e))} />
        <div class="actions">
          <button disabled={!dropsApi || !name || !base || !identity} onClick={add}>レジストリを足す</button>
          {err && <span class="msg">{err}</span>}
        </div>
      </div>
    </details>
  );
}
