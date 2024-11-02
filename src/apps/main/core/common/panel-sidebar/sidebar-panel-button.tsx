/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, createEffect } from "solid-js";
import { getFaviconURLForPage } from "./utils/favicon-getter";
import { PanelSidebar } from "./panel-sidebar";

export function PanelSidebarButton(id: string, type: string, url: string) {
  const gPanelSidebar = PanelSidebar.getInstance();
  const [faviconUrl, setFaviconUrl] = createSignal("");

  createEffect(async () => {
    const iconUrl = await getFaviconURLForPage(url);
    setFaviconUrl(iconUrl);
  });

  return (
    <xul:toolbarbutton
      id={id}
      class={`${type} panel-sidebar-panel`}
      context="all-panel-context"
      style={{
        "list-style-image": `url(${faviconUrl()})`,
      }}
      onCommand={() => {
        gPanelSidebar.showPanel(id);
      }}
    />
  );
}
