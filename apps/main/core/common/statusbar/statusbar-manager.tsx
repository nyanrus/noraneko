/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect, createSignal } from "solid-js";
import type {} from "solid-styled-jsx";

export const [showStatusbar, setShowStatusbar] = createSignal(
  Services.prefs.getBoolPref("noraneko.statusbar.enable", false),
);

export class StatusBarManager {
  private get statusbarEnabled() {
    return showStatusbar();
  }

  constructor() {
    window.CustomizableUI.registerArea("statusBar", {
      type: window.CustomizableUI.TYPE_TOOLBAR,
      defaultPlacements: ["screenshot-button", "fullscreen-button"],
    });
    window.CustomizableUI.registerToolbarNode(
      document.getElementById("statusBar"),
    );

    Services.prefs.setBoolPref("noraneko.statusbar.enable", showStatusbar());

    createEffect(() => {
      Services.prefs.setBoolPref("noraneko.statusbar.enable", showStatusbar());
      // const statuspanel_label = document.getElementById(
      //   "statuspanel-label",
      // ) as XULElement;
      // const statuspanel = document.getElementById("statuspanel") as XULElement;
      // const statusText = document.getElementById("status-text") as XULElement;
      // const observer = new MutationObserver(() => {
      //   if (statuspanel.getAttribute("inactive") === "true" && statusText) {
      //     statusText.setAttribute("hidden", "true");
      //   } else {
      //     statusText?.removeAttribute("hidden");
      //   }
      // });

      // if (showStatusbar()) {
      //   statusText?.appendChild(statuspanel_label!);
      //   observer.observe(statuspanel, { attributes: true });
      // } else {
      //   statuspanel?.appendChild(statuspanel_label!);
      //   observer?.disconnect();
      // }
    });

    //move elem to bottom of window
    document
      .querySelector("#appcontent")
      ?.appendChild(document.getElementById("statusBar")!);
    this.observeStatusbar();
  }

  private observeStatusbar() {
    Services.prefs.addObserver("noraneko.statusbar.enable", () =>
      setShowStatusbar(() => this.statusbarEnabled),
    );
  }
}
