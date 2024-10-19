import { ActorManagerParent as r } from "resource://gre/modules/ActorManagerParent.sys.mjs";
function e(t, o = !0) {
  if (!t.startsWith("./"))
    throw Error("localpath should starts with `./`");
  const s = `resource://noraneko/${t.slice(2)}`;
  return o ? s.replace(/.mts$/, ".mjs") : s;
}
const a = {
  //https://searchfox.org/mozilla-central/rev/3a34b4616994bd8d2b6ede2644afa62eaec817d1/browser/components/BrowserGlue.sys.mjs#310
  NRAboutNewTab: {
    child: {
      esModuleURI: e(
        "./actors/NRAboutNewTabChild.sys.mts"
      ),
      events: {
        DOMContentLoaded: {}
      }
    },
    // The wildcard on about:newtab is for the # parameter
    // that is used for the newtab devtools. The wildcard for about:home
    // is similar, and also allows for falling back to loading the
    // about:home document dynamically if an attempt is made to load
    // about:home?jscache from the AboutHomeStartupCache as a top-level
    // load.
    matches: ["about:home*", "about:welcome", "about:newtab*"],
    remoteTypes: ["privilegedabout"]
  },
  NRAboutPreferences: {
    child: {
      esModuleURI: e(
        "./actors/NRAboutPreferencesChild.sys.mts"
      ),
      events: {
        DOMContentLoaded: {}
      }
    },
    matches: ["about:preferences*", "about:settings*"]
  },
  NRSettings: {
    parent: {
      esModuleURI: e("./actors/NRSettingsParent.sys.mts")
    },
    child: {
      esModuleURI: e("./actors/NRSettingsChild.sys.mts"),
      events: {
        /**
         * actorCreated seems to require any of events for init
         */
        DOMDocElementInserted: {}
      }
    },
    //* port seems to not be supported
    //https://searchfox.org/mozilla-central/rev/3966e5534ddf922b186af4777051d579fd052bad/dom/chrome-webidl/JSWindowActor.webidl#99
    //https://searchfox.org/mozilla-central/rev/3966e5534ddf922b186af4777051d579fd052bad/dom/chrome-webidl/MatchPattern.webidl#17
    matches: ["*://localhost/*"]
  }
};
r.addJSWindowActors(a);
