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
  data: [],
  index: [],
};

export const strDefaultConfig = JSON.stringify(defaultConfig);
export const strDefaultData = JSON.stringify(defaultData);
