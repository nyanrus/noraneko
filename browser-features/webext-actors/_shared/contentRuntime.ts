// SPDX-License-Identifier: MPL-2.0

// Shared page-side runtime. Bundled into every actor's content.js.
//
// content.js is loaded by the generated child.sys.mjs (a JSWindowActorChild) with
// Services.scriptloader.loadSubScript(url, scope). `scope` puts `window`,
// `document`, `exportFunction` and `__nora` on the scope chain, so the actor's
// content hook can use `window` / `document` as free variables just like a
// content script would, while actually running with the child actor's
// privileges in the page's process. `__nora` is the bridge to the parent
// (sendQuery) and to the page (exportFunction).

import type { ActorMeta, ContentCtx, ContentHook } from "./defineActor.ts";
import { makeIo } from "./io.ts";

// Provided on the scope chain by child.sys.mjs.
declare const __nora: {
  call(method: string, args: unknown[]): Promise<unknown>;
  expose(funcs: Record<string, (...args: any[]) => unknown>): void;
  onDestroy(fn: () => void): void;
};

export function runContent(_meta: ActorMeta, hook: ContentHook): void {
  const parent = new Proxy(
    {},
    {
      get(_target, method: string) {
        return (...args: unknown[]) => __nora.call(method, args);
      },
    },
  ) as any;

  const ctx: ContentCtx = {
    dev: import.meta.env.MODE === "dev",
    expose(funcs) {
      __nora.expose(funcs);
    },
    onDestroy(fn) {
      __nora.onDestroy(fn);
    },
    io: makeIo((fn) => __nora.onDestroy(fn)),
  };

  hook(parent, ctx);
}
