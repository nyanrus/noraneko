/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSX } from "solid-js";

export function TabbarStyleModifyCSSElement(props: { style: string }): JSX.Element {
    return (
        <link id="floorp-tabbar-modify-css" rel="stylesheet" href={`chrome://noraneko${props.style}.css`} />
    );
}
