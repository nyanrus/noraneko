/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import style from "./style.css?inline";
import { For } from "solid-js";
import { panelSidebarData } from "./data";
import { PanelSidebarButton } from "./sidebar-panel-button";

export class PanelSidebarElem {
  private static instance: PanelSidebarElem;
  public static getInstance() {
    if (!PanelSidebarElem.instance) {
      PanelSidebarElem.instance = new PanelSidebarElem();
    }
    return PanelSidebarElem.instance;
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
  }

  private style() {
    return <style>{style}</style>;
  }

  private sidebar() {
    return (
      <>
        <xul:vbox
          id="panel-sidebar-box"
          class="browser-sidebar2 chromeclass-extrachrome"
        >
          <xul:box id="panel-sidebar-header" align="center">
            <xul:toolbarbutton
              id="panel-sidebar-back"
              class="panel-sidebar-actions"
              data-l10n-id="sidebar-back-button"
            />
            <xul:toolbarbutton
              id="panel-sidebar-forward"
              class="panel-sidebar-actions"
              data-l10n-id="sidebar-forward-button"
            />
            <xul:toolbarbutton
              id="panel-sidebar-reload"
              class="panel-sidebar-actions"
              data-l10n-id="sidebar-reload-button"
            />
            <xul:toolbarbutton
              id="panel-sidebar-go-index"
              class="panel-sidebar-actions"
              data-l10n-id="sidebar-go-index-button"
            />
            <xul:spacer flex="1" />
            <xul:toolbarbutton
              id="panel-sidebar-keeppanelwidth"
              context="width-size-context"
              class="panel-sidebar-actions"
            />
            <xul:toolbarbutton
              id="panel-sidebar-close"
              class="panel-sidebar-actions"
            />
          </xul:box>
          <xul:vbox id="panel-sidebar-browser-box" style="flex: 1;" />
        </xul:vbox>
        <xul:splitter
          id="panel-sidebar-splitter"
          class="chromeclass-extrachrome"
          hidden={false}
        />
        <xul:vbox
          id="panel-sidebar-select-box"
          class="webpanel-box chromeclass-extrachrome"
        >
          <For each={panelSidebarData()}>
            {(panel) => PanelSidebarButton(panel.id, "web", panel.url)}
          </For>
          <xul:spacer flex="1" />
          <xul:vbox id="panel-sidebar-bottomButtonBox">
            <xul:toolbarbutton
              class="sidepanel-browser-icon"
              data-l10n-id="sidebar2-hide-sidebar"
              onCommand={() =>
                Services.prefs.setBoolPref(
                  "floorp.browser.sidebar.enable",
                  false,
                )
              }
              id="panel-sidebar-hide-icon"
            />
            <xul:toolbarbutton
              class="sidepanel-browser-icon"
              data-l10n-id="sidebar-addons-button"
              onCommand={() =>
                window.BrowserAddonUI.openAddonsMgr("addons://list/extension")
              }
              id="panel-sidebar-addons-icon"
            />
            <xul:toolbarbutton
              class="sidepanel-browser-icon"
              data-l10n-id="sidebar-passwords-button"
              onCommand={() =>
                window.LoginHelper.openPasswordManager(window, {
                  entryPoint: "mainmenu",
                })
              }
              id="panel-sidebar-passwords-icon"
            />
            <xul:toolbarbutton
              class="sidepanel-browser-icon"
              data-l10n-id="sidebar-preferences-button"
              onCommand={() => window.openPreferences()}
              id="panel-sidebar-preferences-icon"
            />
          </xul:vbox>
        </xul:vbox>
      </>
    );
  }
}
