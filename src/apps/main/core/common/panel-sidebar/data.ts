/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect, createSignal } from "solid-js";
import { strDefaultConfig, strDefaultData } from "./utils/default-prerf.js";
import { PanelSidebarStaticNames } from "./utils/panel-sidebar-static-names.js";
import {
  type Panels,
  type PanelSidebarConfig,
  type PanelSidebarIndex,
  zPanels,
  zPanelSidebarConfig,
  zPanelSidebarIndex,
} from "./utils/type.js";

/** PanelSidebar data */
export const [panelSidebarData, setPanelSidebarData] = createSignal<Panels>(
  zPanels.parse(
    getPanelSidebarData(
      Services.prefs.getStringPref(
        PanelSidebarStaticNames.panelSidebarDataPrefName,
        strDefaultData,
      ),
    ),
  ),
);

Services.prefs.addObserver(
  PanelSidebarStaticNames.panelSidebarDataPrefName,
  () =>
    setPanelSidebarData(
      zPanels.parse(
        getPanelSidebarData(
          Services.prefs.getStringPref(
            PanelSidebarStaticNames.panelSidebarDataPrefName,
            strDefaultData,
          ),
        ),
      ),
    ),
);

function getPanelSidebarData(stringData: string) {
  return JSON.parse(stringData).data || {};
}

/** Get PanelSidebar Index Array Data */
export const [panelSidebarIndex, setPanelSidebarIndex] =
  createSignal<PanelSidebarIndex>(
    zPanelSidebarIndex.parse(
      getPanelSidebarIndex(
        Services.prefs.getStringPref(
          PanelSidebarStaticNames.panelSidebarDataPrefName,
          strDefaultData,
        ),
      ),
    ),
  );

function getPanelSidebarIndex(stringData: string) {
  return JSON.parse(stringData).index || [];
}

/** Create Effect to save PanelSidebarData and Index Array Data */
createEffect(() => {
  Services.prefs.setStringPref(
    PanelSidebarStaticNames.panelSidebarDataPrefName,
    JSON.stringify({ data: panelSidebarData(), index: panelSidebarIndex() }),
  );
});

/** Get PanelSidebar Config data */
export const [panelSidebarConfig, setPanelSidebarConfig] =
  createSignal<PanelSidebarConfig>(
    zPanelSidebarConfig.parse(
      getPanelSidebarConfig(
        Services.prefs.getStringPref(
          PanelSidebarStaticNames.panelSidebarConfigPrefName,
          strDefaultConfig,
        ),
      ),
    ),
  );

createEffect(() => {
  Services.prefs.setStringPref(
    PanelSidebarStaticNames.panelSidebarConfigPrefName,
    JSON.stringify({ ...panelSidebarConfig() }),
  );
});

Services.prefs.addObserver(
  PanelSidebarStaticNames.panelSidebarConfigPrefName,
  () =>
    setPanelSidebarConfig(
      zPanelSidebarConfig.parse(
        getPanelSidebarConfig(
          Services.prefs.getStringPref(
            PanelSidebarStaticNames.panelSidebarConfigPrefName,
            strDefaultConfig,
          ),
        ),
      ),
    ),
);

function getPanelSidebarConfig(stringData: string) {
  return JSON.parse(stringData) || {};
}
