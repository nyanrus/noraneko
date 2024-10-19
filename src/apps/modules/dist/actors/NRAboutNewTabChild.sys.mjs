class o extends JSWindowActorChild {
  handleEvent(t) {
    t.type === "DOMContentLoaded" && Services.scriptloader.loadSubScript(
      "chrome://noraneko-startup/content/about-newtab.js",
      this.contentWindow
    );
  }
}
export {
  o as NRAboutNewTabChild
};
