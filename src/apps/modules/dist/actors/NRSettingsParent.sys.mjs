class f extends JSWindowActorParent {
  async receiveMessage(s) {
    switch (console.log(s), s.name) {
      case "Pref:Set": {
        const e = s.data;
        switch (e.prefType) {
          case "boolean": {
            Services.prefs.setBoolPref(e.prefName, e.prefValue), this.sendAsyncMessage("Pref:Set");
            break;
          }
          case "integer": {
            Services.prefs.setIntPref(e.prefName, e.prefValue), this.sendAsyncMessage("Pref:Set");
            break;
          }
          case "string": {
            Services.prefs.setStringPref(e.prefName, e.prefValue), this.sendAsyncMessage("Pref:Set");
            break;
          }
        }
        break;
      }
      case "Pref:Get": {
        const e = s.data;
        switch (e.prefType) {
          case "boolean": {
            const r = Services.prefs.getBoolPref(e.prefName);
            this.sendAsyncMessage("Pref:Get", {
              prefName: e.prefName,
              prefType: e.prefType,
              prefValue: r
            });
            break;
          }
          case "integer": {
            const r = Services.prefs.getIntPref(e.prefName);
            this.sendAsyncMessage("Pref:Get", {
              prefName: e.prefName,
              prefType: e.prefType,
              prefValue: r
            });
            break;
          }
          case "string": {
            const r = Services.prefs.getStringPref(e.prefName);
            this.sendAsyncMessage("Pref:Get", {
              prefName: e.prefName,
              prefType: e.prefType,
              prefValue: r
            });
            break;
          }
        }
        break;
      }
    }
  }
}
export {
  f as NRSettingsParent
};
