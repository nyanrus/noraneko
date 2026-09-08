// SPDX-License-Identifier: MPL-2.0
// 見た drop の一枚: 判、連絡先、source、それぞれの actor の中身、注意、入れるボタン。
// ここに出ているものは全部「読んだだけ」で、まだ何も実行していない

import type { AttestationCheck, DropInspection, InspectedEntry } from "../lib/privileged.ts";
import { allAttested } from "../lib/privileged.ts";
import { contactHref, contactList } from "../lib/contact.ts";
import { sheetText } from "../lib/sheet.ts";

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

function Contacts({ contact }: { contact: DropInspection["manifest"]["contact"] }) {
  const list = contactList(contact);
  if (!list.length) return null;
  return (
    <p class="meta">
      連絡先: {list.map((c, i) => {
        const href = contactHref(c);
        return <span key={c}>{i > 0 && " · "}{href ? <a href={href} target="_blank">{c}</a> : c}</span>;
      })}
    </p>
  );
}

function Source({ source }: { source: DropInspection["manifest"]["source"] }) {
  if (!source?.repo) return null;
  const commit = source.commit ?? "";
  return (
    <p class="meta">
      source: <a href={`${source.repo}/tree/${commit}`} target="_blank">{source.repo} @ {commit.slice(0, 10)}</a>
    </p>
  );
}

function FileView({ title, path, text }: { title: string; path: string; text: string }) {
  return (
    <details>
      <summary>{title} <span class="k">{path}</span></summary>
      <pre class="code">{text}</pre>
    </details>
  );
}

function Entry({ e }: { e: InspectedEntry }) {
  return (
    <div class="entry">
      <span class="name">{e.name} <code class="code">{e.id} @ {e.version}</code></span>
      <span class="fact">動くページ: {e.matches.join(", ") || "(なし)"}</span>
      <span class="fact">権限: {e.permissions.join(", ") || "(なし)"}</span>
      <span class="fact">親プロセスで呼べる関数: {e.functions.join(", ") || "(なし)"}</span>
      {e.sources.map((src) => <FileView key={src.path} title="書いたもの" path={`source/${src.path}`} text={src.text} />)}
      {e.files.map((f) => <FileView key={f.path} title="実際に実行される" path={f.path} text={f.text} />)}
    </div>
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
  return (
    <div class="sheet">
      <p class="meta" style={{ margin: "0 0 0.5rem" }}><span class="k">{seen.name}</span> <code class="code">{seen.uuid}</code> <span>· {seen.registry.name}</span></p>
      {seen.attestations.map((a) => <Stamp key={a.who} a={a} registry={seen.registry.name} />)}
      {seen.manifest.note && <p class="meta">{seen.manifest.note}</p>}
      <Contacts contact={seen.manifest.contact} />
      <Source source={seen.manifest.source} />
      {seen.entries.map((e) => <Entry key={e.id} e={e} />)}
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
