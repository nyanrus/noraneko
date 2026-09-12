// SPDX-License-Identifier: MPL-2.0

// about-preferences: add a "Nora Settings" entry to about:preferences and open
// the noraneko settings page. Replaces the NRAboutPreferences JSActor, which
// loaded about-preferences.js as a chrome subscript.
//
// NOTE (verify on a real run): this relies on a content script being injected
// into about:preferences and on window.MozXULElement being reachable from the
// content-script sandbox. The JSActor version had chrome privileges in-page;
// a content script does not. If injection or MozXULElement access is blocked,
// keep this one on the JSActor path.

import {
  defineContent,
  defineParent,
  type ActorMeta,
} from "../_shared/defineActor.ts";

export const meta: ActorMeta = {
  id: "about-preferences@noraneko.app",
  version: "1.0.0",
  namespace: "noraAboutPreferences",
  matches: ["about:preferences*", "about:settings*"],
  runAt: "document_end",
};

export const parent = defineParent({
  openSettings(): void {
    const win = Services.wm.getMostRecentWindow("navigator:browser") as any;
    win.gBrowser.selectedTab = win.gBrowser.addTab(
      "chrome://noraneko-settings/content/index.html",
      {
        relatedToCurrent: true,
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      },
    );
  },
});

export const content = defineContent<typeof parent>((parent) => {
  const navRoot = document.querySelector("#categories");
  if (!navRoot) return;

  const fragment = (window as any).MozXULElement.parseXULToFragment(`
    <richlistitem
      id="category-nora-link"
      class="category"
      align="center"
      tooltiptext="Nora Settings Link"
    >
      <image class="category-icon" />
      <label class="category-name" flex="1">
        Nora Settings Link
      </label>
    </richlistitem>
  `);
  navRoot.appendChild(fragment);

  document
    .querySelector("#category-nora-link")
    ?.addEventListener("click", () => {
      // dev でも about:nora:settings(chrome://noraneko-settings/、vite build の産物)。localhost:5183 の dev server はもう無い
      parent.openSettings();
    });
});
