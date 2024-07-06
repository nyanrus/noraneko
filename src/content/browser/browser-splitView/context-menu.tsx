import { gSplitView } from "./browser-splitView"

export function ContextMenu() {
	return (
		<>
			<xul:menu
				id="context_splitView"
				data-l10n-id="floorp-split-view-menu"
				label="Open in split view"
				accesskey="D"
			>
				<xul:menupopup
					id="splitViewTabContextMenu"
				>
					<xul:menuitem
						id="splitViewTabContextMenuLeft"
						data-l10n-id="splitview-show-on-left"
						label="Show on left"
						onCommand= {() =>
							gSplitView.setSplitView(window.TabContextMenu.contextTab, 'left')
						}
					>
					</xul:menuitem>
					<xul:menuitem
						id="splitViewTabContextMenuRight"
						data-l10n-id="splitview-show-on-right"
						label="Show on right"
						onCommand={() =>
							gSplitView.setSplitView(window.TabContextMenu.contextTab, 'right')
						}
					>
					</xul:menuitem>
				</xul:menupopup>
			</xul:menu>
			<xul:menuitem
				id="splitViewTabContextMenuClose"
				data-l10n-id="splitview-close-split-tab"
				label="Close Split View"
				onCommand={() =>
					gSplitView.removeSplitView()
				}
			/>
		</>
	)
}
