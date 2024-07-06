export class gFloorpOnLocationChange {
  private static instance: gFloorpOnLocationChange;
  private initialized = false;

  webProgress: nsIWebProgress;
  request: nsIRequest;
  locationURI: nsIURI;
  flags: number;
  isSimulated: boolean;

  public static getInstance() {
    if(!gFloorpOnLocationChange.instance) {
      gFloorpOnLocationChange.instance = new gFloorpOnLocationChange();
    }
    return gFloorpOnLocationChange.instance;
  }

  constructor() {
    if(this.initialized) {
      console.log("returning");
      return;
    }

    console.log("registering custom event");
    window.floorpOnLocationChangeEvent = new CustomEvent(
      "floorpOnLocationChangeEvent",
      {
        bubbles: true,
        cancelable: true,
      }
    );
  };

  // This is called when the location of the browser changes from Firefox's browser.js
  onLocationChange(aWebProgress: nsIWebProgress, aRequest: nsIRequest, aLocationURI: nsIURI, aFlags: number, aIsSimulated: boolean) {
    this.webProgress = aWebProgress;
    this.request = aRequest;
    this.locationURI = aLocationURI;
    this.flags = aFlags;
    this.isSimulated = aIsSimulated;

    // Dispatch the event
    document.dispatchEvent(window.floorpOnLocationChangeEvent);
  };
};
