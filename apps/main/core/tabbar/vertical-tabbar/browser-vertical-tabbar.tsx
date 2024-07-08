/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect } from "solid-js";
import { config, setConfig } from "../../designs/configs";
import type { zFloorpDesignConfigsType } from "../../designs/configs";
import verticalTabarStyle from "./browser-vertical-tabbar.css?url";
// import verticalTabarHoverStyle from "./browser-vertical-tabbar.css?url";
import { insert } from "@nora/solid-xul";

export class gVerticalTabbarClass {
  private static instance: gVerticalTabbarClass;
  public static getInstance() {
    if (!gVerticalTabbarClass.instance) {
      gVerticalTabbarClass.instance = new gVerticalTabbarClass();
    }
    return gVerticalTabbarClass.instance;
  }

  private listeneradded = false;
  private widthObserver = new MutationObserver(this.mutationObserverCallback);
  private get tabsToolbar(): XULElement | null {
    return document.querySelector("#TabsToolbar");
  }
  private get titlebarContainer(): XULElement | null {
    return document.querySelector("#titlebar");
  }
  private get browserBox(): XULElement | null {
    return document.querySelector("#browser");
  }
  private get arrowscrollbox(): XULElement | null {
    return document.querySelector("#tabbrowser-arrowscrollbox");
  }
  private get tabbrowserTabs(): XULElement | null {
    return document.querySelector("#tabbrowser-tabs");
  }
  private get toolbarModificationStyle(): XULElement | null {
    return document.querySelector("#verticalTabsStyle");
  }
  private get hoverStyleElem(): XULElement | null {
    return document.querySelector("#floorp-vthover");
  }
  private get splitter(): XULElement | null {
    return document.querySelector("#verticaltab-splitter");
  }
  private get tabContextCloseTabsToTheStart(): XULElement | null {
    return document.querySelector("#context_closeTabsToTheStart");
  }
  private get tabContextCloseTabsToTheEnd(): XULElement | null {
    return document.querySelector("#context_closeTabsToTheEnd");
  }

  private enableVerticalTabbar() {
    this.browserBox?.prepend(this.tabsToolbar || "");
    this.arrowscrollbox?.removeAttribute("overflowing");
    this.tabsToolbar?.setAttribute("multibar", "true");

    document
      .querySelector("#TabsToolbar .toolbar-items")
      ?.setAttribute("align", "start");

    this.tabsToolbar?.removeAttribute("flex");
    this.splitter?.removeAttribute("hidden");
    this.tabsToolbar?.removeAttribute("hidden");
    document
      .getElementById("TabsToolbar")
      ?.setAttribute("width", config().tabbar.verticalTabBar.width.toString());

    // Context menu localization
    this.tabContextCloseTabsToTheStart?.setAttribute(
      "data-lazy-l10n-id",
      "close-tabs-to-the-start-on-vertical-tab-bar",
    );

    this.tabContextCloseTabsToTheEnd?.setAttribute(
      "data-lazy-l10n-id",
      "close-tabs-to-the-end-on-vertical-tab-bar",
    );

    // fix cannot use middle click to open new tab
    if (!this.listeneradded) {
      this.arrowscrollbox?.addEventListener("click", (event) =>
        this.mouseMiddleClickEventListener(event as MouseEvent),
      );
      this.listeneradded = true;
    }

    //TODO: Migrate to Solid JS style coding.
    insert(
      document.head,
      <link rel="stylesheet" href={`chrome://noraneko${verticalTabarStyle}`} />,
      document.head?.lastElementChild,
    );

    // Width observer
    this.widthObserver = new MutationObserver(this.mutationObserverCallback);

    if (this.tabsToolbar) {
      this.widthObserver.observe(this.tabsToolbar, {
        attributes: true,
      });
    }
  }

  private disableVerticalTabbar() {
    document.documentElement?.removeAttribute("g-vertical-tabbar");
  }

  private mouseMiddleClickEventListener(event: MouseEvent) {
    if (event.button !== 1 || event.target !== this.arrowscrollbox) {
      return;
    }
    window.gBrowser.handleNewTabMiddleClick(this.arrowscrollbox, event);
  }

  mutationObserverCallback(mutations: any) {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "width"
      ) {
        this.setVerticalTabbarConfig(
          "width",
          Number(mutation.target?.style.width),
        );
      }
    }
  }

  public setVerticalTabbarConfig = (
    key: keyof zFloorpDesignConfigsType["tabbar"]["verticalTabBar"],
    value: boolean | string | number,
  ) => {
    setConfig((prev) => ({
      ...prev,
      tabbar: {
        ...prev.tabbar,
        verticalTabBar: {
          ...prev.tabbar.verticalTabBar,
          [key]: value,
        },
      },
    }));
  };

  constructor() {
    createEffect(() => {
      config().tabbar.tabbarStyle === "vertical"
        ? this.enableVerticalTabbar()
        : this.disableVerticalTabbar();
    });
  }
}
