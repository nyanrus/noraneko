import * as fs from "node:fs/promises";
import { DOMParser } from "linkedom";

export async function injectXHTML() {
  const path_browserxhtml =
    "_dist/bin/browser/chrome/browser/content/browser/browser.xhtml";
  {
    const document = new DOMParser().parseFromString(
      (await fs.readFile(path_browserxhtml)).toString(),
      "text/xml",
    );

    for (const elem of document.querySelectorAll("[data-geckomixin]")) {
      elem.remove();
    }

    const script = document.createElement("script");
    script.innerHTML = `Services.scriptloader.loadSubScript("chrome://noraneko/content/injectBrowser.inc.js", this);`;
    script.dataset.geckomixin = "";

    document.querySelector("head").appendChild(script);

    await fs.writeFile(path_browserxhtml, document.toString());
  }

  const path_preferencesxhtml =
    "_dist/bin/browser/chrome/browser/content/browser/preferences/preferences.xhtml";
  {
    const document = new DOMParser().parseFromString(
      (await fs.readFile(path_preferencesxhtml)).toString(),
      "text/xml",
    );

    for (const elem of document.querySelectorAll("[data-geckomixin]")) {
      elem.remove();
    }

    const script = document.createElement("script");
    script.innerHTML = `Services.scriptloader.loadSubScript("chrome://noraneko/content/injectPreferences.inc.js", this);`;
    script.dataset.geckomixin = "";

    document.querySelector("head").appendChild(script);

    await fs.writeFile(path_preferencesxhtml, document.toString());
  }

  const path_newtab =
    "_dist/bin/browser/chrome/browser/res/activity-stream/prerendered/activity-stream.html";
  {
    const document = new DOMParser().parseFromString(
      (await fs.readFile(path_newtab)).toString(),
      "text/html",
    );

    for (const elem of document.querySelectorAll("[data-geckomixin]")) {
      elem.remove();
    }

    const script = document.createElement("script", {});
    script.type = "module";
    script.src = "chrome://noraneko/content/injectNewtab.inc.js";
    script.dataset.geckomixin = "";

    document.querySelector("body").appendChild(script);

    await fs.writeFile(path_newtab, document.toString());
  }

  const path_newtab_noscript =
    "_dist/bin/browser/chrome/browser/res/activity-stream/prerendered/activity-stream-noscripts.html";
  {
    const document = new DOMParser().parseFromString(
      (await fs.readFile(path_newtab_noscript)).toString(),
      "text/html",
    );

    for (const elem of document.querySelectorAll("[data-geckomixin]")) {
      elem.remove();
    }

    const script = document.createElement("script", {});
    script.type = "module";
    script.src = "chrome://noraneko/content/newtab.js";
    script.setAttribute("async", "");
    script.dataset.geckomixin = "";

    document.querySelector("head").appendChild(script);

    await fs.writeFile(path_newtab_noscript, document.toString());
  }
}
