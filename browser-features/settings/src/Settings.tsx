// SPDX-License-Identifier: MPL-2.0
// about:nora:settings。system principal で開くので Services と noraneko の module に直接触れる(lib/privileged.ts)。
//
//   components/ActorsSection   built-in の actor の on/off(pref)
//   components/DropsSection    drops: 見る → 入れる → 戻す(+ Registries、DropSheet)
//   components/ReadCheck       特権で読めているかの確認
//   lib/                       Drops.sys.mts の型、連絡先のリンク、一枚の文字、useTask
//   styles.ts                  色と形

import { prefsApi } from "./lib/privileged.ts";
import { s } from "./styles.ts";
import { ActorsSection } from "./components/ActorsSection.tsx";
import { DropsSection } from "./components/DropsSection.tsx";
import { ReadCheck } from "./components/ReadCheck.tsx";

export function Settings() {
  return (
    <main style={s.main}>
      <header style={s.header}>
        <h1 style={s.h1}>Noraneko Settings</h1>
        <span style={s.badge(!!prefsApi)}>
          {prefsApi ? "privileged - Services available" : "unprivileged - read-only"}
        </span>
      </header>
      <ActorsSection />
      <DropsSection />
      <ReadCheck />
    </main>
  );
}
