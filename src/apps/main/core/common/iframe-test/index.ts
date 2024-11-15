import { render } from "@nora/solid-xul";
import { App } from "./portal";

export function init() {
  document?.addEventListener("DOMContentLoaded", () => {
    render(App, document?.getElementById("appcontent"));
  });
}
