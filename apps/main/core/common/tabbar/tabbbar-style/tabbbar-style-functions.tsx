/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { checkPaddingEnabled } from "./titilebar-padding";
import { config } from "../../designs/configs";
import { TabbarStyleModifyCSSElement } from "./tabbar-style-element";
import { insert } from "@nora/solid-xul";

class gTabbarStyleFunctionsClass {
    private static instance: gTabbarStyleFunctionsClass;
    public static getInstance() {
        if (!gTabbarStyleFunctionsClass.instance) {
            gTabbarStyleFunctionsClass.instance = new gTabbarStyleFunctionsClass();
        }
        return gTabbarStyleFunctionsClass.instance;
    }

    private get PanelUIMenuButton(): XULElement | null {
        return document.querySelector("#PanelUI-menu-button");
    }
    private get tabbarElement(): XULElement | null {
        return document.querySelector("#TabsToolbar");
    }
    private get titleBarElement(): XULElement | null {
        return document.querySelector("#titlebar");
    }
    private get navbarElement(): XULElement | null {
        return document.querySelector("#nav-bar");
    }
    private get navigatorToolboxtabbarElement(): XULElement | null {
        return document.querySelector("#navigator-toolbox");
    }
    private get browserElement(): XULElement | null {
        return document.querySelector("#browser");
    }
    private get urlbarContainer(): XULElement | null {
        return document.querySelector(".urlbar-container");
    }
    private isVerticalTabbar() {
        return config().tabbar.tabbarStyle === "vertical";
    }

    public revertToDefaultStyle() {
        this.tabbarElement?.removeAttribute(
            "floorp-tabbar-display-style"
        );
        this.tabbarElement?.removeAttribute("hidden");
        this.tabbarElement?.appendChild(
            document.querySelector("#floorp-tabbar-window-manage-container") as Node
        );
        this.titleBarElement?.appendChild(
            this.tabbarElement as Node
        );
        this.navigatorToolboxtabbarElement?.prepend(
            this.titleBarElement as Node
        );
        document.querySelector("#floorp-tabbar-modify-css")?.remove();
        this.tabbarElement?.removeAttribute(
            "floorp-tabbar-display-style"
        );
        this.urlbarContainer?.style.removeProperty("margin-top");
    }

    public defaultTabbarStyle() {
        if (this.isVerticalTabbar()) {
            return;
        }

        this.navigatorToolboxtabbarElement?.setAttribute(
            "floorp-tabbar-display-style",
            "0"
        );
    }

    public hideHorizontalTabbar() {
        this.tabbarElement?.setAttribute(
            "floorp-tabbar-display-style",
            "1"
        );
    }

    public optimiseToVerticalTabbar() {
        //optimize vertical tabbar
        this.tabbarElement?.setAttribute("hidden", "true");
        this.navbarElement?.appendChild(
            document.querySelector("#floorp-tabbar-window-manage-container") as Node
        );
        checkPaddingEnabled();
    }

    public bottomOfNavigationToolbar() {
        if (this.isVerticalTabbar()) {
            return;
        }
        this.navigatorToolboxtabbarElement?.appendChild(
            this.tabbarElement as Node
        );
        this.PanelUIMenuButton?.after(
            document.querySelector("#floorp-tabbar-window-manage-container") as Node
        );
        this.tabbarElement?.setAttribute(
            "floorp-tabbar-display-style",
            "2"
        );
    }

    public bottomOfWindow() {
        if (this.isVerticalTabbar()) {
            return;
        }

        this.browserElement?.after(
            this.titleBarElement as Node
        );
        this.PanelUIMenuButton?.after(
            document.querySelector("#floorp-tabbar-window-manage-container") as Node
        );
        this.tabbarElement?.setAttribute(
            "floorp-tabbar-display-style",
            "3"
        );
        // set margin to the top of urlbar container & allow moving the window
        this.urlbarContainer?.style.setProperty("margin-top", "5px");
    }

    public applyTabbarStyle() {
        gTabbarStyleFunctions.revertToDefaultStyle();
        insert(document.head, <TabbarStyleModifyCSSElement style={config().tabbar.tabbarPosition} />, document.head?.lastChild);
        switch (config().tabbar.tabbarPosition) {
            case "hide-horizontal-tabbar":
                gTabbarStyleFunctions.hideHorizontalTabbar();
                break;
            case "optimise-to-vertical-tabbar":
                gTabbarStyleFunctions.optimiseToVerticalTabbar();
                break;
            case "bottom-of-navigation-toolbar":
                gTabbarStyleFunctions.bottomOfNavigationToolbar();
                break;
            case "bottom-of-window":
                gTabbarStyleFunctions.bottomOfWindow();
                break;
            default:
                gTabbarStyleFunctions.defaultTabbarStyle();
                break;
        }
    }
}

export const gTabbarStyleFunctions = gTabbarStyleFunctionsClass.getInstance();
