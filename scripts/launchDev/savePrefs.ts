import fs from "node:fs/promises";

const USER_JS = `/**
 *! DO NOT EDIT THIS FILE.
 *
 ** This file is AUTOGENERATED
 ** Please modify the 'scripts/launchBrowser/savePrefs.ts' in the repo.
 * https://github.com/nyanrus/noraneko
 */

// https://searchfox.org/mozilla-central/rev/02a4a649ed75ebaf3fbdf301c3d3137baf6842a1/devtools/shared/security/auth.js#170
user_pref("devtools.debugger.prompt-connection",false);
//? Thank you for 'arai' san in Mozilla!
//? This pref allows to run import of http(s) protocol in browser-top or about: pages
// https://searchfox.org/mozilla-central/rev/6936c4c3fc9bee166912fce10104fbe0417d77d3/dom/security/nsContentSecurityManager.cpp#1037-1041
// https://searchfox.org/mozilla-central/rev/6936c4c3fc9bee166912fce10104fbe0417d77d3/modules/libpref/init/StaticPrefList.yaml#15063
user_pref("security.disallow_privileged_https_script_loads", false);
// https://searchfox.org/mozilla-central/rev/6936c4c3fc9bee166912fce10104fbe0417d77d3/dom/security/nsContentSecurityUtils.cpp#1600-1607
// https://searchfox.org/mozilla-central/rev/6936c4c3fc9bee166912fce10104fbe0417d77d3/dom/security/nsContentSecurityUtils.cpp#1445-1450
// https://searchfox.org/mozilla-central/rev/6936c4c3fc9bee166912fce10104fbe0417d77d3/modules/libpref/init/StaticPrefList.yaml#14743
user_pref("security.allow_parent_unrestricted_js_loads", true);
// https://searchfox.org/mozilla-central/rev/71aada9d4055e420f91f3d0fa107f0328763e40b/browser/app/profile/firefox.js#1249
user_pref("remote.active-protocols", 1);
//? WebDriverBidi seems to disable newtabpage
user_pref("browser.newtabpage.enabled", true);
`;

export async function savePrefsForProfile(profile_dir: string) {
  await fs.writeFile(`${profile_dir}/user.js`, USER_JS);
}
