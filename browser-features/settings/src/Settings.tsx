// SPDX-License-Identifier: MPL-2.0
// about:nora:settings。system principal で開くので Services と noraneko の module に直接触れる(lib/privileged.ts)。
//
//   components/ActorsSection   built-in の actor の on/off(pref)
//   Drops.tsx(about:nora:drops) drops は自分の頁へ分かれた
//   components/ReadCheck       特権で読めているかの確認
//   lib/                       Drops.sys.mts の型、連絡先のリンク、一枚の文字、useTask
//   styles.ts                  色と形(CSS。light / dark は OS に合わせる)

import { prefsApi } from "./lib/privileged.ts";
import { ActorsSection } from "./components/ActorsSection.tsx";
import { ReadCheck } from "./components/ReadCheck.tsx";

export function Settings() {
  return (
    <main class="page">
      <header class="head">
        <span class="eyebrow">Noraneko</span>
        <h1>Settings</h1>
        <span class={`chip ${prefsApi ? "ok" : "warn"}`}>{prefsApi ? "privileged" : "read-only"}</span>
      </header>
      <p class="lead">機能を足す、外す、見る。ここで押したものは、この profile だけに効く。</p>
      <ActorsSection />
      <section class="card">
        <h2>Drops</h2>
        <p class="hint">機能が一つずつ降ってくる。棚と、入っているものと、registry は <a class="link" href="about:nora:drops">about:nora:drops</a> に。</p>
      </section>
      <ReadCheck />
    </main>
  );
}
