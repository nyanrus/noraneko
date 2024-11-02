/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import { ChromeSiteBrowser } from "./browsers/chrome-site-browser";
import { ExtensionSiteBrowser } from "./browsers/extension-site-browser";
import { WebSiteBrowser } from "./browsers/web-site-browser";
import { panelSidebarData } from "./data";
import type { Panel } from "./utils/type";

export class PanelSidebar {
  private static instance: PanelSidebar;
  static getInstance() {
    if (!PanelSidebar.instance) {
      PanelSidebar.instance = new PanelSidebar();
    }
    return PanelSidebar.instance;
  }

  private get generatedPanelId() {
    return Services.uuid.generateUUID().toString();
  }

  private get currentPanel() {
    return window.gFloorpPanelSidebarCurrentPanel ?? null;
  }

  private get parentElem() {
    return document?.getElementById("panel-sidebar-browser-box");
  }

  public getPanelById(id: string) {
    return panelSidebarData().find((panel) => panel.id === id);
  }

  public getPanelByIndex(index: number) {
    return panelSidebarData()[index];
  }

  public getBrowserById(id: string) {
    return window.gFloorpPanelSidebarBrowsers[id] ?? null;
  }

  public createWebPanelBrowser(panel: Panel) {
    switch (panel.type) {
      case "web":
        return <WebSiteBrowser {...panel} />;
      case "extension":
        return <ExtensionSiteBrowser {...panel} />;
      case "static":
        return <ChromeSiteBrowser {...panel} />;
      default:
        throw new Error(`Unknown panel type: ${panel.type}`);
    }
  }

  public showPanel(panelId: string) {
    const panel = this.getPanelById(panelId);
    if (!panel) {
      throw new Error(`Panel with id ${panelId} not found`);
    }

    const browser = this.createWebPanelBrowser(panel);
    render(() => browser, this.parentElem, {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      hotCtx: (import.meta as any).hot,
    });
  }
}
