/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import { PanelSidebar } from "./panel-sidebar";

export class SidebarContextMenuElem {
  private static instance: SidebarContextMenuElem;
  public static getInstance() {
    if (!SidebarContextMenuElem.instance) {
      SidebarContextMenuElem.instance = new SidebarContextMenuElem();
    }
    return SidebarContextMenuElem.instance;
  }

  constructor() {
    const parentElem = document?.body;
    const beforeElem = document?.getElementById("window-modal-dialog");
    render(() => this.sidebarContextMenu(), parentElem, {
      marker: beforeElem as XULElement,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      hotCtx: (import.meta as any).hot,
    });
  }

  private sidebarContextMenu() {
    const gPanelSidebar = PanelSidebar.getInstance();
    return (
      <xul:popupset>
        <xul:menupopup
          id="webpanel-context"
          onpopupshowing="gPanelSidebar.contextMenu.show(event);"
        >
          <xul:menuitem
            id="unloadWebpanelMenu"
            class="needLoadedWebpanel"
            data-l10n-id="sidebar2-unload-panel"
            label="Unload this webpanel"
            accesskey="U"
            onCommand={() => gPanelSidebar.contextMenu.unloadWebpanel()}
          />
          <xul:menuseparator class="context-webpanel-separator" />
          <xul:menuitem
            id="muteMenu"
            class="needLoadedWebpanel"
            data-l10n-id="sidebar2-mute-and-unmute"
            label="Mute/Unmute this webpanel"
            accesskey="M"
            onCommand={() => gPanelSidebar.contextMenu.muteWebpanel()}
          />
          <xul:menu
            id="changeZoomLevelMenu"
            class="needLoadedWebpanel needRunningExtensionsPanel"
            data-l10n-id="sidebar2-change-zoom-level"
            accesskey="Z"
          >
            <xul:menupopup id="changeZoomLevelPopup">
              <xul:menuitem
                id="zoomInMenu"
                accesskey="I"
                data-l10n-id="sidebar2-zoom-in"
                onCommand={() => gPanelSidebar.contextMenu.zoomIn()}
              />
              <xul:menuitem
                id="zoomOutMenu"
                accesskey="O"
                data-l10n-id="sidebar2-zoom-out"
                onCommand={() => gPanelSidebar.contextMenu.zoomOut()}
              />
              <xul:menuitem
                id="resetZoomMenu"
                accesskey="R"
                data-l10n-id="sidebar2-reset-zoom"
                onCommand={() => gPanelSidebar.contextMenu.resetZoom()}
              />
            </xul:menupopup>
          </xul:menu>
          <xul:menuitem
            id="changeUAWebpanelMenu"
            data-l10n-id="sidebar2-change-ua-panel"
            label="Switch User agent to Mobile/Desktop Version at this Webpanel"
            accesskey="R"
            onCommand={() => gPanelSidebar.contextMenu.changeUserAgent()}
          />
          <xul:menuseparator class="context-webpanel-separator" />
          <xul:menuitem
            id="deleteWebpanelMenu"
            data-l10n-id="sidebar2-delete-panel"
            accesskey="D"
            onCommand={() => gPanelSidebar.contextMenu.deleteWebpanel()}
          />
        </xul:menupopup>

        <xul:menupopup
          id="all-panel-context"
          onpopupshowing="gPanelSidebar.contextMenu.show(event);"
        >
          <xul:menuitem
            id="unloadWebpanelMenu"
            class="needLoadedWebpanel"
            data-l10n-id="sidebar2-unload-panel"
            label="Unload this webpanel"
            accesskey="U"
            onCommand={() => gPanelSidebar.contextMenu.unloadWebpanel()}
          />
          <xul:menuseparator class="context-webpanel-separator" />
          <xul:menuitem
            id="deleteWebpanelMenu"
            data-l10n-id="sidebar2-delete-panel"
            accesskey="D"
            onCommand={() => gPanelSidebar.contextMenu.deleteWebpanel()}
          />
        </xul:menupopup>

        <xul:menupopup id="width-size-context">
          <xul:menuitem
            id="setWidthMenu"
            data-l10n-id="sidebar2-keep-width-for-global"
            label="Set width for All Panel"
            accesskey="S"
            onCommand={() => gPanelSidebar.keepWidthToGlobalValue()}
          />
        </xul:menupopup>
      </xul:popupset>
    );
  }
}
