import {
  type Accessor,
  createEffect,
  createRoot,
  createSignal,
  type Setter,
} from "solid-js";
import { rpc } from "./client";
import {
  i32,
  u32,
  nsresult,
} from "../../../../../@types/gecko/lib.gecko.xpcom";

async function screenshot(): Promise<string> {
  const bmp =
    await (window.browsingContext as CanonicalBrowsingContext)!.currentWindowGlobal!.drawSnapshot(
      document!.body!.getBoundingClientRect(),
      window.devicePixelRatio,
      "rgb(255,255,255)",
      true,
    );
  const canvas = document!.createElement("canvas");
  // resize it to the size of our ImageBitmap
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  // get a bitmaprenderer context
  const ctx2 = canvas.getContext(
    "bitmaprenderer",
  )! as ImageBitmapRenderingContext;
  ctx2.transferFromImageBitmap(bmp);
  // get it back as a Blob
  const blob2 = ((await new Promise((resolve) =>
    canvas.toBlob(resolve),
  )) as Blob | null)!;
  //console.log(blob2); // Blob
  const reader = new FileReader();
  reader.readAsDataURL(blob2);
  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      //console.log(reader.result);
      resolve(reader.result);
    };
  });
}

export namespace TestUtils {
  let progressListener;
  export let aLoadEnd: Accessor<string>;
  let sLoadEnd: Setter<string>;
  export function init() {
    [aLoadEnd, sLoadEnd] = createSignal("");
    progressListener = new (class
      implements Pick<nsIWebProgressListener, "onProgressChange">
    {
      // async onStateChange(
      //   aWebProgress: nsIWebProgress,
      //   aRequest: nsIRequest,
      //   aStateFlags: u32,
      //   aStatus: nsresult,
      // ) {
      //   if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) {
      //     sLoadEnd(
      //       aWebProgress.browsingContext.window
      //         ? aWebProgress.browsingContext.window.location.href
      //         : "about:newtab",
      //     );
      //   }
      // }
      QueryInterface = ChromeUtils.generateQI(["nsIWebProgressListener"]);
    })();
    window.gBrowser.addProgressListener(progressListener);
  }
}

const testMap = new Map<string, () => Promise<void>>();

if (!window.floorp) {
  window.floorp = {};
}
window.floorp.testMap = testMap;

export default async function init() {
  TestUtils.init();
}

testMap.set("screenshot:about__newtab", async () => {
  //https://searchfox.org/mozilla-central/rev/03258de701dbcde998cfb07f75dce2b7d8fdbe20/browser/components/sessionstore/content/aboutSessionRestore.js#201
  window.gBrowser.loadURI(Services.io.newURI("about:newtab"), {
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
  });
  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      createEffect(() => {
        if (TestUtils.aLoadEnd() === "about:newtab") {
          dispose();
          resolve();
        }
      });
    });
  });

  rpc.saveImage("about__newtab", await screenshot());
});
