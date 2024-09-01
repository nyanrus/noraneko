/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ContextMenuUtils } from "@core/utils/context-menu";
import { Workspaces } from "./workspaces";
import { ContextMenu } from "./contextMenu";
import { render } from "@nora/solid-xul";

export class workspacesToolbarButton {
  private static instance: workspacesToolbarButton;
  public static getInstance() {
    if (!workspacesToolbarButton.instance) {
      workspacesToolbarButton.instance = new workspacesToolbarButton();
    }
    return workspacesToolbarButton.instance;
  }

  /**
   * Create context menu items for workspaces.
   * @param event The event.
   * @returns The context menu items.
   */
  private createWorkspacesContextMenuItems(event: Event) {
    const gWorkspaces = Workspaces.getInstance();
    //delete already exsist items
    const menuElem = document?.getElementById(
      "workspaces-toolbar-item-context-menu",
    );
    while (menuElem?.firstChild) {
      const firstChild = menuElem.firstChild as XULElement;
      firstChild.remove();
    }

    const contextWorkspaceId = event.explicitOriginalTarget?.id.replace(
      "workspace-",
      "",
    );
    const defaultWorkspaceId = gWorkspaces.getDefaultWorkspaceId();
    const beforeSiblingElem =
      event.explicitOriginalTarget?.previousElementSibling?.getAttribute(
        "workspaceId",
      ) || null;
    const afterSiblingElem =
      event.explicitOriginalTarget?.nextElementSibling?.getAttribute(
        "workspaceId",
      ) || null;
    const isDefaultWorkspace = contextWorkspaceId === defaultWorkspaceId;
    const isBeforeSiblingDefaultWorkspace =
      beforeSiblingElem === defaultWorkspaceId;
    const isAfterSiblingExist = afterSiblingElem != null;
    const needDisableBefore =
      isDefaultWorkspace || isBeforeSiblingDefaultWorkspace;
    const needDisableAfter = isDefaultWorkspace || !isAfterSiblingExist;

    //create context menu
    const parentElem = document?.getElementById(
      "workspaces-toolbar-item-context-menu",
    );
    render(() => ContextMenu({ disableBefore: needDisableBefore, disableAfter: needDisableAfter, contextWorkspaceId }), parentElem, {
      hotCtx: import.meta.hot,
    });
  }

  private PopupSet() {
    return (
      <xul:popupset>
        <xul:menupopup
          id="workspaces-toolbar-item-context-menu"
          onpopupshowing={(event) =>
            this.createWorkspacesContextMenuItems(event)
          }
        />
      </xul:popupset>
    );
  }

  constructor() {
    ContextMenuUtils.addToolbarContentMenuPopupSet(() => this.PopupSet());
  }
}
