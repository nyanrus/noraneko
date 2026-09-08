// SPDX-License-Identifier: MPL-2.0

// The ui layer of a content hook: preact, and one verb, mount.
//
// mount() puts a host element where you say, renders the view into it, and
// puts both ways back on the ledger: when the drop goes, the view is unmounted
// (effects cleaned up, listeners gone) and then the host is taken out. A view
// never renders straight into a box that has other children — preact treats
// those as leftovers and removes them.
//
// preact creates children in the host's namespace (render() reads
// parentDom.namespaceURI), so under a XUL host `<vbox>` / `<toolbarbutton>`
// are real XUL elements and under an HTML host `<div>` is HTML. Pick the host
// tag for the tree you want; there is no `xul:` prefix to remember.
//
// This preact is bundled from its source into each drop's content.js.

import { render, type ComponentChild } from "preact";
import { useEffect, useReducer } from "preact/hooks";
import type { ReadonlySignal } from "@preact/signals-core";
import type { Io } from "./io.ts";

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

export type MountAt = ({ parent: Node } | { before: Node } | { after: Node }) & {
  /** The host element: a XUL tag (default "vbox"), or "html:div" for an HTML host. */
  tag?: string;
  id?: string;
};

/** Put a host where `at` says, render `view` into it, and remember to take both out. */
export function mount(io: Io, view: ComponentChild, at: MountAt): Element {
  const anchor = ("parent" in at ? at.parent : "before" in at ? at.before : at.after) as Node;
  const doc = anchor.ownerDocument ?? (anchor as Document);
  const tag = at.tag ?? "vbox";
  const host = tag.startsWith("html:")
    ? doc.createElementNS(XHTML_NS, tag.slice(5))
    : (doc as any).createXULElement?.(tag) ?? doc.createElementNS(XUL_NS, tag);
  if (at.id) host.id = at.id;
  io.place(host, at);
  render(view, host);
  io.defer(() => render(null, host));
  return host;
}

/**
 * Read a signal in a view and redraw when it changes. (The @preact/signals
 * package would do this by itself, but it hooks preact by its minified internal
 * names and this preact is bundled from source; signals-core plus this hook is
 * the honest version.)
 */
export function useSignalValue<T>(s: ReadonlySignal<T>): T {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    let first = true;
    return s.subscribe(() => {
      if (first) first = false; // subscribe() calls once right away with the value we already have
      else redraw(0);
    });
  }, [s]);
  return s.value;
}

export * from "preact";
