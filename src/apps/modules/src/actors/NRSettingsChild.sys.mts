import { createBirpc } from "birpc";
import {
  NRSettingsParentFunctions,
  PrefGetParams,
  PrefSetParams,
} from "../common/defines.js";

export class NRSettingsChild extends JSWindowActorChild {
  rpcCallback: Function | null = null;
  rpc;
  constructor() {
    super();
    this.rpc = createBirpc<NRSettingsParentFunctions, {}>(
      {},
      {
        post: (data) => this.sendAsyncMessage("birpc", data),
        on: (callback) => {
          this.rpcCallback = callback;
        },
        // these are required when using WebSocket
        serialize: (v) => JSON.stringify(v),
        deserialize: (v) => JSON.parse(v),
      },
    );
  }
  actorCreated() {
    console.debug("NRSettingsChild created!");
    const window = this.contentWindow;
    if (window?.location.port === "5183") {
      console.debug("NRSettingsChild 5183!");
      Cu.exportFunction(this.NRSPing.bind(this), window, {
        defineAs: "NRSPing",
      });
      Cu.exportFunction(this.NRS_getBoolPref.bind(this), window, {
        defineAs: "NRS_getBoolPref",
      });
      Cu.exportFunction(this.NRSPrefGet.bind(this), window, {
        defineAs: "NRSPrefGet",
      });
      Cu.exportFunction(this.NRSPrefSet.bind(this), window, {
        defineAs: "NRSPrefSet",
      });
    }
  }
  NRSPing() {
    return true;
  }
  /**
   * Wrap a promise so content can use Promise methods.
   */
  wrapPromise<T>(promise: Promise<T>) {
    return new (this.contentWindow!.Promise as PromiseConstructorLike)<T>((
      resolve,
      reject,
    ) => promise.then(resolve, reject));
  }
  NRS_getBoolPref(prefName: string): PromiseLike<boolean | null> {
    return this.wrapPromise(this.rpc.getBoolPref(prefName));
  }
  async NRSPrefGet(params: PrefGetParams, callback: Function) {
    try {
      let result;
      switch (params.prefType) {
        case "boolean":
          result = await this.rpc.getBoolPref(params.prefName);
          break;
        case "number":
          result = await this.rpc.getIntPref(params.prefName);
          break;
        case "string":
          result = await this.rpc.getStringPref(params.prefName);
          break;
        default:
          throw new Error("Invalid pref type");
      }
      callback({ prefValue: result });
    } catch (error) {
      console.error("Error in NRSPrefGet:", error);
      callback({ error: error.message });
    }
  }

  async NRSPrefSet(params: PrefSetParams, callback: Function) {
    try {
      switch (params.prefType) {
        case "boolean":
          await this.rpc.setBoolPref(
            params.prefName,
            params.prefValue as boolean,
          );
          break;
        case "number":
          await this.rpc.setIntPref(
            params.prefName,
            params.prefValue as number,
          );
          break;
        case "string":
          await this.rpc.setStringPref(
            params.prefName,
            params.prefValue as string,
          );
          break;
        default:
          throw new Error("Invalid pref type");
      }
      callback({ success: true });
    } catch (error) {
      console.error("Error in NRSPrefSet:", error);
      callback({ error: error.message });
    }
  }
  async receiveMessage(message: ReceiveMessageArgument) {
    switch (message.name) {
      case "birpc":
        this.rpcCallback?.(message.data);
    }
  }
}
