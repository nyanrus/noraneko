/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PanelSidebar } from "./panel-sidebar";
import { render } from "@nora/solid-xul";
import style from "./style.css?inline";
import { For } from "solid-js";
import { panelSidebarData } from "./data";

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
    const gPanelSidebar = PanelSidebar.getInstance();
    return (
      <>
        <xul:vbox
          id="panel-sidebar-box"
          style="min-width: 25em; z-index: 1"
          class="browser-sidebar2 chromeclass-extrachrome"
        >
          <xul:box
            id="panel-sidebar-header"
            style="min-height: 2.5em"
            align="center"
          >
            <xul:toolbarbutton
              id="panel-sidebar-back"
              class="sidebar2-icon"
              style="margin-left: 0.5em;"
              data-l10n-id="sidebar-back-button"
              onCommand={() => gPanelSidebar.sidebarButtons(0)}
            />
            <xul:toolbarbutton
              id="panel-sidebar-forward"
              class="sidebar2-icon"
              style="margin-left: 1em;"
              data-l10n-id="sidebar-forward-button"
              onCommand={() => gPanelSidebar.sidebarButtons(1)}
            />
            <xul:toolbarbutton
              id="panel-sidebar-reload"
              class="sidebar2-icon"
              style="margin-left: 1em;"
              data-l10n-id="sidebar-reload-button"
              onCommand={() => gPanelSidebar.sidebarButtons(2)}
            />
            <xul:toolbarbutton
              id="panel-sidebar-go-index"
              class="sidebar2-icon"
              style="margin-left: 1em;"
              data-l10n-id="sidebar-go-index-button"
              onCommand={() => gPanelSidebar.sidebarButtons(3)}
            />
            <xul:spacer flex="1" />
            <xul:toolbarbutton
              id="panel-sidebar-keeppanelwidth"
              context="width-size-context"
              class="sidebar2-icon"
              style="margin-right: 0.5em;"
              data-l10n-id="sidebar-keepWidth-button"
              onCommand={() => gPanelSidebar.keepWebPanelWidth()}
            />
            <xul:toolbarbutton
              id="panel-sidebar-close"
              class="sidebar2-icon"
              style="margin-right: 0.5em;"
              data-l10n-id="sidebar2-close-button"
              onCommand={() =>
                gPanelSidebar.controllFunctions.changeVisibilityOfWebPanel()
              }
            />
          </xul:box>
        </xul:vbox>
        <xul:splitter
          id="panel-sidebar-splitter"
          class="browser-sidebar2 chromeclass-extrachrome"
          hidden={false}
        />
        <xul:vbox
          id="panel-sidebar-select-box"
          class="webpanel-box chromeclass-extrachrome"
        >
          <For each={panelSidebarData()}>
            {(panel) => (
              <xul:vbox id="panel-sidebar-box">
                <xul:toolbarbutton
                  label={panel.url[0]}
                  class="sidepanel-browser-icon"
                  data-l10n-id="sidebar-add-button"
                  id="panel-sidebar-add-button"
                />
              </xul:vbox>
            )}
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
                BrowserAddonUI.openAddonsMgr("addons://list/extension")
              }
              id="panel-sidebar-addons-icon"
            />
            <xul:toolbarbutton
              class="sidepanel-browser-icon"
              data-l10n-id="sidebar-passwords-button"
              onCommand={() =>
                LoginHelper.openPasswordManager(window, {
                  entryPoint: "mainmenu",
                })
              }
              id="panel-sidebar-passwords-icon"
            />
            <xul:toolbarbutton
              class="sidepanel-browser-icon"
              data-l10n-id="sidebar-preferences-button"
              onCommand={() => openPreferences()}
              id="panel-sidebar-preferences-icon"
            />
          </xul:vbox>
        </xul:vbox>
      </>
    );
  }
}
