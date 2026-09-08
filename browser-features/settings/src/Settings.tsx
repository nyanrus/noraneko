// SPDX-License-Identifier: MPL-2.0
// about:nora:settings。system principal で開くので Services と noraneko の module に直接触れる(lib/privileged.ts)。
//
//   components/ActorsSection   built-in の actor の on/off(pref)
//   components/DropsSection    drops: 見る → 入れる → 戻す(+ Registries、DropSheet)
//   components/ReadCheck       特権で読めているかの確認
//   lib/                       Drops.sys.mts の型、連絡先のリンク、一枚の文字、useTask
//   styles.ts                  色と形(CSS。light / dark は OS に合わせる)

import { prefsApi } from "./lib/privileged.ts";
import { ActorsSection } from "./components/ActorsSection.tsx";
import { DropsSection } from "./components/DropsSection.tsx";
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
      <DropsSection />
      <ReadCheck />
    </main>
  );
}
