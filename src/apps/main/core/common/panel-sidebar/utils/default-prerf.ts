/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { PanelSidebarConfig, PanelSidebarData } from "./type";

const defaultConfig: PanelSidebarConfig = {
  globalWidth: 400,
  autoUnload: false,
  position_start: true,
  displayed: true,
};

const defaultData: PanelSidebarData = {
  data: [
    {
      id: "default-panel-google-com",
      url: "https://www.google.com",
      width: 0,
      userContextId: null,
      zoomLevel: null,
      type: "web",
    },
    {
      id: "default-panel-github-com",
      url: "https://www.github.com",
      width: 0,
      userContextId: null,
      zoomLevel: null,
      type: "web",
    },
    {
      id: "default-panel-youtube-com",
      url: "https://www.youtube.com",
      width: 0,
      userContextId: null,
      zoomLevel: null,
      type: "web",
    },
    {
      id: "default-panel-docs-floorp-app",
      url: "https://docs.floorp.app",
      width: 0,
      userContextId: null,
      zoomLevel: null,
      type: "web",
    },
  ],
};

export const strDefaultConfig = JSON.stringify(defaultConfig);
export const strDefaultData = JSON.stringify(defaultData);
