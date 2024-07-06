import { gFloorpOnLocationChange } from "./browser-location-change";

export function initFloorpLocationChange() {
  window.gFloorpOnLocationChange = gFloorpOnLocationChange.getInstance();
}
