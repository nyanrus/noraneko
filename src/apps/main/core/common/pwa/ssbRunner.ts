/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { DataManager } from "./dataStore";
import type { Browser, Manifest, SSB } from "./type";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

export class SsbRunner {
  private static instance: SsbRunner;
  public static getInstance(): SsbRunner {
    if (!SsbRunner.instance) {
      SsbRunner.instance = new SsbRunner();
    }
    return SsbRunner.instance;
  }

  public async runSsbById(id: string) {
    const dataManager = DataManager.getInstance();
    const ssbData = await dataManager.getCurrentSsbData();

    this.openSsbWindow(ssbData[id]);
  }

  public async runSsbByUrl(url: string) {
    const dataManager = DataManager.getInstance();
    const ssbData = await dataManager.getCurrentSsbData();

    console.log(ssbData, url);

    this.openSsbWindow(ssbData[url]);
  }

  private openSsbWindow(ssb: SSB) {
    const browserWindowFeatures =
      "chrome,location=yes,centerscreen,dialog=no,resizable=yes,scrollbars=yes";
    //"chrome,location=yes,centerscreen,dialog=no,resizable=yes,scrollbars=yes";

    const args = Cc["@mozilla.org/supports-string;1"].createInstance(
      Ci.nsISupportsString
    );

    // URL
    args.data = `${ssb.startUrl},${ssb.id},?FloorpEnableSSBWindow=true`;

    Services.ww.openWindow(
      null as unknown as mozIDOMWindowProxy,
      AppConstants.BROWSER_CHROME_URL,
      "_blank",
      browserWindowFeatures,
      args
    );
  }
}
