/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Manifest } from "./type";

export class DataManager {
  private static instance: DataManager;
  public static getInstance() {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  private get ssbStoreFile() {
    return PathUtils.join(PathUtils.profileDir, "ssb", "ssb.json");
  }

  public async getCurrentSsbData() {
    const fileExists = await IOUtils.exists(this.ssbStoreFile);
    if (!fileExists) {
      IOUtils.writeJSON(this.ssbStoreFile, {});
      return {};
    }
    return await IOUtils.readJSON(this.ssbStoreFile);
  }

  public async overrideCurrentSsbData(ssbData: object) {
    await IOUtils.writeJSON(this.ssbStoreFile, ssbData);
  }

  async saveSsbData(ssbData: Manifest) {
    console.log("saveSsbData", ssbData);
    const start_url = ssbData.start_url;
    const currentSsbData = await this.getCurrentSsbData();
    currentSsbData[start_url] = ssbData;
    await this.overrideCurrentSsbData(currentSsbData);
  }

  async removeSsbData(ssbId: string) {
    const list = await this.getCurrentSsbData();
    for (const key in list) {
      if (Object.prototype.hasOwnProperty.call(list, key)) {
        const item = list[key];
        if (item.id === ssbId) {
          delete list[key];
          await this.overrideCurrentSsbData(list);
        }
      }
    }
  }
}
