import type { nsIID, nsQIResult } from "../../@types/gecko/lib.gecko.xpcom";

type TQueryInterface = <T extends nsIID>(aIID: T) => nsQIResult<T>;

class CSSB implements nsIFactory, nsICommandLineHandler {
  classDescription: "Floorp SSB Implementation";
  contractID = "@floorp-app/site-specific-browser;1";
  //@ts-expect-error
  classID = Components.ID("{2bab4429-4cc6-494c-9ee7-02bd389d945c}");
  QueryInterface = ChromeUtils.generateQI([
    "nsICommandLineHandler",
  ]) as TQueryInterface;
  createInstance<T extends nsIID>(iid: T) {
    return this.QueryInterface<T>(iid);
  }

  handle(aCommandLine: nsICommandLine): void {
    const id = aCommandLine.handleFlagWithParam("start-ssb", false);
    if (id) {
      if (aCommandLine.state === Ci.nsICommandLine.STATE_INITIAL_LAUNCH) {
        Services.prefs.setCharPref("floorp.ssb.startup", id);
      } else {
        aCommandLine.preventDefault = true;
      }
    }
  }
  helpInfo = "  --start-ssb <id>  Start the SSB with the given id.\n";
}

const SSB = new CSSB();

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const registrar = Components.manager.QueryInterface!(Ci.nsIComponentRegistrar);
registrar.registerFactory(
  SSB.classID,
  SSB.classDescription,
  SSB.contractID,
  SSB,
);

Services.catMan.addCategoryEntry(
  "command-line-handler",
  "e-ssb",
  SSB.contractID,
  false,
  true,
);

console.log("e-ssb register");
