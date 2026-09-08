// SPDX-License-Identifier: MPL-2.0
// 見た drop の一枚: 判、連絡先、source、それぞれの actor の中身、注意、入れるボタン。
// ここに出ているものは全部「読んだだけ」で、まだ何も実行していない

import type { AttestationCheck, DropInspection, InspectedEntry } from "../lib/privileged.ts";
import { allAttested } from "../lib/privileged.ts";
import { contactHref, contactList } from "../lib/contact.ts";
import { sheetText } from "../lib/sheet.ts";
import { color, s } from "../styles.ts";

function Attestation({ a, registry }: { a: AttestationCheck; registry: string }) {
  return (
    <p style={{ ...s.hint, color: a.ok ? color.okText : color.ngText }}>
      {a.ok ? "判あり" : "判なし/合わない"}: {a.who}({registry})— {a.identity}
      {a.rekorUrl && <> · <a href={a.rekorUrl} target="_blank">Rekor</a></>}
      {!a.ok && a.reason && <> · {a.reason}</>}
    </p>
  );
}

function Contacts({ contact }: { contact: DropInspection["manifest"]["contact"] }) {
  const list = contactList(contact);
  if (!list.length) return null;
  return (
    <p style={s.hint}>
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
    <p style={s.hint}>
      source: <a href={`${source.repo}/tree/${commit}`} target="_blank">{source.repo} @ {commit.slice(0, 10)}</a>
    </p>
  );
}

function FileView({ title, path, text }: { title: string; path: string; text: string }) {
  return (
    <details style={{ width: "100%" }}>
      <summary style={s.desc}>{title}: {path}</summary>
      <pre style={s.pre}>{text}</pre>
    </details>
  );
}

function Entry({ e }: { e: InspectedEntry }) {
  return (
    <div style={{ ...s.row, flexDirection: "column" as const }}>
      <span style={s.label}>{e.name} <code style={s.code}>{e.id} @ {e.version}</code></span>
      <span style={s.desc}>動くページ: {e.matches.join(", ") || "(なし)"}</span>
      <span style={s.desc}>権限: {e.permissions.join(", ") || "(なし)"}</span>
      <span style={s.desc}>親プロセスで呼べる関数: {e.functions.join(", ") || "(なし)"}</span>
      {e.sources.map((src) => <FileView key={src.path} title="書いたもの" path={`source/${src.path}`} text={src.text} />)}
      {e.files.map((f) => <FileView key={f.path} title="実際に実行される" path={f.path} text={f.text} />)}
    </div>
  );
}

function Caution() {
  return (
    <div style={s.danger}>
      <strong>入れるときは、特に注意して。</strong>
      <br />
      この registry の判が無いか、合っていない。中身が registry のレビューを通ったものかどうか、ここからは分からない。
      上の「書いたもの」と「実際に実行される」を自分で読んで、それでも入れたいときだけ「入れる」を押して。
    </div>
  );
}

export function DropSheet({ seen, busy, onInstall }: { seen: DropInspection; busy: boolean; onInstall: () => void }) {
  const ok = allAttested(seen);
  return (
    <div style={{ marginTop: "0.8rem" }}>
      {seen.manifest.note && <p style={s.hint}>{seen.manifest.note}</p>}
      {seen.attestations.map((a) => <Attestation key={a.who} a={a} registry={seen.registry.name} />)}
      <Contacts contact={seen.manifest.contact} />
      <Source source={seen.manifest.source} />
      {seen.entries.map((e) => <Entry key={e.id} e={e} />)}
      {!ok && <Caution />}
      <div style={s.actions}>
        <button disabled={busy} onClick={() => navigator.clipboard.writeText(sheetText(seen))}>
          コピー(AI や人に見せる一枚)
        </button>
        <button disabled={busy} style={ok ? undefined : s.dangerButton} onClick={onInstall}>
          {ok ? "入れる" : "判なしでも入れる"}
        </button>
      </div>
    </div>
  );
}
