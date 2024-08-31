/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class Workspaces {
    private static instance: Workspaces;

    static getInstance() {
        if (!Workspaces.instance) {
            Workspaces.instance = new Workspaces();
        }
        return Workspaces.instance;
    }

    constructor() {
        console.log("Workspaces constructor");
    }
}