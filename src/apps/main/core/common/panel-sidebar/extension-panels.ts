/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

type Sidebar = {
  title: string;
  url: string;
  menuId: string;
  keyId: string;
  menuL10nId: string;
  revampL10nId: string;
  iconUrl: string;
  disabled: boolean;
};

function getFirefoxSidebarPanels(): Sidebar[] {
  return Array.from(window.SidebarController.sidebars as Sidebar[]).filter(
    (sidebar) => {
      return !sidebar.url.startsWith("chrome://");
    },
  );
}

export function isExtensionExist(keyId: string): boolean {
  return EXTENSION_PANEL_DATA.some((panel) => panel.keyId === keyId);
}

export const EXTENSION_PANEL_DATA = getFirefoxSidebarPanels().map((sidebar) => {
  return {
    keyId: sidebar.keyId,
    url: sidebar.url,
    icon: sidebar.iconUrl,
    l10n: sidebar.title,
  };
});
