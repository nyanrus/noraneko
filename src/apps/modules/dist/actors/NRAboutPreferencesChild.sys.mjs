class n extends JSWindowActorChild {
  handleEvent(e) {
    e.type === "DOMContentLoaded" && Services.scriptloader.loadSubScript(
      "chrome://noraneko-startup/content/about-preferences.js",
      this.contentWindow
    );
  }
}
export {
  n as NRAboutPreferencesChild
};
