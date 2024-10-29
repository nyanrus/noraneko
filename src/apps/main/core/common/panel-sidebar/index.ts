/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PanelSidebar } from "./panel-sidebar";
import { PanelSidebarElem } from "./sidebar-elem";
import { SidebarContextMenuElem } from "./sidebar-contextMenu";

export function init() {
  PanelSidebarElem.getInstance();
  SidebarContextMenuElem.getInstance();
  PanelSidebar.getInstance();

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (import.meta as any).hot?.accept((m: any) => {
    m?.init();
  });
}
