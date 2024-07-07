/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const getOldInterfaceConfig = () => {
  switch (Services.prefs.getIntPref("floorp.browser.user.interface", 0)) {
    case 3:
      switch (Services.prefs.getIntPref("floorp.lepton.interface", 0)) {
        case 1:
          return "photon";
        case 3:
          return "proton";
        default:
          return "lepton";
      }
    case 8:
      return "fluerial";
    default:
      return "proton";
  }
};

export const getOldTabbarStyleConfig = () => {
  switch (Services.prefs.getIntPref("floorp.tabbar.style", 0)) {
    case 1:
      return "multirow";
    case 2:
      return "vertical";
    default:
      return "default";
  }
};

export const getOldTabbarPositionConfig = () => {
  switch (Services.prefs.getIntPref("floorp.browser.tabbar.settings", 0)) {
    case 1:
      return "hidden";
    case 2:
      return "verticalTabOptimized";
    case 3:
      return "bottomOfToolbar";
    case 4:
      return "bottomOfWindow";
    default:
      return "top";
  }
};
