/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, createEffect } from "solid-js";
import { getFaviconURLForPanel } from "./utils/favicon-getter";
import { PanelSidebar } from "./panel-sidebar";
import { selectedPanelId } from "./data";
import type { Panel } from "./utils/type";

export function PanelSidebarButton({ panel }: { panel: Panel }) {
  const gPanelSidebar = PanelSidebar.getInstance();
  const [faviconUrl, setFaviconUrl] = createSignal("");

  createEffect(async () => {
    const iconUrl = await getFaviconURLForPanel(panel);
    console.log(iconUrl);
    setFaviconUrl(iconUrl);
  });

  return (
    <xul:toolbarbutton
      id={panel.id}
      class={`${panel.type} panel-sidebar-panel`}
      context="all-panel-context"
      data-checked={selectedPanelId() === panel.id}
      style={{
        "list-style-image": `url(${faviconUrl()})`,
      }}
      onCommand={() => {
        gPanelSidebar.changePanel(panel.id);
      }}
    />
  );
}
