/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const STATIC_PANEL_DATA = {
  "floorp//bmt": {
    url: "chrome://browser/content/places/places.xhtml",
    l10n: "browser-manager-sidebar",
    defaultWidth: 600,
  },

  "floorp//bookmarks": {
    url: "chrome://browser/content/places/bookmarksSidebar.xhtml",
    l10n: "bookmark-sidebar",
    defaultWidth: 415,
  },

  "floorp//history": {
    url: "chrome://browser/content/places/historySidebar.xhtml",
    l10n: "history-sidebar",
    defaultWidth: 415,
  },

  "floorp//downloads": {
    url: "about:downloads",
    l10n: "download-sidebar",
    defaultWidth: 415,
  },

  "floorp//notes": {
    url: "chrome://floorp/content/notes/notes-bms.html",
    l10n: "notes-sidebar",
    defaultWidth: 550,
  },
};


export class StaticPanel {
  private id: string;

  constructor(id: string) {
    this.id = id;
  }

  render() {
    return (
      <xul:vbox id={this.id}>
      </xul:vbox>
    );
  }
}
