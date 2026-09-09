// SPDX-License-Identifier: MPL-2.0
// 一枚の表。**中身を読む前に、まずここ。**
//
// 棚から押すと、いきなり六十四枚の file が出るのは、店として無理がある。人が最初に
// 知りたいのは「何をするものか」「どんな見た目か」「誰が作ったか」で、コードはその
// 次(読みたい人だけ)。だから表と裏に分けた:
//
//   表(ここ)  絵、説明、スクリーンショット、作った人、そして「ねこにいれる」
//   裏         中身を読む(要約 → この drop 自身の字 → 畳んである残り)
//
// ここに出ているものは全部、**落として sha256 を確かめた xpi の中から**読んだもの。
// 外には何も取りに行っていないし、まだ何も実行していない。

import { useState } from "preact/hooks";
import type { DropInspection } from "../lib/privileged.ts";
import { allAttested, dropsApi } from "../lib/privileged.ts";
import { contactHref, contactList } from "../lib/contact.ts";
import { VOCABULARY, shapeOf } from "../lib/shape.ts";

export function Store({ seen, installedVersion, busy, onInstall, onRead, onRemove }: {
  seen: DropInspection;
  installedVersion?: string;
  busy: boolean;
  onInstall: () => void | Promise<unknown>;
  onRead: () => void;
  onRemove?: () => void;
}) {
  const ok = allAttested(seen);
  const s = shapeOf(seen);
  const version = seen.entries[0]?.version ?? "?";
  const have = installedVersion !== undefined;
  const update = have && installedVersion !== version;
  const contacts = contactList(seen.manifest.contact);

  // 押してから入るまでの三段: 確かめる → 何を許すのかを見せる → 許されたら入れる。
  // 途中でやめられるし、やめても何も起きていない
  const [step, setStep] = useState<null | "checking" | "ask">(null);
  const [check, setCheck] = useState<{ ok: boolean; checked: number; bad: string[] } | null>(null);

  const press = async () => {
    setStep("checking");
    setCheck(null);
    // 照合そのものは速い(手元の file を数えるだけ)。速いときは、そのまま次へ ──
    // 見せるために待つのは、待っている振りになる
    try {
      // 見たときから、profile の file が入れ替わっていないか。installDrop が
      // 最初にするのと同じ照合を、入れずに
      const r = dropsApi ? await dropsApi.verifyDrop(seen) : { ok: false, checked: 0, bad: ["(特権が無い)"] };
      setCheck(r);
    } catch (e) {
      setCheck({ ok: false, checked: 0, bad: [String((e as Error)?.message ?? e)] });
    }
    setStep("ask");
  };

  return (
    <div class="store">
      <div class="store-head">
        {seen.icon
          ? <img class="store-icon" src={seen.icon} alt="" />
          : <span class="store-icon tile">{[...seen.name][0] ?? "?"}</span>}
        <div class="store-title">
          <h2>{seen.name}</h2>
          <p class="store-note">{seen.manifest.note}</p>
          <p class="store-meta">
            <code class="code">{version}</code>
            <span>· {seen.registry.name}</span>
            <span class={`mark ${ok ? "ok" : "ng"}`}>{ok ? "registry の判あり" : "判なし / 合わない"}</span>
            {have && <span class="pill">{update ? `入っているのは ${installedVersion}` : "入っている"}</span>}
          </p>
        </div>
      </div>

      <div class="store-actions">
        {step === null && (
          <button class={ok ? "primary big" : "danger big"} disabled={busy} onClick={press}>
            {have ? (update ? "新しいのを、ねこにいれる" : "入れ直す") : ok ? "ねこにいれる" : "判なしでも、ねこにいれる"}
          </button>
        )}
        {step === "checking" && (
          <button class="primary big" disabled>
            <span class="spin" /> 落としたものを照らしている…
          </button>
        )}
        {step !== "checking" && <button class="quiet" disabled={busy} onClick={onRead}>中身を読む</button>}
        {have && onRemove && step === null && <button class="quiet" disabled={busy} onClick={onRemove}>戻す</button>}
      </div>

      {step === "ask" && (
        <div class={`grant ${check?.ok ? "" : "bad"}`}>
          <p class="grant-head">
            <b>{seen.name}</b> に、これを許していい?
            <span class="grant-sub">
              {check?.ok
                ? `落としてある ${check.checked} 個の file は、判の押された manifest の sha256 と全部合っている。`
                : `合わない file がある: ${check?.bad.join(", ")} — 入れないほうがいい。`}
            </span>
          </p>
          <dl class="grant-list">
            <dt>動く場所</dt>
            <dd>{s.chrome ? "ブラウザの窓そのもの(タブや画面を作り替えられる)" : "ページの中だけ"}</dd>
            <dt>できること</dt>
            <dd>
              {s.sandboxed
                ? (
                  <ul class="sum-list">
                    {VOCABULARY.map((v) => <li key={v}>{v}</li>)}
                    {s.webFrame && <li><b>ページを読み込む窓を置く</b></li>}
                  </ul>
                )
                : <><b>決まっていない</b> — 自分の JS を窓の中で動かすので、書いてあること全部ができる。<button class="link" onClick={onRead}>読んでから決めて</button></>}
            </dd>
            {s.functions.length > 0 && (<><dt>親プロセス</dt><dd>{s.functions.join(", ")}</dd></>)}
            <dt>戻すとき</dt>
            <dd>「戻す」で built-in に返る。置いたものは自分で片づく(窓に何も残らない)。再起動は要らない</dd>
          </dl>
          <div class="store-actions">
            <button
              class={check?.ok && ok ? "primary" : "danger"}
              disabled={busy}
              onClick={async () => { await onInstall(); setStep(null); setCheck(null); }}
            >
              許して、ねこにいれる
            </button>
            <button class="quiet" disabled={busy} onClick={() => { setStep(null); setCheck(null); }}>やめる</button>
          </div>
        </div>
      )}

      {!ok && (
        <p class="caution">
          <strong>この registry の判が無いか、合っていない。</strong>
          中身が registry のレビューを通ったものかどうか、ここからは分からない。
          「中身を読む」で自分で読んで、それでも入れたいときだけ押して。
        </p>
      )}

      {seen.shots?.length ? (
        <div class="store-shots">
          {/* xpi の中にあったもの。data: なので、もう手元にある */}
          {seen.shots.map((sh) => <img key={sh.file} src={sh.dataUri} alt={sh.file} />)}
        </div>
      ) : null}

      <dl class="store-facts">
        <dt>どこで動くか</dt>
        <dd>{s.chrome ? "ブラウザの窓そのもの — タブや画面を作り替えられる場所" : "ページの中だけ"}</dd>
        <dt>できること</dt>
        <dd>
          {s.sandboxed
            ? <>決めているのは sandbox の中で、窓に触るのは殻だけ。できることは決まった{s.webFrame ? 8 : 7} つ ── <button class="link" onClick={onRead}>一覧を読む</button></>
            : <>自分の JS を窓の中で動かす。何ができるかは <button class="link" onClick={onRead}>中身を読む</button>まで分からない</>}
        </dd>
        <dt>読むところ</dt>
        <dd>この drop 自身の字は {s.own.files} files · {s.own.lines} lines(残りは殻と、build が組んだものと、library)</dd>
        {contacts.length > 0 && (
          <>
            <dt>作った人</dt>
            <dd>
              {contacts.map((c, i) => {
                const href = contactHref(c);
                return <span key={c}>{i > 0 && " · "}{href ? <a href={href} target="_blank">{c}</a> : c}</span>;
              })}
            </dd>
          </>
        )}
        {seen.manifest.source?.repo && (
          <>
            <dt>source</dt>
            <dd>
              <a href={`${seen.manifest.source.repo}/tree/${seen.manifest.source.commit ?? ""}`} target="_blank">
                {seen.manifest.source.repo} @ {(seen.manifest.source.commit ?? "").slice(0, 10)}
              </a>
            </dd>
          </>
        )}
      </dl>

      <p class="store-foot">
        ここに出ているものは、落として sha256 を確かめた xpi の中から読んだもの。
        外には何も取りに行っていないし、<b>まだ何も実行していない</b>。
      </p>
    </div>
  );
}
