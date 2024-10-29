/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect, createSignal } from "solid-js";
import { type Panels, zPanels } from "./utils/type.js";
import { PanelSidebarStaticNames } from "./utils/panel-sidebar-static-names.js";

/** WorkspacesServices data */
export const [panelSidebarData, setPanelSidebarData] = createSignal<Panels>(
  zPanels.parse(
    getPanelSidebarData(
      Services.prefs.getStringPref(
        PanelSidebarStaticNames.panelSidebarDataPrefName,
        "{}",
      ),
    ),
  ),
);

createEffect(() => {
  Services.prefs.setStringPref(
    PanelSidebarStaticNames.panelSidebarDataPrefName,
    JSON.stringify({ data: panelSidebarData() }),
  );
});

Services.prefs.addObserver(
  PanelSidebarStaticNames.panelSidebarDataPrefName,
  () =>
    setPanelSidebarData(
      zPanels.parse(
        getPanelSidebarData(
          Services.prefs.getStringPref(
            PanelSidebarStaticNames.panelSidebarDataPrefName,
            "{}",
          ),
        ),
      ),
    ),
);

function getPanelSidebarData(stringData: string) {
  return JSON.parse(stringData).data || {};
}

function getPanelSidebarConfig(stringData: string) {
  return JSON.parse(stringData).config || {};
}
