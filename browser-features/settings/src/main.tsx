// SPDX-License-Identifier: MPL-2.0
import { render } from "preact";
import { Settings } from "./Settings.tsx";
import { mountStyles } from "./styles.ts";

const root = document.getElementById("app");
if (root) {
  mountStyles();
  render(<Settings />, root);
}
