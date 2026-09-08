// SPDX-License-Identifier: MPL-2.0

// Authoring surface for an "actor": a small xpi whose page side is a
// JSWindowActor (the same shape as Firefox's own about:newtab add-on). Each
// actor lives in one file that exports three things by name:
//
//   export const meta    = { id, namespace, matches, ... };
//   export const parent  = defineParent({ method(...) { ... } });  // main process (JSWindowActorParent)
//   export const content = defineContent((parent, ctx) => { ... }); // page side (run by JSWindowActorChild)
//
// The page side is NOT a WebExtension content script: content scripts are not
// injected into about:* / chrome:* documents in stock Firefox (see README,
// "addon 式が駄目だった理由"). The child actor loads content.js into the page's
// process with `window` / `document` on the scope chain, so the hook is written
// the same way, but it runs with the child actor's privileges.
//
// Named exports (rather than one nested object) are deliberate: the build
// bundles `parent` and `content` into separate outputs, and named exports let
// the bundler tree-shake each side so the content bundle never drags in the
// parent's privileged code and vice versa.
//
// IMPORTANT: the module top level must be pure. Reference Firefox globals
// (Services, ChromeUtils, window, exportFunction, browser) only *inside* method
// or hook bodies — the build imports this file under Deno to read `meta`, and
// top-level use of those globals would throw there.

export interface ActorMeta {
  /** Extension id, e.g. "settings-bridge@noraneko.app". */
  id: string;
  /** Extension version. */
  version: string;
  /** Experiment-API namespace, e.g. "noraSettings". Also the message channel. */
  namespace: string;
  /** Match patterns for the pages the content hook runs in (JSWindowActor `matches`). */
  matches: string[];
  /**
   * When the content hook runs. Maps to a child actor event:
   * document_start → DOMDocElementInserted, document_end → DOMContentLoaded,
   * document_idle → load. Defaults to "document_end".
   */
  runAt?: "document_start" | "document_end" | "document_idle";
  /**
   * JSWindowActor name. Defaults to "Nora" + PascalCase(<dir>), e.g. NoraNewtab.
   * A drop with the same actor name replaces the built-in one (unregister → register).
   */
  actor?: string;
  /** Legacy JSActor (BrowserGlue) this one replaces; it is unregistered when this actor is registered. */
  replaces?: string;
}

type ParentMethods = Record<string, (...args: any[]) => unknown>;

export interface ContentCtx {
  /** True in dev builds (import.meta.env.MODE === "dev"). */
  dev: boolean;
  /** Expose functions on the page window (via exportFunction). */
  expose(funcs: Record<string, (...args: any[]) => unknown>): void;
}

/** Proxy to the parent methods; each call is forwarded to the main process. */
type ParentProxy<T extends ParentMethods> = {
  [K in keyof T]: (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>;
};

export type ContentHook<T extends ParentMethods = ParentMethods> = (
  parent: ParentProxy<T>,
  ctx: ContentCtx,
) => void;

// Identity helpers that pin types for authoring:
//
//   export const parent  = defineParent({ method(...) { ... } });
//   export const content = defineContent<typeof parent>((parent, ctx) => { ... });
//
// They are listed in the build's treeshake.manualPureFunctions, so an unused
// call (e.g. defineContent in the parent bundle) is dropped along with anything
// it references (birpc). Without that, the bundler would keep the call for its
// possible side effects and the unused side would not tree-shake.

/** Pins the parent-method types so the content hook's proxy is typed. */
export const defineParent = <T extends ParentMethods>(methods: T): T => methods;

/** Pins the content hook against the parent's method types. */
export const defineContent = <T extends ParentMethods>(
  hook: ContentHook<T>,
): ContentHook<T> => hook;
