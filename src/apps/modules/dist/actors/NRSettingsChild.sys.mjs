var c = Object.defineProperty;
var P = (s, t, e) => t in s ? c(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e;
var o = (s, t, e) => P(s, typeof t != "symbol" ? t + "" : t, e);
class d extends JSWindowActorChild {
  constructor() {
    super(...arguments);
    o(this, "resolvePrefSet", null);
    o(this, "resolvePrefGet", null);
  }
  actorCreated() {
    console.debug("NRSettingsChild created!");
    const e = this.contentWindow;
    e.location.port === "5183" && (console.debug("NRSettingsChild 5183!"), Cu.exportFunction(this.NRSPing.bind(this), e, {
      defineAs: "NRSPing"
    }));
  }
  NRSPing() {
    return !0;
  }
  NRSPrefSet(e, r) {
    const n = new Promise((i, l) => {
      this.resolvePrefSet = i;
    });
    this.sendAsyncMessage("Pref:Set", e), n.then((i) => r());
  }
  NRSPrefGet(e, r) {
    const n = new Promise((i, l) => {
      this.resolvePrefGet = i;
    });
    this.sendAsyncMessage("Pref:Get", e), n.then((i) => r(i));
  }
  async receiveMessage(e) {
    var r, n;
    switch (e.name) {
      case "Pref:Set": {
        (r = this.resolvePrefSet) == null || r.call(this), this.resolvePrefSet = null;
        break;
      }
      case "Pref:Get": {
        (n = this.resolvePrefGet) == null || n.call(this, e.data), this.resolvePrefGet = null;
        break;
      }
    }
  }
}
export {
  d as NRSettingsChild
};
