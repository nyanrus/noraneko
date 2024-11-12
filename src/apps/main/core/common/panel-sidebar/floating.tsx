/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect } from "solid-js";
import { isFloating, panelSidebarConfig, setSelectedPanelId } from "./data";

export class PanelSidebarFloating {
  private static instance: PanelSidebarFloating;
  public static getInstance() {
    if (!PanelSidebarFloating.instance) {
      PanelSidebarFloating.instance = new PanelSidebarFloating();
    }
    return PanelSidebarFloating.instance;
  }

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    createEffect(() => {
      if (isFloating()) {
        this.applyHeightToSidebarBox();
        this.initResizeObserver();
        document?.addEventListener("click", this.handleOutsideClick);
      } else {
        this.removeHeightToSidebarBox();
        this.resizeObserver?.disconnect();
        document?.removeEventListener("click", this.handleOutsideClick);
      }
    });

    createEffect(() => {
      const position = panelSidebarConfig().position_start;
      if (position) {
        document
          ?.getElementById("panel-sidebar-box")
          ?.setAttribute("data-floating-splitter-side", "start");
      } else {
        document
          ?.getElementById("panel-sidebar-box")
          ?.setAttribute("data-floating-splitter-side", "end");
      }
    });
  }

  private initResizeObserver() {
    const browserElem = document?.getElementById("browser");
    const sidebarBox = document?.getElementById("panel-sidebar-box");

    if (!browserElem || !sidebarBox) {
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target.id === "browser" && isFloating()) {
          this.applyHeightToSidebarBox();
        }
      }
    });

    this.resizeObserver.observe(browserElem);
  }

  private applyHeightToSidebarBox() {
    (document?.getElementById("panel-sidebar-box") as XULElement).style.height =
      `${this.getBrowserHeight() - 50}px`;
  }

  private removeHeightToSidebarBox() {
    (document?.getElementById("panel-sidebar-box") as XULElement).style.height =
      "";
  }

  private getBrowserHeight() {
    return document?.getElementById("browser")?.clientHeight ?? 0;
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!isFloating()) {
      return;
    }

    const sidebarBox = document?.getElementById("panel-sidebar-box");
    const selectBox = document?.getElementById("panel-sidebar-select-box");
    const splitter = document?.getElementById("panel-sidebar-splitter");
    const browsers = sidebarBox?.querySelectorAll(".sidebar-panel-browser");

    const clickedBrowser = (event.target as XULElement).ownerDocument
      ?.activeElement;
    const clickedBrowserIsSidebarBrowser = Array.from(browsers ?? []).some(
      (browser) => browser === clickedBrowser,
    );

    const insideSidebar =
      sidebarBox?.contains(event.target as Node) ||
      clickedBrowserIsSidebarBrowser;
    const insideSelectBox = selectBox?.contains(event.target as Node);
    const insideSplitter = splitter?.contains(event.target as Node);

    if (!insideSidebar && !insideSelectBox && !insideSplitter) {
      setSelectedPanelId(null);
    }
  };
}
