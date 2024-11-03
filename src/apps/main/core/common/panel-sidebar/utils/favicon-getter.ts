/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Panel } from "./type";
import { STATIC_PANEL_DATA } from "../static-panels";

const { PlacesUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PlacesUtils.sys.mjs",
);

const gFavicons = PlacesUtils.favicons as nsIFaviconService;
const DEFAULT_FAVICON = "chrome://branding/content/about-logo.png";

export async function getFaviconURLForPanel(panel: Panel): Promise<string> {
  try {
    const faviconURL = await getFaviconFromPlaces(panel.url);
    return faviconURL ?? getFallbackFavicon(panel);
  } catch {
    return getFallbackFavicon(panel);
  }
}

async function getFaviconFromPlaces(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    gFavicons.getFaviconURLForPage(
      Services.io.newURI(url),
      (uri: nsIURI) => resolve(uri?.spec),
    );
  });
}

function getFallbackFavicon(panel: Panel): string {
  switch (panel.type) {
    case "static":
      return STATIC_PANEL_DATA[panel.url as keyof typeof STATIC_PANEL_DATA].icon ?? DEFAULT_FAVICON;
    case "extension":
      return `chrome://${panel.url}/icon.png`;
    default:
      return `https://www.google.com/s2/favicons?domain=${panel.url}&sz=32`;
  }
}
