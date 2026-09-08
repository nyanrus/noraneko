// SPDX-License-Identifier: MPL-2.0
// Firefox 本体の pref を一つ読んで見せる(特権で読めていることの確認)

import { prefsApi } from "../lib/privileged.ts";
import { s } from "../styles.ts";

export function ReadCheck() {
  const v = prefsApi ? String(prefsApi.getBoolPref("browser.newtabpage.enabled", false)) : "n/a";
  return (
    <section style={s.section}>
      <h2 style={s.h2}>Read check</h2>
      <p style={s.hint}>A direct read of a built-in Firefox pref, proving arbitrary reads work.</p>
      <code style={s.code}>browser.newtabpage.enabled = {v}</code>
    </section>
  );
}
