/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect, createSignal } from "solid-js";
import type {} from "solid-styled-jsx";

export const [showStatusbar, setShowStatusbar] = createSignal(
  Services.prefs.getBoolPref("browser.display.statusbar", false),
);

createEffect(() => {
  const statuspanel_label = document.getElementById(
    "statuspanel-label",
  ) as XULElement;
  const statuspanel = document.getElementById("statuspanel") as XULElement;
  const statusText = document.getElementById("status-text") as XULElement;

  Services.prefs.setBoolPref("browser.display.statusbar", showStatusbar());

  if (showStatusbar()) {
    document.getElementById("status-text")?.appendChild(statuspanel_label!);
  } else {
    document.getElementById("statuspanel")?.appendChild(statuspanel_label!);
  }

  const observer = new MutationObserver(() => {
    if (statuspanel.getAttribute("inactive") === "true" && statusText) {
      statusText.setAttribute("hidden", "true");
    } else {
      statusText?.removeAttribute("hidden");
    }
  });

  observer?.disconnect();

  if (showStatusbar()) {
    observer.observe(statuspanel, { attributes: true });
  }
});

class gFloorpStatusBarServices {
  private static instance: gFloorpStatusBarServices;

  public static getInstance() {
    if (!gFloorpStatusBarServices.instance) {
      gFloorpStatusBarServices.instance = new gFloorpStatusBarServices();
    }
    return gFloorpStatusBarServices.instance;
  }

  public init() {
    window.CustomizableUI.registerArea("statusBar", {
      type: window.CustomizableUI.TYPE_TOOLBAR,
      defaultPlacements: ["screenshot-button", "fullscreen-button"],
    });
    window.CustomizableUI.registerToolbarNode(
      document.getElementById("statusBar"),
    );

    //move elem to bottom of window
    document.body?.appendChild(document.getElementById("statusBar")!);
    this.observeStatusbar();
  }

  private observeStatusbar() {
    Services.prefs.addObserver("browser.display.statusbar", () =>
      setShowStatusbar(() =>
        Services.prefs.getBoolPref("browser.display.statusbar", false),
      ),
    );
  }
}

export const gFloorpStatusBar = gFloorpStatusBarServices.getInstance();
