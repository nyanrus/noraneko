/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { panelSidebarData } from "./data";
import { STATIC_PANEL_DATA } from "./static-panel";

export class PanelSidebar {
  private static instance: PanelSidebar;
  static getInstance() {
    if (!PanelSidebar.instance) {
      PanelSidebar.instance = new PanelSidebar();
    }
    return PanelSidebar.instance;
  }

  get generatedPanelId() {
    return Services.uuid.generateUUID().toString();
  }

  get currentPanel() {
    return window.gFloorpPanelSidebarCurrentPanel ?? null;
  }

  private createDefaultPanelData() {
    const panels = panelSidebarData();
  }

  constructor() {
    console.log("PanelSidebar constructor");
  }
}
