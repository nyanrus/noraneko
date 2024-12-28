/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Browser, Manifest, Icon, SSB } from "./type";
import { DataManager } from "./dataStore";
import { IconProcesser } from "./iconProcesser";
import { ManifestProcesser } from "./manifestProcesser";

export class ProgressiveWebApp {
  private static instance: ProgressiveWebApp;
  private dataManager: DataManager;
  private iconProcesser: IconProcesser;
  private manifestProcesser: ManifestProcesser;

  private constructor() {
    this.dataManager = DataManager.getInstance();
    this.iconProcesser = IconProcesser.getInstance();
    this.manifestProcesser = ManifestProcesser.getInstance();
  }

  public static getInstance(): ProgressiveWebApp {
    if (!ProgressiveWebApp.instance) {
      ProgressiveWebApp.instance = new ProgressiveWebApp();
    }
    return ProgressiveWebApp.instance;
  }

  /**
   * Register a new PWA/SSB from a browser instance
   * @param browser The browser instance containing the PWA information
   * @returns Promise<void>
   */
  public async registerFromBrowser(browser: Browser): Promise<void> {
    const manifest = await this.manifestProcesser.getManifestFromBrowser(
      browser,
      true
    );
    await this.dataManager.saveSsbData(manifest);
  }

  /**
   * Get all registered PWAs/SSBs
   * @returns Promise<Record<string, Manifest>>
   */
  public async getAllPWAs(): Promise<Record<string, Manifest>> {
    return await this.dataManager.getCurrentSsbData();
  }

  /**
   * Remove a PWA/SSB by its ID
   * @param id The ID of the PWA/SSB to remove
   * @returns Promise<void>
   */
  public async removePWA(id: string): Promise<void> {
    await this.dataManager.removeSsbData(id);
  }

  /**
   * Get the best icon for a PWA based on the desired size
   * @param icons Array of available icons
   * @param targetSize Desired icon size
   * @returns Icon The best matching icon
   */
  public getBestIcon(icons: Icon[], targetSize = 64): Icon {
    const iconList = this.iconProcesser.buildIconList(icons);
    let bestIcon = iconList[0]?.icon;

    for (const { icon, size } of iconList) {
      if (size >= targetSize) {
        bestIcon = icon;
        break;
      }
    }
    return bestIcon;
  }

  /**
   * Create a manifest for a PWA
   * @param browser The browser instance
   * @param useWebManifest Whether to use the web manifest or generate a new one
   * @returns Promise<Manifest>
   */
  public async createManifest(
    browser: Browser,
    useWebManifest: boolean
  ): Promise<Manifest> {
    return await this.manifestProcesser.getManifestFromBrowser(
      browser,
      useWebManifest
    );
  }

  /**
   * Check if a URL is already registered as a PWA
   * @param url The URL to check
   * @returns Promise<boolean>
   */
  public async isPWARegistered(url: string): Promise<boolean> {
    const data = await this.getAllPWAs();
    return Object.values(data).some((manifest) => manifest.start_url === url);
  }

  /**
   * Get a PWA by its start URL
   * @param url The start URL of the PWA
   * @returns Promise<Manifest | null>
   */
  public async getPWAByUrl(url: string): Promise<Manifest | null> {
    const data = await this.getAllPWAs();
    return (
      Object.values(data).find((manifest) => manifest.start_url === url) || null
    );
  }

  /**
   * Get an SSB by its ID (which is the start_url)
   * @param id The ID (start_url) of the SSB to retrieve
   * @returns Promise<SSB | null>
   */
  public async getSsbById(id: string): Promise<SSB | null> {
    const data = await this.getAllPWAs();
    const manifest = Object.values(data).find((m) => m.start_url === id);

    if (manifest) {
      return {
        name: manifest.name,
        id: manifest.start_url,
        startUrl: manifest.start_url,
        icons: this.getBestIcon(manifest.icons),
      };
    }
    return null;
  }
}
