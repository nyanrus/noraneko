// SPDX-License-Identifier: MPL-2.0
// Firefox 本体の pref を一つ読んで見せる(特権で読めていることの確認)

import { prefsApi } from "../lib/privileged.ts";

export function ReadCheck() {
  const v = prefsApi ? String(prefsApi.getBoolPref("browser.newtabpage.enabled", false)) : "n/a";
  return (
    <section class="card">
      <h2>Read check</h2>
      <p class="hint">Firefox 本体の pref を一つ読む。特権で読めていることの確認。</p>
      <code class="code">browser.newtabpage.enabled = {v}</code>
    </section>
  );
}
