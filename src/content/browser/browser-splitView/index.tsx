import { insert } from "@solid-xul/solid-xul";
import { ContextMenu } from "./context-menu";

export function initSplitView() {
	insert(
		document.querySelector("#tabContextMenu"),
		() => <ContextMenu />,
    document.querySelector("#context_selectAllTabs")
	);
  Services.prefs.setBoolPref("floorp.browser.splitView.working", false);
}