/**
 * * This script is hardly referenced by userChromeJS (https://github.com/xiaoxiaoflood/firefox-scripts).
 * * SOURCE LICENSE : MPL2.0
 * * Thank you for xiaoxiaoflood and the contributors for the awesome project!
 *
 * * For user of this script
 * * This reddit commend can be helpful to understand how userChromeJS works
 * * https://www.reddit.com/r/FirefoxCSS/comments/iboo0m/comment/g1ysjkl/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button
 *
 * * If you read this file with vscode, I recommend `aaron-bond.better-comments` extension for colored comments.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @param product type of service
 * @param projectRoot projectRoot
 * @returns Firefox folder that have firefox binary
 */
function getFirefoxPath(product: "puppeteer", projectRoot: string) {
  switch (product) {
    case "puppeteer": {
      //* Firefox binary are placed on `node_modules/puppeteer/.local-firefox`
      // https://github.com/puppeteer/puppeteer/issues/5743#issuecomment-621664876
      return path.resolve(projectRoot, "node_modules/puppeteer/.local-firefox");
    }
  }
}

async function placePrefScript(filepath: string, configScriptPath: string) {
  await writeFile(
    filepath,
    [
      //* it needs setting "general.config.obscure_value" to 0
      // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsReadConfig.cpp#191
      // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsReadConfig.cpp#302
      `pref("general.config.obscure_value", 0);`,
      //* setting path to load config.js
      `pref("general.config.filename", "${configScriptPath}");`,
      //* it needs to disable sandbox to access global vars in window esp. console, maybe ChromeUtils
      // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsReadConfig.cpp#148
      // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#101
      // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#105
      // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#69
      `pref("general.config.sandbox_enabled", false);`,
    ].join("\n"),
  );
}

async function placeConfigScript(filepath: string) {
  await writeFile(filepath, [
    //* We should skip 1st line in config.js
    // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/extensions/pref/autoconfig/src/nsJSConfigTriggers.cpp#114
    "// skip 1st line",
    //* `AChrom` is path to {binary root}/browser/chrome
    // https://searchfox.org/mozilla-central/rev/ea91f336d0004ca28c909da948cb363f3e560877/xpcom/io/nsAppDirectoryServiceDefs.h#65
    `try {
  Services.dirsvc.get("AChrom",Ci.nsIFile)
  cmanifest.append('noranekojs/chrome.manifest');
  Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(cmanifest);

  Services.scriptloader.loadSubScript('chrome://userchromejs/content/BootstrapLoader.js');
} catch(e) {console.error(e)}`,
  ]);
}

async function initFirefoxSupport(product: "puppeteer", projectRoot: string) {
  const firefoxRoot = getFirefoxPath(product, projectRoot);
  await mkdir(path.resolve(firefoxRoot, "defaults/pref"), { recursive: true });

  //* the firefox will load pref script in `$gre/defaults/pref`
  // https://searchfox.org/mozilla-central/rev/a85b25946f7f8eebf466bd7ad821b82b68a9231f/modules/libpref/Preferences.cpp#4899
  await placePrefScript(
    path.resolve(firefoxRoot, "defaults/pref/noranekojs-pref.js"),
    "noranekojs.js",
  );

  await placeConfigScript(path.resolve(firefoxRoot, "noranekojs.js"));

  await mkdir(path.resolve(firefoxRoot, "browser/chrome/noranekojs"), {
    recursive: true,
  });
  await writeFile(
    path.resolve(firefoxRoot, "browser/chrome/noranekojs", "chrome.manifest"),
    [
      "content noraneko content/",
      "content noraneko-startup startup/ contentaccessible=yes",
    ],
  );
}
