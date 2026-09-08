// SPDX-License-Identifier: MPL-2.0
// 見たものを一枚の文字にする(AI や人に見せる用。画面と同じ情報)

import type { DropInspection } from "./privileged.ts";
import { contactList } from "./contact.ts";

export function sheetText(d: DropInspection): string {
  const attested = d.attestations.map((a) => `${a.who}=${a.ok ? "ok" : "NG"}`).join(", ");
  const contact = contactList(d.manifest.contact).join(" ") || "-";
  return d.entries
    .map((e) =>
      [
        `# ${e.name}  ${e.id}  ${e.version}`,
        `registry: ${d.registry.name}  判: ${attested}  連絡先: ${contact}`,
        `sha256: ${e.sha256}`,
        `動くページ: ${e.matches.join(", ") || "(なし)"}`,
        `権限: ${e.permissions.join(", ") || "(なし)"}`,
        `親プロセスで呼べる関数: ${e.functions.join(", ") || "(なし)"}`,
        ...e.sources.map((s) => `\n--- source/${s.path}(書いたもの)---\n${s.text}`),
        ...e.files.map((f) => `\n--- ${f.path}(実際に実行される)---\n${f.text}`),
      ].join("\n"),
    )
    .join("\n\n");
}
