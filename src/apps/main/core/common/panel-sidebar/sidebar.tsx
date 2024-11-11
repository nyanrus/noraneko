/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import style from "./style.css?inline";
import { SidebarHeader } from "./sidebar-header";
import { SidebarSelectbox } from "./sidebar-selectbox";
import { SidebarSplitter } from "./sidebar-splitter";
import { createEffect, Show } from "solid-js";
import { selectedPanelId, isFloating, setSelectedPanelId } from "./data";

export class PanelSidebarElem {
  private static instance: PanelSidebarElem;
  public static getInstance() {
    if (!PanelSidebarElem.instance) {
      PanelSidebarElem.instance = new PanelSidebarElem();
    }
    return PanelSidebarElem.instance;
  }

  private get documentElement() {
    return document?.documentElement as XULElement;
  }

  constructor() {
    const parentElem = document?.getElementById("browser");
    const beforeElem = document?.getElementById("appcontent");
    render(() => this.sidebar(), parentElem, {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      hotCtx: (import.meta as any).hot,
      marker: beforeElem as XULElement,
    });

    render(() => this.style(), document?.head, {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      hotCtx: (import.meta as any).hot,
    });

    createEffect(() => {
      if (selectedPanelId() === null) {
        this.documentElement?.style.setProperty(
          "--panel-sidebar-display",
          "none",
        );
      } else {
        this.documentElement?.style.setProperty(
          "--panel-sidebar-display",
          "flex",
        );
      }
    });

    document?.addEventListener("click", (event) => {
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
    });
  }

  private style() {
    return <style>{style}</style>;
  }

  private sidebar() {
    return (
      <>
        <xul:vbox
          id="panel-sidebar-box"
          class="chromeclass-extrachrome"
          data-floating={isFloating().toString()}
        >
          <SidebarHeader />
          <xul:vbox id="panel-sidebar-browser-box" style="flex: 1;" />
        </xul:vbox>
        <Show when={!isFloating()}>
          <SidebarSplitter />
        </Show>
        <SidebarSelectbox />
      </>
    );
  }
}
