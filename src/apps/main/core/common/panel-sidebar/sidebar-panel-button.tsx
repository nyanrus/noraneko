/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, createEffect } from "solid-js";
import { getFaviconURLForPanel } from "./utils/favicon-getter";
import { PanelSidebar } from "./panel-sidebar";
import { selectedPanelId, panelSidebarData, setPanelSidebarData } from "./data";
import type { Panel } from "./utils/type";
import { isExtensionExist } from "./extension-panels";

export function PanelSidebarButton({ panel }: { panel: Panel }) {
  const gPanelSidebar = PanelSidebar.getInstance();
  const [faviconUrl, setFaviconUrl] = createSignal("");

  createEffect(async () => {
    const iconUrl = await getFaviconURLForPanel(panel);
    setFaviconUrl(iconUrl);
  });

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer?.setData("text/plain", panel.id);
    (e.target as HTMLElement).classList.add("dragging");
  };

  const handleDragEnd = (e: DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragging");
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).classList.add("drag-over");
  };

  const handleDragLeave = (e: DragEvent) => {
    (e.target as HTMLElement).classList.remove("drag-over");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).classList.remove("drag-over");

    const sourceId = e.dataTransfer?.getData("text/plain");
    const targetId = panel.id;

    if (sourceId === targetId) return;

    const panels = [...panelSidebarData()];
    const sourceIndex = panels.findIndex((p) => p.id === sourceId);
    const targetIndex = panels.findIndex((p) => p.id === targetId);

    const [movedPanel] = panels.splice(sourceIndex, 1);
    panels.splice(targetIndex, 0, movedPanel);

    setPanelSidebarData(panels);
  };

  if (
    panel.type === "extension" &&
    !isExtensionExist(panel.extensionId as string)
  ) {
    return null;
  }

  return (
    <xul:toolbarbutton
      id={panel.id}
      class={`${panel.type} panel-sidebar-panel`}
      context="all-panel-context"
      data-checked={selectedPanelId() === panel.id}
      style={{
        "list-style-image": `url(${faviconUrl()})`,
      }}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onCommand={() => {
        gPanelSidebar.changePanel(panel.id);
      }}
    />
  );
}
