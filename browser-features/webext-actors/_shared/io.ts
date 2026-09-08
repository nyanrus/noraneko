// SPDX-License-Identifier: MPL-2.0

// The io layer of a content hook: every verb here *places* something in the
// window and, in the same breath, puts the way back on the ledger
// (ctx.onDestroy). When the drop is removed or replaced, the ledger is run in
// reverse and the window is as it was. A hook that only ever places through
// these verbs has no cleanup to write.

export interface Io {
  /** Insert a node and remember to remove it. */
  place(node: Node, at: { parent: Node } | { before: Node } | { after: Node }): void;
  /** Add a <style> to the document head and remember to remove it. */
  style(doc: Document, css: string): HTMLStyleElement;
  /** addEventListener, and remember the matching removeEventListener. */
  listen<K extends string>(
    target: EventTarget,
    type: K,
    fn: (ev: any) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /** Watch a pref and remember to stop watching. */
  pref(name: string, fn: () => void): void;
  /** Anything else that has to be put back: hand the way back to the ledger. */
  defer(fn: () => void): void;
}

export function makeIo(onDestroy: (fn: () => void) => void): Io {
  return {
    place(node, at) {
      if ("parent" in at) at.parent.appendChild(node);
      else if ("before" in at) (at.before as ChildNode).before(node);
      else (at.after as ChildNode).after(node);
      onDestroy(() => (node as ChildNode).remove());
    },
    style(doc, css) {
      const el = doc.createElementNS("http://www.w3.org/1999/xhtml", "style") as HTMLStyleElement;
      el.textContent = css;
      this.place(el, { parent: doc.head ?? doc.documentElement });
      return el;
    },
    listen(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      onDestroy(() => target.removeEventListener(type, fn, options));
    },
    pref(name, fn) {
      const observer = () => fn();
      Services.prefs.addObserver(name, observer);
      onDestroy(() => Services.prefs.removeObserver(name, observer));
    },
    defer: onDestroy,
  };
}
