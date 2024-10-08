/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WorkspacesServices } from "./workspaces.js";

export function ContextMenu(props: {
  disableBefore: boolean;
  disableAfter: boolean;
  contextWorkspaceId: string;
}) {
  const { disableBefore, disableAfter, contextWorkspaceId } = props;
  const gWorkspacesServices = WorkspacesServices.getInstance();

  return (
    <>
      <xul:menuitem
        data-l10n-id="reorder-this-workspace-to-up"
        label="Move this Workspace Up"
        disabled={disableBefore}
        onCommand={() =>
          gWorkspacesServices.reorderWorkspaceUp(contextWorkspaceId)
        }
      />
      <xul:menuitem
        data-l10n-id="reorder-this-workspace-to-down"
        label="Move this Workspace Down"
        disabled={disableAfter}
        onCommand={() =>
          gWorkspacesServices.reorderWorkspaceDown(contextWorkspaceId)
        }
      />
      <xul:menuseparator class="workspaces-context-menu-separator" />
      <xul:menuitem
        data-l10n-id="delete-this-workspace"
        label="Delete Workspace"
        onCommand={() =>
          gWorkspacesServices.deleteWorkspace(contextWorkspaceId)
        }
      />
      <xul:menuitem
        data-l10n-id="manage-this-workspaces"
        label="Manage Workspace"
        onCommand={() =>
          gWorkspacesServices.manageWorkspaceFromDialog(contextWorkspaceId)
        }
      />
    </>
  );
}
