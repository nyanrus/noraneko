import { insert } from "@solid-xul/solid-xul";
import splitViewStyle from "./browser-splitView.pcss?inline";
import { HideSplitViewSplitter, SplitViewSplitter } from "./split-view-splitter";

export namespace gSplitView {
  let StyleElement = () => {
    return <style id="splitViewCSS">{ splitViewStyle }</style>
  }

  type BrowserTab = {
    linkedBrowser: { docShellIsActive: boolean };
    linkedPanel: string;
    hasAttribute: (arg0: string) => boolean;
    setAttribute: (arg0: string, arg1: string) => void;
  }

  export function setSplitView(tab: BrowserTab, side: string) {
    try {
      removeSplitView();
    } catch (e) {}
    Services.prefs.setBoolPref("floorp.browser.splitView.working", true);

    let panel = getLinkedPanel(tab.linkedPanel);
    let browser = tab.linkedBrowser;
    let browserDocShellIsActiveState = browser.docShellIsActive;

    // Check if the a tab is already in split view
    let tabs = window.gBrowser.tabs;
    for (const tab of tabs) {
      if (tab.hasAttribute("splitView")) {
        removeSplitView();
        break;
      }
    }

    insert(document.head, () => StyleElement, document.head?.lastChild);

    tab.setAttribute("splitView", "true");
    panel.setAttribute("splitview", side);
    panel.setAttribute("splitviewtab", "true");
    panel.classList.add("deck-selected");

    hideSplitter();

    insert(
      document.getElementById("tabbrowser-tabpanels"),
      () => <SplitViewSplitter />,
      document.getElementById("tabbrowser-tabpanels")?.lastChild
    )

    if (side === "left") {
      document.getElementById("splitview-splitter")?.setAttribute("style", "order: 1");
    } else {
      document.getElementById("splitview-splitter")?.setAttribute("style", "order: 3");
    }

    if (!browserDocShellIsActiveState) {
      browser.docShellIsActive = true;
    }

    setLocationChangeEvent();

    //Save splitView resized size to pref
    let currentSplitViewTab: XULElement | null = document.querySelector(`.tabbrowser-tab[splitView="true"]`);
    let currentSplitViewPanel = getLinkedPanel(currentSplitViewTab?.linkedPanel);
    const appcontent = document.getElementById("appcontent") as XULElement
    const panelWidth: number = appcontent?.clientWidth / 2 - 3;

    currentSplitViewPanel.setAttribute("style", `width: ${panelWidth}px`);
    if (currentSplitViewTab !== window.gBrowser.selectedTab) {
      window.gBrowser.getPanel().style.width = panelWidth + "px";
    }
    Services.prefs.setIntPref("floorp.browser.splitView.width", panelWidth);

    window.splitViewResizeObserver = new ResizeObserver(() => {
      let currentTab = window.gBrowser.selectedTab;
      if (
        Services.prefs.getBoolPref("floorp.browser.splitView.working") === true
        && currentSplitViewTab !== currentTab
      ) {
        let width = window.gBrowser.getPanel().clientWidth;
        Services.prefs.setIntPref("floorp.browser.splitView.width", width);
      }
    });
    window.splitViewResizeObserver.observe(
      document.querySelector("#tabbrowser-tabpanels [splitviewtab = true]")
    )
  }

  export function removeSplitView() {
    Services.prefs.setBoolPref("floorp.browser.splitView.working", false);

    let tab: XULElement | null = document.querySelector(`.tabbrowser-tab[splitView="true"]`);
    if (!tab) {
      return;
    }
    let panel = getLinkedPanel(tab.linkedPanel);

    //remove style
    let CSSElem = document.getElementById("splitViewCSS");
    CSSElem?.remove();

    document.getElementById("splitview-splitter")?.remove();
    tab.removeAttribute("splitView");
    panel.removeAttribute("splitview");
    panel.removeAttribute("splitviewtab");
    if (tab !== window.gBrowser.selectedTab) {
      panel.classList.remove("deck-selected");
    }

    if (window.browser.docShellIsActive) {
      window.browser.docShellIsActive = false;
    }

    let tabPanels = document.querySelectorAll("#tabbrowser-tabpanels > *");
    for (const tabPanel of tabPanels) {
      tabPanel.removeAttribute("width");
      tabPanel.removeAttribute("style");
    }

    removeLocationChangeEvent();
    window.splitViewResizeObserver.disconnect();
  }

  function getLinkedPanel(id: string) {
    return document.getElementById(id) as XULElement;
  }

  function hideSplitter() {
    if (
      window.gBrowser.selectedTab ===
      document.querySelector(".tabbrowser-tab[splitView='true']")) {
        insert(
          document.head,
          () => <HideSplitViewSplitter />,
          document.head?.lastChild
        )
    } else {
      let splitterHideCSS = document.getElementById("splitterHideCSS");
      if (splitterHideCSS) {
        splitterHideCSS.remove();
      }
    }
  }

  function setLocationChangeEvent() {
    document.addEventListener(
      "floorpOnLocationChangeEvent",
      onLocationChange
    )
  }

  function removeLocationChangeEvent() {
    document.removeEventListener(
      "floorpOnLocationChangeEvent",
      onLocationChange
    )
  }

  function onLocationChange() {
    hideSplitter();

    let currentSplitViewTab: XULElement | null = document.querySelector(`.tabbrowser-tab[splitView="true"]`);
    let currentSplitViewPanel = getLinkedPanel(currentSplitViewTab?.linkedPanel);
    if (currentSplitViewPanel !== window.gBrowser.getPanel()) {
      window.gBrowser.getPanel().style.width = Services.prefs.getIntPref("floorp.browser.splitView.width") + "px";
    }

    handleTabEvent();
  }

  function handleTabEvent() {
    if (!Services.prefs.getBoolPref("floorp.browser.splitView.working")) {
      return;
    }

    let currentSplitViewTab: XULElement | null = document.querySelector(`.tabbrowser-tab[splitView="true"]`);
    let currentSplitViewPanel = getLinkedPanel(currentSplitViewTab?.linkedPanel);
    let currentSplitViewBrowser = currentSplitViewTab?.linkedBrowser;

    if (!currentSplitViewBrowser) {
      return;
    }

    // set renderLayers to true & Set class to deck-selected
    currentSplitViewBrowser.renderLayer = true;
    currentSplitViewPanel?.classList.add("deck-selected");

    if (!currentSplitViewBrowser.docShellIsActive) {
      currentSplitViewBrowser.docShellIsActive = true;
    }

    function applySplitView() {
      currentSplitViewBrowser.renderLayers = true;
      currentSplitViewPanel?.classList.add("deck-selected");

      if (!window.browser.docShellIsActive) {
        window.browser.docShellIsActive = true;
      }
    }

    (function modifyDeckSelectedClass() {
      let tabs = window.gBrowser.tabs;
      for (const tab of tabs) {
        let panel = getLinkedPanel(tab.linkedPanel);
        if (tab.hasAttribute("splitView") || tab == window.gBrowser.selectedTab) {
          panel?.classList.add("deck-selected");
        } else {
          panel?.classList.remove("deck-selected");
        }
      }
    })();

    window.setTimeout(applySplitView, 1000);
  }
}