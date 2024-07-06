/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal } from "solid-js";
import { z } from "zod";

type zFloorpDesignConfigsType = z.infer<typeof zFloorpDesignConfigs>;

const getOldConfigs = JSON.stringify({
  globalConfigs: {
    verticalTabEnabled: false,
    multiRowTabEnabled: false,
    userInterface: "lepton",
    appliedUserJs: "",
  },
  tabbar: {
    tabbarStyle: "default",
    tabbarPosition: "top",
    multiRowTabBar: {
      maxRowEnabled: Services.prefs.getBoolPref(
        "floorp.browser.tabbar.multirow.max.enabled",
        false,
      ),
      maxRow: Services.prefs.getIntPref(
        "floorp.browser.tabbar.multirow.max.row",
        3,
      ),
    },
    verticalTabBar: {
      enablePadding: Services.prefs.getBoolPref(
        "floorp.verticaltab.paddingtop.enabled",
        false,
      ),
    },
  },
  fluerial: {
    roundVerticalTabs: false,
  },
});

export const zFloorpDesignConfigs = z.object({
  globalConfigs: z.object({
    userInterface: z.string(),
    appliedUserJs: z.string(),
  }),
  tabbar: z.object({
    tabbarStyle: z.string(),
    tabbarPosition: z.string(),
    multiRowTabBar: z.object({
      maxRowEnabled: z.boolean(),
      maxRow: z.number(),
    }),
    verticalTabBar: z.object({
      enablePadding: z.boolean(),
    }),
  }),
  fluerial: z.object({
    roundVerticalTabs: z.boolean(),
  }),
});

export const [config, setConfig] = createSignal(
  zFloorpDesignConfigs.parse(
    JSON.parse(
      Services.prefs.getStringPref("floorp.design.configs", getOldConfigs),
    ),
  ),
);

export const setGlobalDesignConfig = (
  key: keyof zFloorpDesignConfigsType["globalConfigs"],
  value: boolean | string | number,
) => {
  setConfig((prev) => ({
    ...prev,
    globalConfigs: {
      ...prev.globalConfigs,
      [key]: value,
    },
  }));
};

export const setBrowserInterface = (value: string) => {
  setGlobalDesignConfig("userInterface", value);
};

Services.prefs.addObserver("floorp.design.configs", () =>
  setConfig(
    zFloorpDesignConfigs.parse(
      JSON.parse(Services.prefs.getStringPref("floorp.design.configs")),
    ),
  ),
);
