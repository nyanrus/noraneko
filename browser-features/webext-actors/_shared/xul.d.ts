// SPDX-License-Identifier: MPL-2.0
// XUL タグの JSX の型。noraneko の libs/preact-xul/jsx-runtime.d.ts から(裸の名前も同じ型で)。
import { JSX } from "preact";

declare module "preact" {
  namespace JSX {
    type XULElementBase = JSX.HTMLAttributes<HTMLElement> & {
      // XUL events, lower-case so preact listens for the same name either way
      oncommand?: string | ((e: Event) => void);
      oncontextmenu?: (e: MouseEvent) => void;
      onpagetitlechanged?: (e: Event) => void;
      image?: string;
      tooltiptext?: string;
      label?: string;
      positionend?: string | boolean;
      // layout
      flex?: `${number}`;
      pack?: string;
      orient?: "horizontal" | "vertical";
      align?: string; // e.g. "center", "baseline", etc.

      // localization
      "data-l10n-id"?: string;
      "data-l10n-name"?: string;
      "data-l10n-args"?: string;

      // common XUL attributes
      href?: string;
      is?: string;
      useoriginprincipal?: string | boolean;
      windowtype?: string;
      hidden?: boolean | string;
      selected?: string | boolean;
      pinned?: string | boolean;
      busy?: string | boolean;
      fadein?: string | boolean;
      value?: string;
      crop?: string;
      src?: string;
      role?: string;
      accesskey?: string;
      tooltip?: string;

      // ui/css helpers
      class?: string;

      // allow additional XUL-specific attributes without explicit typing
      [key: string]: any;
    };
    interface XULBrowserElement extends XULElementBase {
      contextmenu?: string;
      message?: string;
      messagemanagergroup?: string;
      type?: "content";
      remote?: `${boolean}`;
      maychangeremoteness?: `${boolean}`;
      initiallyactive?: string;

      autocompletepopup?: string;
      src?: string;
      disablefullscreen?: `${boolean}`;
      disablehistory?: `${boolean}`;
      nodefaultsrc?: string;
      tooltip?: string;
      xmlns?: string;
      autoscroll?: `${boolean}`;
      disableglobalhistory?: `${boolean}`;
      initialBrowsingContextGroupId?: `${number}`;
      usercontextid?: `${number}`;
      changeuseragent?: `${boolean}`;
      context?: string;
    }

    interface XULMenuListElement extends XULElementBase {
      label?: string;
      accesskey?: string;
      onCommand?: () => void;
      value?: string;
    }

    interface XULMenuitemElement extends XULElementBase {
      label?: string;
      accesskey?: string;
      type?: "checkbox";
      checked?: boolean;
      disabled?: boolean;
      onCommand?: () => void;
      value?: string;
    }

    interface XULRichListItem extends XULElementBase {
      value?: string;
      helpTopic?: string;
    }

    interface XULPopupSetElement extends XULElementBase {
      onpopupshowing?: string | (() => void);
    }

    interface XULMenuPopupElement extends XULElementBase {
      position?:
        | "after_start"
        | "bottomright topright"
        | "end_before"
        | "bottomleft topleft"
        | "overlap";
      onpopupshowing?: string;
      onpopuphiding?: string;
      onPopupShowing?: (e: Event) => void;
      onPopupHiding?: (e: Event) => void;
    }

    interface XULPanelElement extends XULElementBase {
      type?: "arrow";
      position?:
        | "after_start"
        | "end_before"
        | "bottomleft topleft"
        | "bottomright topright"
        | "overlap";
      onPopupShowing?: () => void;
      onPopupHiding?: () => void;
      onpopupshowing?: string;
    }

    interface XULMenuElement extends XULElementBase {
      label?: string;
      accesskey?: string;
      onpopupshowing?: string | ((event: Event) => void);
    }

    interface XULBoxElement extends XULElementBase {
      pack?: string;
      orient?: "horizontal" | "vertical";
      popup?: string;
      clicktoscroll?: boolean;
    }

    interface XULToolbarButtonElement extends XULElementBase {
      label?: string;
      accesskey?: string;
      onCommand?: () => void;
      context?: string;
      image?: string;
      hidden?: boolean;
      closemenu?: "none" | "all" | "current" | "parent";
    }

    interface XULButtonElement extends XULElementBase {
      label?: string;
      accesskey?: string;
      onCommand?: () => void;
      context?: string;
      image?: string;
    }

