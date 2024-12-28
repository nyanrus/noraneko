/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ManifestProcesser } from "./manifestProcesser";
import { DataManager } from "./dataStore";
import type { Browser, Manifest } from "./type";
import { SsbRunner } from "./ssbRunner";
import { render } from "@nora/solid-xul";
import { SsbPageAction } from "./SsbPageAction";

export class SiteSpecificBrowserManager {
  private static instance: SiteSpecificBrowserManager;
  private manifestProcesser: ManifestProcesser;
  private dataManager: DataManager;

  public static getInstance(): SiteSpecificBrowserManager {
    if (!SiteSpecificBrowserManager.instance) {
      SiteSpecificBrowserManager.instance = new SiteSpecificBrowserManager();
    }
    return SiteSpecificBrowserManager.instance;
  }

  private constructor() {
    this.manifestProcesser = ManifestProcesser.getInstance();
    this.dataManager = DataManager.getInstance();
    this.initPageAction();

    document?.addEventListener("floorpOnLocationChangeEvent", () => {
      this.onCurrentTabChangedOrLoaded();
    });
  }

  private initPageAction() {
    const starButtonBox = document?.getElementById("star-button-box");
    const ssbPageAction = document?.getElementById("page-action-buttons");
    if (!starButtonBox || !ssbPageAction) return;

    const ssbPageActionInstance = SsbPageAction.getInstance();

    render(() => <ssbPageActionInstance.Render />, ssbPageAction, {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      hotCtx: (import.meta as any)?.hot,
      marker: starButtonBox,
    });
  }

  async onCommand() {
    window.gSsbSupport.functions.installOrRunCurrentPageAsSsb(true);
  }

  closePopup() {
    const panel = document?.getElementById("ssb-panel") as XULElement & {
      hidePopup: () => void;
    };
    if (panel) {
      panel.hidePopup();
    }
  }

  public async getIcon(browser: Browser) {
    const currentTabSsb = await this.getCurrentTabSsb(browser);
    return currentTabSsb.icons[0].src;
  }

  public async getManifest(browser: Browser) {
    const currentTabSsb = await this.getCurrentTabSsb(browser);
    return currentTabSsb;
  }

  public async installOrRunCurrentPageAsSsb(browser: Browser, asPwa = true) {
    const isInstalled = await this.checkCurrentPageIsInstalled(browser);

    if (isInstalled) {
      const currentTabSsb = await this.getCurrentTabSsb(browser);
      const ssbObj = await this.getIdByUrl(currentTabSsb.start_url);

      if (ssbObj) {
        await this.runSsbByUrl(ssbObj.start_url);
      }
    } else {
      const manifest = await this.createFromBrowser(browser, {
        useWebManifest: asPwa,
      });

      await this.install(manifest);

      // Installing needs some time to finish
      window.setTimeout(() => {
        this.runSsbByUrl(manifest.start_url);
      }, 3000);
    }
  }

  private async checkCurrentPageIsInstalled(
    browser: Browser
  ): Promise<boolean> {
    if (!this.checkSiteCanBeInstall(browser.currentURI)) {
      return false;
    }

    const currentTabSsb = await this.getCurrentTabSsb(browser);
    const ssbData = await this.dataManager.getCurrentSsbData();

    for (const key in ssbData) {
      if (
        key === currentTabSsb.start_url ||
        currentTabSsb.start_url.startsWith(key)
      ) {
        return true;
      }
    }
    return false;
  }

  private checkSiteCanBeInstall(uri: nsIURI): boolean {
    return (
      uri.scheme === "https" ||
      uri.scheme === "http" ||
      uri.host === "localhost" ||
      uri.host === "127.0.0.1"
    );
  }

  private async getCurrentTabSsb(browser: Browser) {
    return await this.manifestProcesser.getManifestFromBrowser(browser, true);
  }

  private async createFromBrowser(
    browser: Browser,
    options: { useWebManifest: boolean }
  ): Promise<Manifest> {
    return await this.manifestProcesser.getManifestFromBrowser(
      browser,
      options.useWebManifest
    );
  }

  private async install(manifest: Manifest) {
    await this.dataManager.saveSsbData(manifest);
  }

  private async getIdByUrl(url: string) {
    const ssbData = await this.dataManager.getCurrentSsbData();
    return ssbData[url];
  }

  private async runSsbByUrl(url: string) {
    SsbRunner.getInstance().runSsbByUrl(url);
  }

  private async onCurrentTabChangedOrLoaded() {
    const browser = window.gBrowser.selectedBrowser;
    const currentPageCanBeInstalled = this.checkSiteCanBeInstall(
      browser.currentURI
    );
    const currentPageHasSsbManifest =
      await this.manifestProcesser.getManifestFromBrowser(browser, true);
    const currentPageIsInstalled = await this.checkCurrentPageIsInstalled(
      browser
    );

    if (
      (!currentPageCanBeInstalled || !currentPageHasSsbManifest) &&
      !currentPageIsInstalled
    ) {
      return;
    }

    console.log(currentPageIsInstalled);

    // Update UI elements
    this.updateUIElements(currentPageIsInstalled);
  }

  private updateUIElements(isInstalled: boolean) {
    const installButton = document?.getElementById("ssbPageAction");
    const image = document?.getElementById("ssbPageAction-image");

    if (installButton && image) {
      installButton.removeAttribute("hidden");
      if (isInstalled) {
        image.setAttribute("open-ssb", "true");
      } else {
        image.removeAttribute("open-ssb");
      }
    }
  }

  public async uninstallById(id: string) {
    await this.dataManager.removeSsbData(id);
  }
}
