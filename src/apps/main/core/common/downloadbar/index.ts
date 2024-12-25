/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createRootHMR, render } from "@nora/solid-xul";
import { Downloadbar } from "./downloadbar";
import { DownloadBarManager } from "./downloadbar-manager";
import { onCleanup } from "solid-js";

export let manager: DownloadBarManager;

export function init() {
  console.log("downloadbar init")
  createRootHMR(
    () => {
      manager = new DownloadBarManager();
      manager.init();
    },
    import.meta.hot,
  );
  const originalDownloadsPanel = document!.getElementById("downloadsPanel")!;
  const originalDownloadsPanelParent = originalDownloadsPanel?.parentElement;
  
  originalDownloadsPanel?.remove();
  render(Downloadbar, document.getElementById("a11y-announcement"), {
    hotCtx: import.meta.hot,
  });
  console.log("init download bar");

  const scrollElem = document.getElementById("downloadsListBox");
  function _onWheel(e) {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) {
      return;
    }
    e.preventDefault();
    scrollElem.scrollLeft += e.deltaY * 10;
  }

  createRootHMR(()=>{
    initDownloadsView();
    scrollElem?.addEventListener("wheel", _onWheel);
    onCleanup(() => {
      scrollElem?.removeEventListener("wheel",_onWheel);
      originalDownloadsPanelParent?.appendChild(originalDownloadsPanel)
    })
  },import.meta.hot);

  import.meta.hot?.accept((m) => {
    console.log(m)
    m?.init();
  });
}

const original = {
  panel: null,
  richListBox:null,
  contextMenu: null,
  onDownloadAdded: null as (null | ((arg0:unknown)=>void)),
  hidePanel: null,
}

function initDownloadsView() {
  original.panel = window.DownloadsPanel.panel;
  original.richListBox = window.DownloadsPanel.richListBox;
  original.hidePanel = window.DownloadsPanel.hidePanel;
  original.contextMenu = window.DownloadsView.contextMenu;
  

  window.DownloadsPanel.hidePanel = () => {
    return;
  };
  delete window.DownloadsView.contextMenu;
  delete window.DownloadsPanel.panel;
  delete window.DownloadsPanel.richListBox;
  window.DownloadsPanel.panel = document!.getElementById("downloadsPanel");
  window.DownloadsPanel.richListBox =
    document!.getElementById("downloadsListBox");
  window.DownloadsView.contextMenu = document!.getElementById(
    "downloadsContextMenu",
  );
  window.DownloadsPanel._initialized = false;
  window.DownloadsPanel.initialize();
  original.onDownloadAdded = window.DownloadsView.onDownloadAdded;
  window.DownloadsView.onDownloadAdded = (download: unknown) => {
    document!.getElementById("downloadsListBox")!.scrollLeft = 0;
    original.onDownloadAdded!(download);
  };

  onCleanup(() => {
    delete window.DownloadsView.contextMenu;
    delete window.DownloadsPanel.panel;
    delete window.DownloadsPanel.richListBox;
    window.DownloadsPanel.panel = original.panel;
    window.DownloadsPanel.richListBox = original.richListBox;
    window.DownloadsPanel.hidePanel = original.hidePanel;
    window.DownloadsPanel.contextMenu = original.contextMenu;
    window.DownloadsPanel.onDownloadAdded = original.onDownloadAdded;
  })
}