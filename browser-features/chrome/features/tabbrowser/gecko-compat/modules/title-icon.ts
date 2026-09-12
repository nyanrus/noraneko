// SPDX-License-Identifier: MPL-2.0
// Ported from tabbrowser.js L1102~L1886
// Section: Title · Icon · Label · Browser Sharing

import type { TabbrowserCompat } from "../TabbrowserCompat.ts";
import { FAVICON_DEFAULTS } from "../tabbrowser-scope.ts";
import { dispatch } from "../compat-helpers.ts";

/** @augments TabbrowserCompat */
declare module "../TabbrowserCompat.ts" {
  interface TabbrowserCompat {
    _cleanupTabSwitchTelemetry(now: number): void;
    tabLocalization: any;
    // Methods provided by this module
    setTabTitle(tab: MozTabbrowserTab): boolean;
    setIcon(tab: MozTabbrowserTab, iconUrl?: any, origUrl?: any, clearFirst?: boolean): void;
    getIcon(tab: MozTabbrowserTab): string;
    setDefaultIcon(tab: MozTabbrowserTab, uri: any): void;
    getTabSharingState(tab: MozTabbrowserTab): any;
    updateBrowserSharing(browser: XULBrowserElement, state: any): void;
    resetBrowserSharing(browser: XULBrowserElement): void;
    getWindowTitleForBrowser(browser: XULBrowserElement): string;
    _populateTitleCache(): void;
    _determineTaskbarTabTitle(profile: string | false | undefined): string | null;
    _determineContentTitle(browser: XULBrowserElement): string;
    setPageInfo(tab: MozTabbrowserTab, url: string, description: string, previewImage: string): void;
    setInitialTabTitle(tab: MozTabbrowserTab, title: string, options?: any): void;
    setTabLabelForAuthPrompts(tab: MozTabbrowserTab, label: string): boolean;
    previewTab(tab: MozTabbrowserTab, callback: () => void): void;
    getBrowserForOuterWindowID(id: number): any;
    getTabFromAudioEvent(event: Event): any;
    _checkIfShouldTriggerTabSelectMessage(): void;
    _setTabLabel(tab: MozTabbrowserTab, label: string, options?: any): boolean;
  }
}

