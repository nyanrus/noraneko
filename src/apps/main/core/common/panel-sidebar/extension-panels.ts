/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

type Sidebar = {
  title: string;
  extensionId: string;
  url: string;
  menuId: string;
  keyId: string;
  menuL10nId: string;
  revampL10nId: string;
  iconUrl: string;
  disabled: boolean;
};

type MapSidebars = [string, Sidebar][];

export function getFirefoxSidebarPanels(): Sidebar[] {
  console.log(
    Array.from(window.SidebarController.sidebars as MapSidebars).filter(
      (sidebar) => {
        return sidebar[1].extensionId;
      },
    ),
  );
  return Array.from(window.SidebarController.sidebars as MapSidebars)
    .filter((sidebar) => {
      return sidebar[1].extensionId;
    })
    .map((sidebar) => {
      return sidebar[1];
    });
}

export function isExtensionExist(keyId: string): boolean {
  return getFirefoxSidebarPanels().some((panel) => panel.keyId === keyId);
}