    interface XULImageElement extends XULElementBase {
      src?: string;
      width?: string;
      height?: string;
    }

    interface XULTabElement extends XULElementBase {
      onwheel?: (e: WheelEvent) => void;
    }

    interface IntrinsicElements {
      "xul:arrowscrollbox": XULElementBase;
      arrowscrollbox: XULElementBase;
      "xul:browser": XULBrowserElement;
      browser: XULBrowserElement;
      "xul:button": XULButtonElement;
      button: XULButtonElement;
      "xul:menuitem": XULMenuitemElement;
      menuitem: XULMenuitemElement;
      "xul:window": XULElementBase;
      window: XULElementBase;
      "xul:div": XULElementBase;
      div: XULElementBase;
      "xul:stack": XULElementBase;
      stack: XULElementBase;
      "xul:tabs": XULElementBase;
      tabs: XULElementBase;
      "xul:tab": XULElementBase;
      tab: XULElementBase;
      "xul:stack": XULElementBase;
      stack: XULElementBase;
      "xul:richlistbox": XULElementBase;
      richlistbox: XULElementBase;
      "xul:richlistitem": XULElementBase;
      richlistitem: XULElementBase;
      "xul:menubar": XULElementBase;
      menubar: XULElementBase;
      "xul:menupopup": XULMenuPopupElement;
      menupopup: XULMenuPopupElement;
      "xul:menuseparator": XULElementBase;
      menuseparator: XULElementBase;
      "xul:menulist": XULMenuListElement;
      menulist: XULMenuListElement;
      "xul:menu": XULMenuElement;
      menu: XULMenuElement;
      "xul:linkset": XULElementBase;
      linkset: XULElementBase;
      "xul:popupset": XULPopupSetElement;
      popupset: XULPopupSetElement;
      "xul:tooltip": XULElementBase;
      tooltip: XULElementBase;
      "xul:toolbaritem": XULElementBase & {
        role?: string;
        ariaLabel?: string;
        ariaLevel?: number;
        orient?: "vertical" | "horizontal";
        smoothscroll?: boolean;
        flatList?: boolean;
        tooltip?: string;
        context?: string;
      };
      "xul:tab": XULTabElement;
      tab: XULTabElement;
      "xul:panel": XULPanelElement;
      panel: XULPanelElement;
      "xul:panelview": XULPanelElement;
      panelview: XULPanelElement;
      "xul:menupopup": XULMenuPopupElement;
      menupopup: XULMenuPopupElement;
      "xul:menulist": XULMenuListElement;
      menulist: XULMenuListElement;
      "xul:vbox": XULBoxElement;
      vbox: XULBoxElement;
      "xul:hbox": XULBoxElement;
      hbox: XULBoxElement;
      "xul:box": XULElementBase;
      box: XULElementBase;
      "xul:toolbar": {
        id?: string;
        toolbarname?: string;
        customizable?: string;
        mode?: string;
        context?: string;
        accesskey?: string;
        style?: string;
        class?: string;
        children?: preact.ComponentChildren;
      };
      "xul:toolbarbutton": XULToolbarButtonElement;
      toolbarbutton: XULToolbarButtonElement;
      "xul:toolbarseparator": XULElementBase;
      toolbarseparator: XULElementBase;
      "xul:spacer": XULElementBase;
      spacer: XULElementBase;
      "xul:splitter": XULElementBase;
      splitter: XULElementBase;
      "xul:menuseparator": XULElementBase;
      menuseparator: XULElementBase;
      "xul:menu": XULMenuElement;
      menu: XULMenuElement;
      "xul:keyset": {
        id?: string;
        children?: preact.ComponentChildren;
      };
      "xul:key": {
        id?: string;
        "data-l10n-id"?: string;
        "data-l10n-attrs"?: string;
        modifiers?: string;
        keycode?: string;
        key?: string;
        command?: string;
      };
      "xul:commandset": {
        id?: string;
        children?: preact.ComponentChildren;
      };
      "xul:command": {
        id: string;
        oncommand: string | (() => void);
      };
      "xul:description": XULElementBase;
      description: XULElementBase;
      "xul:checkbox": XULElementBase;
      checkbox: XULElementBase;
      "xul:richlistitem": XULRichListItem;
      richlistitem: XULRichListItem;
      "xul:image": XULImageElement;
      image: XULImageElement;
      "xul:label": XULElementBase;
      label: XULElementBase;
    }
  }
}
