//TODO: make reject when the prefName is invalid
export class NRSettingsParent extends JSWindowActorParent {
  constructor() {
    super();
  }
  receiveMessage(message) {
    switch (message.name) {
      case "getBoolPref": {
        if (
          Services.prefs.getPrefType(message.data.prefName) !=
            Services.prefs.PREF_BOOL
        ) {
          return null;
        }
        return Services.prefs.getBoolPref(message.data.prefName);
      }
      case "getIntPref": {
        if (
          Services.prefs.getPrefType(message.data.prefName) !=
            Services.prefs.PREF_INT
        ) {
          return null;
        }
        return Services.prefs.getIntPref(message.data.prefName);
      }
      case "getStringPref": {
        if (
          Services.prefs.getPrefType(message.data.prefName) !=
            Services.prefs.PREF_STRING
        ) {
          return null;
        }
        return Services.prefs.getStringPref(message.data.prefName);
      }
      case "setBoolPref": {
        Services.prefs.setBoolPref(
          message.data.prefName,
          message.data.prefValue,
        );
        break;
      }
      case "setIntPref": {
        Services.prefs.setIntPref(
          message.data.prefName,
          message.data.prefValue,
        );
        break;
      }
      case "setStringPref": {
        Services.prefs.setStringPref(
          message.data.prefName,
          message.data.prefValue,
        );
        break;
      }
    }
  }
}
