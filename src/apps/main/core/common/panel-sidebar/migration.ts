/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PanelSidebarStaticNames } from "./utils/panel-sidebar-static-names";
import type { PanelSidebarConfig, PanelSidebarData } from "./utils/type";

export async function migratePanelSidebarData(callback: () => void) {
  const data = Services.prefs.getStringPref(
    PanelSidebarStaticNames.panelSidebarDataPrefName,
    undefined,
  );

  const oldData = Services.prefs.getCharPref(
    "floorp.browser.sidebar2.data",
    undefined,
  );

  if (!data && oldData) {
    Services.prefs.setStringPref(
      PanelSidebarStaticNames.panelSidebarDataPrefName,
      oldData,
    );

    // Create a new config
    const globalWidth = Services.prefs.getIntPref(
      "floorp.browser.sidebar2.global.webpanel.width",
      400,
    );

    const autoUnload = Services.prefs.getBoolPref(
      "floorp.browser.sidebar2.hide.to.unload.panel.enabled",
      false,
    );

    const position_start = Services.prefs.getBoolPref(
      "floorp.browser.sidebar.right",
      true,
    );

    const displayed = Services.prefs.getBoolPref(
      "floorp.browser.sidebar.is.displayed",
      true,
    );

    const config: PanelSidebarConfig = {
      globalWidth,
      autoUnload,
      position_start,
      displayed,
    };

    Services.prefs.setStringPref(
      PanelSidebarStaticNames.panelSidebarConfigPrefName,
      JSON.stringify({ config }),
    );
  } else if (!data) {
    // set default data

    const defaultData: PanelSidebarData = {
      data: [],
      index: [],
    };

    Services.prefs.setStringPref(
      PanelSidebarStaticNames.panelSidebarDataPrefName,
      JSON.stringify(defaultData),
    );

    // set default config
    const defaultConfig: PanelSidebarConfig = {
      globalWidth: 400,
      autoUnload: false,
      position_start: true,
      displayed: true,
    };

    Services.prefs.setStringPref(
      PanelSidebarStaticNames.panelSidebarConfigPrefName,
      JSON.stringify(defaultConfig),
    );
  }

  console.log(
    JSON.stringify(
      Services.prefs.getStringPref(
        PanelSidebarStaticNames.panelSidebarDataPrefName,
        undefined,
      ),
    ),

    console.log(
      JSON.stringify(
        Services.prefs.getStringPref(
          PanelSidebarStaticNames.panelSidebarConfigPrefName,
          undefined,
        ),
      ),
    ),
  );
  callback();
}