export const methods = {
  // ==========================================================================
  // Title / Icon / Label (setTabTitle, _setTabLabel, updateTabIcon, etc.)
  // tabbrowser.js L1784~L2153, L1887~L1960, L1961~L2046
  // ==========================================================================

  /**
   * Update the tab's visible label from `browser.contentTitle`.
   *
   * The title pipeline: contentTitle → URL fallback → hostname fallback.
   * Returns `true` if the label was actually changed.
   */
  // upstream: setTabTitle@0022ebd446 FIREFOX_143_0_1_RELEASE
  setTabTitle(tab: MozTabbrowserTab): boolean {
    const browser = this.getBrowserForTab(tab) as any;
    let title = browser.contentTitle;

    if (tab.hasAttribute("customizemode")) {
      title = this.tabLocalization.formatValueSync("tabbrowser-customizemode-tab-title");
    }

    // Don't replace initially set label with URL while loading
    if (tab._labelIsInitialTitle) {
      if (!title) return false;
      delete (tab as any)._labelIsInitialTitle;
    }

    let isURL = false;
    title = title.trim();

    // If title contains only non-printing characters, discard it
    if (this._nonPrintingRegEx.test(title)) {
      title = "";
    }

    const isContentTitle = !!title;
    if (!title) {
      // Try URI as title
      if (browser.currentURI.displaySpec) {
        try {
          title = Services.io.createExposableURI(browser.currentURI).displaySpec;
        } catch (_) {
          title = browser.currentURI.displaySpec;
        }
      }

      if (title && !isBlankPageURL(title)) {
        isURL = true;
        if (title.length <= 500 || !this._dataURLRegEx.test(title)) {
          try {
            const characterSet = browser.characterSet;
            title = Services.textToSubURI.unEscapeNonAsciiURI(characterSet, title);
          } catch (_) { /* */ }
        }
      } else {
        title = this.tabContainer.emptyTabTitle;
      }
    }

    return this._setTabLabel(tab, title, { isContentTitle, isURL });
  },

  // upstream: _setTabLabel@6cbb625fd7 FIREFOX_143_0_1_RELEASE
  _setTabLabel(tab: MozTabbrowserTab, label: string, options: any = {}): boolean {
    if (!label || label.includes("about:reader?")) return false;

    const { beforeTabOpen, isContentTitle, isURL } = options;

    // Truncate long base64 data URIs
    if (isURL && label.length > 500 && this._dataURLRegEx.test(label)) {
      label = label.substring(0, 500) + "\u2026";
    }

    tab._fullLabel = label;

    if (!isContentTitle) {
      // Remove protocol and "www."
      if (!(this as any)._regex_shortenURLForTabLabel) {
        (this as any)._regex_shortenURLForTabLabel = /^[^:]+:\/\/(?:www\.)?/;
      }
      label = label.replace((this as any)._regex_shortenURLForTabLabel, "");
    }

    tab._labelIsContentTitle = isContentTitle;

    if (tab.getAttribute("label") === label) return false;

    // RTL detection
    const dwu = (this.window as any).windowUtils;
    const isRTL = dwu.getDirectionFromText(label) === Ci.nsIDOMWindowUtils.DIRECTION_RTL;

    tab.setAttribute("label", label);
    tab.setAttribute("labeldirection", isRTL ? "rtl" : "ltr");
    tab.toggleAttribute("labelendaligned", isRTL !== (document.dir === "rtl"));

    if (!beforeTabOpen) {
      this._tabAttrModified(tab, ["label"]);
    }

    if (tab.selected) {
      this.updateTitlebar();
    }

    return true;
  },

  /** Set the favicon URL for a tab. Pass `""` to clear it. */
  // upstream: setIcon@eb813beeca FIREFOX_143_0_1_RELEASE
  setIcon(tab: MozTabbrowserTab, iconUrl: any = "", origUrl: any = iconUrl, clearFirst = false) {
    const makeString = (url: any) => (url instanceof Ci.nsIURI ? url.spec : url);
    iconUrl = makeString(iconUrl);
    origUrl = makeString(origUrl);

    const LOCAL_PROTOCOLS = ["chrome:", "about:", "resource:", "data:"];
    if (iconUrl && !LOCAL_PROTOCOLS.some(p => iconUrl.startsWith(p))) {
      console.error(`Attempt to set a remote URL ${iconUrl} as a tab icon without a loading principal.`);
      return;
    }

    const browser = this.getBrowserForTab(tab) as any;
    browser.mIconURL = iconUrl;

    // The favicon the strip paints is the tab's `image` attribute; the store
    // alone shows nothing. (tabbrowser.js also reroutes remote SVG data: URIs
    // through moz-remote-image for out-of-process decoding; not ported.)
    if (iconUrl != tab.getAttribute("image")) {
      if (clearFirst) tab.removeAttribute("image");
      if (iconUrl) tab.setAttribute("image", iconUrl);
      else tab.removeAttribute("image");
      this._tabAttrModified(tab, ["image"]);
    }

    // The origUrl argument is currently only used by tests.
    this._callProgressListeners(browser, "onLinkIconAvailable", [iconUrl, origUrl]);
  },

  // upstream: getIcon@2b87848a28 FIREFOX_143_0_1_RELEASE
  getIcon(aTab?: MozTabbrowserTab): string {
    const browser = aTab ? this.getBrowserForTab(aTab) : this.selectedBrowser;
    return (browser as any).mIconURL;
  },

  // upstream: getTabSharingState@4607466f4a FIREFOX_143_0_1_RELEASE
  getTabSharingState(aTab: MozTabbrowserTab) {
    // Normalize the state object for consumers (ie.extensions).
    const state = Object.assign({}, aTab._sharingState && aTab._sharingState.webRTC);
    return {
      camera: !!state.camera,
      microphone: !!state.microphone,
      screen: state.screen && state.screen.replace("Paused", ""),
    };
  },

  /**
   * Clears the WebRTC sharing state for the browser's tab.
   *
   * Removes the `sharing` attribute and refreshes the permission panel when
   * the browser is currently selected.
   */
  // upstream: resetBrowserSharing@5e0e6a6731 FIREFOX_143_0_1_RELEASE
  resetBrowserSharing(browser: XULBrowserElement) {
    const tab = this.getTabForBrowser(browser);
    if (!tab) return;
    // If WebRTC was used, leave object to enable tracking of grace periods
    tab._sharingState = tab._sharingState?.webRTC ? { webRTC: {} } : {};
    tab.removeAttribute("sharing");
    this._tabAttrModified(tab, ["sharing"]);
    if (browser === this.selectedBrowser) {
      gPermissionPanel.updateSharingIndicator();
    }
  },

  /**
   * Merges new sharing state into the browser's tab and refreshes the sharing indicator.
   *
   * @param state - Partial sharing state to merge; e.g. `{ webRTC: { camera: true } }`.
   */
  // upstream: updateBrowserSharing@1fcb111528 FIREFOX_143_0_1_RELEASE
  updateBrowserSharing(browser: XULBrowserElement, state: any) {
    const tab = this.getTabForBrowser(browser);
    if (!tab) return;
    if (tab._sharingState == null) tab._sharingState = {};
    tab._sharingState = Object.assign(tab._sharingState, state);

    if ("webRTC" in state) {
      if (tab._sharingState!.webRTC?.sharing) {
        if (tab._sharingState!.webRTC.paused) {
          tab.removeAttribute("sharing");
        } else {
          tab.setAttribute("sharing", state.webRTC.sharing);
        }
      } else {
        tab.removeAttribute("sharing");
      }
      this._tabAttrModified(tab, ["sharing"]);
    }
    if (browser === this.selectedBrowser) {
      gPermissionPanel.updateSharingIndicator();
    }
  },

  /**
   * Sets the favicon to a built-in default for well-known URIs (e.g. `about:newtab`).
   *
   * Does nothing when `uri` is not in the built-in defaults map.
   */
  // upstream: setDefaultIcon@e9a29056bc FIREFOX_143_0_1_RELEASE
  setDefaultIcon(tab: MozTabbrowserTab, uri: nsIURI) {
    if (uri && uri.spec in FAVICON_DEFAULTS) {
      this.setIcon(tab, FAVICON_DEFAULTS[uri.spec]);
    }
  },

  /**
   * Persists page metadata to Places history and caches the description on the tab.
   *
   * @param url          - Page URL to update in history (skipped when empty).
   * @param description  - Short text description of the page.
   * @param previewImage - URL of the page's preview/thumbnail image.
   */
  // upstream: setPageInfo@e42a56cbd4 FIREFOX_143_0_1_RELEASE
  setPageInfo(_tab: MozTabbrowserTab, url: string, description: string, previewImage: string) {
    if (url) {
      const pageInfo = { url, description, previewImageURL: previewImage };
      PlacesUtils.history.update(pageInfo).catch(console.error);
    }
    if (_tab) (_tab as any).description = description;
  },

  /**
   * Sets the tab's label before any content title is available.
   *
   * Blank-page URLs are replaced with the empty-tab placeholder text.
   * Subsequent `setTabTitle` calls will override this value once a real
   * content title arrives.
   */
  // upstream: setInitialTabTitle@797bbb6ee3 FIREFOX_143_0_1_RELEASE
  setInitialTabTitle(tab: MozTabbrowserTab, title: string, options: any = {}) {
    if (!options.isContentTitle && isBlankPageURL(title)) {
      title = this.tabContainer.emptyTabTitle;
    }
    if (title) {
      if (!tab.getAttribute("label")) {
        tab._labelIsInitialTitle = true;
      }
      this._setTabLabel(tab, title, options);
    }
  },

  /**
   * Overrides the tab label with a string suitable for authentication prompts.
   *
   * @returns `true` if the label was changed, `false` otherwise.
   */
  // upstream: setTabLabelForAuthPrompts@11e2b5e7fa FIREFOX_143_0_1_RELEASE
  setTabLabelForAuthPrompts(tab: MozTabbrowserTab, label: string) {
    return this._setTabLabel(tab, label);
  },

  /**
   * Temporarily selects `tab`, runs `callback`, then restores the previously selected tab.
   *
   * Useful for capturing screenshots or reading layout without persisting a tab switch.
   */
  // upstream: previewTab@340a5c40b7 FIREFOX_143_0_1_RELEASE
  previewTab(tab: MozTabbrowserTab, callback: () => void) {
    const currentTab = this.selectedTab;
    try {
      this._previewMode = true;
      this.selectedTab = tab;
      callback();
    } finally {
      this.selectedTab = currentTab;
      this._previewMode = false;
    }
  },

  // upstream: getBrowserForOuterWindowID@152087e895 FIREFOX_143_0_1_RELEASE
  getBrowserForOuterWindowID(id: number): any {
    for (const b of this.browsers) {
      if (b.outerWindowID == id) {
        return b;
      }
    }
    return null;
  },

  /**
   * Resolves the tab that owns the browser that fired a trusted audio event.
   *
   * @returns The owning `MozTabbrowserTab`, or `null` for untrusted events.
   */
  // upstream: getTabFromAudioEvent@9e2e55fd72 FIREFOX_143_0_1_RELEASE
  getTabFromAudioEvent(event: Event): any {
    if (!event.isTrusted) return null;
    const browser = (event as any).originalTarget;
    return this.getTabForBrowser(browser);
  },

  /** Forget URL-pair switch counts older than the 60 s trigger window. */
  _cleanupTabSwitchTelemetry(now: number) {
    for (const [key, entry] of this._tabSwitchTelemetry) {
      if (now - entry.timestamp > 60_000) this._tabSwitchTelemetry.delete(key);
    }
  },

  _checkIfShouldTriggerTabSelectMessage() {
    // ASRouter tab switch trigger — track switch frequency between URL pairs (3 switches in 60s)
    try {
      const browser = this.selectedBrowser as any;
      if (!browser?.currentURI) return;
      const currentURL = browser.currentURI.spec;
      const now = Date.now();

      // Track the previous URL to detect pairs
      if (!this._previousURL) {
        this._previousURL = currentURL;
        return;
      }

      // Only track if switching between different URLs
      if (this._previousURL === currentURL) return;

      // Create key for the URL pair (sorted for bidirectional tracking)
      const [url1, url2] = [this._previousURL, currentURL].sort();
      const key = `${url1}<->${url2}`;

      this._cleanupTabSwitchTelemetry(now);

      const entry = this._tabSwitchTelemetry.get(key);
      if (entry) {
        entry.count++;
        entry.timestamp = now;
        if (entry.count >= 3) {
          // Trigger ASRouter message
          (this.window as any).ASRouter?.sendTriggerMessage?.({
            browser,
            id: "tabSwitch",
          });
          // Reset counter after triggering
          this._tabSwitchTelemetry.delete(key);
        }
      } else {
        this._tabSwitchTelemetry.set(key, { count: 1, timestamp: now });
      }

      // Update previous URL for next switch
      this._previousURL = currentURL;
    } catch (_) { /* */ }
  },

  /**
   * 窓のタイトルの部品(#mainWindowTitle など)を一度だけ読んで持っておく。
   * 143 は browser.xhtml の data-title-* を読んでいたが、155 でその属性は消えて
   * 隠し要素の textContent になった。
   */
  _populateTitleCache(): void {
    const doc = this.window.document;
    const info: Record<string, string> = {};
    for (const id of ["mainWindowTitle", "privateWindowTitle", "privateWindowSuffixForContent"]) {
      info[id] = doc.getElementById(id)?.textContent || "";
    }
    this._cachedTitleInfo = info;
  },

  /**
   * Taskbar Tab(Windows)の名前・コンテナ・プロファイルぶんのタイトル。
   * Taskbar Tab でなければ null(プロファイルは呼び手が足す)。
   */
  _determineTaskbarTabTitle(aProfile: string | false | undefined): string | null {
    if (!this._shouldExposeContentTitle) {
      // Taskbar Tab とコンテナの名前は、どのサイトに居るかを見せてしまう
      return null;
    }

    if (this._taskbarTabTitle && this._taskbarTabTitleLastProfile == aProfile) {
      return this._taskbarTabTitle;
    }

    const id = this.TaskbarTabsUtils.getTaskbarTabIdFromWindow(this.window);
    if (!id) {
      return null;
    }

    if (!this._taskbarTab) {
      this.TaskbarTabs.getTaskbarTab(id)
        .then((tt: any) => {
          this._taskbarTab = tt;
          this.updateTitlebar();
        })
        .catch(() => {
          // その Taskbar Tab は無い。そのままにする
        });
      return null;
    }

    const containerLabel = this._taskbarTab.userContextId
      ? ContextualIdentityService.getUserContextLabel(this._taskbarTab.userContextId)
      : "";

    let stringName = "taskbar-tab-title-default";
    if (containerLabel && aProfile) {
      stringName = "taskbar-tab-title-container-profile";
    } else if (containerLabel && !aProfile) {
      stringName = "taskbar-tab-title-container";
    } else if (!containerLabel && aProfile) {
      stringName = "taskbar-tab-title-profile";
    }

    this._taskbarTabTitle = this.tabLocalization.formatValueSync(stringName, {
      name: this._taskbarTab.name,
      container: containerLabel,
      profile: aProfile,
    });
    this._taskbarTabTitleLastProfile = (aProfile as string) ?? null;
    return this._taskbarTabTitle;
  },

  /** 中身(ページ)から来るぶんのタイトル。見せない設定なら空。 */
  _determineContentTitle(aBrowser: XULBrowserElement): string {
    let title = "";
    if (
      !this._shouldExposeContentTitle ||
      (PrivateBrowsingUtils.isWindowPrivate(this.window) &&
        !this._shouldExposeContentTitlePbm)
    ) {
      return title;
    }

    const docElement = this.window.document.documentElement;
    // If location bar is hidden and the URL type supports a host,
    // add the scheme and host to the title to prevent spoofing.
    // XXX https://bugzilla.mozilla.org/show_bug.cgi?id=22183#c239
    try {
      if (docElement.getAttribute("chromehidden")!.includes("location")) {
        const uri = Services.io.createExposableURI(aBrowser.currentURI);
        let prefix = uri.prePath;
        if (uri.scheme == "about") {
          prefix = uri.spec;
        } else if (uri.scheme == "moz-extension") {
          const ext = WebExtensionPolicy.getByHostname(uri.host);
          if (ext && ext.name) {
            const extensionLabel = this.window.document.getElementById("urlbar-label-extension");
            prefix = `${(extensionLabel as any).value} (${ext.name})`;
          }
        }
        title = prefix + " - ";
      }
    } catch (_e) {
      // ignored
    }

    if (docElement.hasAttribute("titlepreface")) {
      title += docElement.getAttribute("titlepreface");
    }

    const tab = this.getTabForBrowser(aBrowser) as any;
    if (tab?._labelIsContentTitle) {
      // Strip out any null bytes in the content title, since the
      // underlying widget implementations of nsWindow::SetTitle pass
      // null-terminated strings to system APIs.
      title += tab.getAttribute("label").replace(/\0/g, "");
    }
    return title;
  },

  // upstream: getWindowTitleForBrowser@0a1921ec88 FIREFOX_155_0_1_RELEASE
  getWindowTitleForBrowser(aBrowser: XULBrowserElement): string {
    if (!this._cachedTitleInfo) {
      this._populateTitleCache();
    }
    const contentTitle = this._determineContentTitle(aBrowser);
    const docElement = this.window.document.documentElement;
    const isTemporaryPrivateWindow =
      docElement.getAttribute("privatebrowsingmode") == "temporary";

    const profileIdentifier =
      SelectableProfileService?.isEnabled &&
      SelectableProfileService.getCachedProfileCount() > 1 &&
      SelectableProfileService.currentProfile?.name.replace(/\0/g, "");
    // 空のものは最後に落とす

    const taskbarTabTitle = this._determineTaskbarTabTitle(profileIdentifier);
    const parts: (string | false | null | undefined)[] = [
      contentTitle,
      taskbarTabTitle ?? profileIdentifier,
    ];

    // macOS のプライベート窓は、中身のタイトルがあるときだけ接尾辞を足す。
    // それ以外の platform では、下でブランド名ごと足す。
    if (AppConstants.platform == "macosx" && contentTitle && isTemporaryPrivateWindow) {
      parts.push(this._cachedTitleInfo!.privateWindowSuffixForContent);
    }

    // Taskbar Tab でなければブランド名を出す(Taskbar Tab のときは
    // _determineTaskbarTabTitle が出している)。macOS は中身のタイトルが
    // 無いときだけ、ほかは接尾辞として。
    if (!taskbarTabTitle && (!contentTitle || AppConstants.platform != "macosx")) {
      parts.push(
        this._cachedTitleInfo![isTemporaryPrivateWindow ? "privateWindowTitle" : "mainWindowTitle"]
      );
    }

    return parts.filter((x) => !!x).join(" — ");
  },

} satisfies Partial<TabbrowserCompat> & ThisType<TabbrowserCompat>;
