/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { PlacesUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PlacesUtils.sys.mjs",
);

const gFavicons = PlacesUtils.favicons as nsIFaviconService;

export async function getFaviconURLForPage(url: string): Promise<string> {
  return new Promise((resolve) => {
    gFavicons.getFaviconURLForPage(Services.io.newURI(url), (e: nsIURI) => {
      if (e?.spec !== undefined) {
        resolve(e.spec);
      } else {
        resolve(`https://www.google.com/s2/favicons?domain=${url}&sz=32`);
      }
    });
  });
}
