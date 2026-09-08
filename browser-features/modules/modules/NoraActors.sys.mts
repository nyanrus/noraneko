// SPDX-License-Identifier: MPL-2.0
/**
 * actor(webext-actors の xpi)の JSWindowActor を登録する・外す。
 *
 * Firefox 自身の about:newtab(newtab@mozilla.org)と同じ形: xpi は入れ物で、ページに届く道は
 * JSWindowActor。親は resource://<root>/parent.sys.mjs、子は resource://<root>/child.sys.mjs で、
 * 子が content.js を loadSubScript でページの process に読み込む。
 * 登録の中身は xpi の actor.json(build.ts が書く)。
 *
 * 同じ名前(actor.json の name)が既に登録されていれば外してから登録するので、
 * drop は built-in を置き換えられる(本家の ExternalComponentsFeed と同じ unregister → register)。
 */

export interface ActorRegistration {
  name: string;
  id: string;
  version: string;
  matches: string[];
  event: string; // 子が content.js を動かす合図(DOMDocElementInserted / DOMContentLoaded / load)
  methods: string[];
  replaces?: string | null; // 置き換える古い JSActor(BrowserGlue の名前)
  includeParent?: boolean;
  safeForUntrustedWebProcess?: boolean;
}

const registered = new Map<string, string>(); // name → root(resource://…/)

export function isRegistered(name: string): boolean {
  return registered.has(name);
}

export function registeredRoot(name: string): string | undefined {
  return registered.get(name);
}

const { NetUtil } = ChromeUtils.importESModule("resource://gre/modules/NetUtil.sys.mjs");

/** actor.json を読む(resource://<root>/actor.json)。fetch は jar: 先の resource:// を NetworkError にするので NetUtil で */
export function readActorJson(root: string): Promise<ActorRegistration> {
  return new Promise((resolve, reject) => {
    NetUtil.asyncFetch(
      { uri: `${root}actor.json`, loadUsingSystemPrincipal: true },
      (stream: nsIInputStream, status: number) => {
        if (!Components.isSuccessCode(status)) {
          reject(new Error(`actor.json が読めない: ${root} (0x${status.toString(16)})`));
          return;
        }
        try {
          const text = NetUtil.readInputStreamToString(stream, stream.available(), { charset: "UTF-8" });
          resolve(JSON.parse(text) as ActorRegistration);
        } catch (e) {
          reject(e);
        } finally {
          stream.close();
        }
      },
    );
  });
}

export function unregister(name: string): void {
  try {
    ChromeUtils.unregisterWindowActor(name);
  } catch {
    // 登録されていなかった
  }
  registered.delete(name);
}

/** root = resource://noraneko-builtin/<dir>/ か resource://noraneko-drop-…/ */
export function register(root: string, a: ActorRegistration): void {
  unregister(a.name);
  if (a.replaces) {
    try {
      ChromeUtils.unregisterWindowActor(a.replaces);
      console.log(`[nora-actors] ${a.name}: replaced ${a.replaces}`);
    } catch {
      // 無ければ無いでいい
    }
  }
  ChromeUtils.registerWindowActor(a.name, {
    parent: { esModuleURI: `${root}parent.sys.mjs` },
    child: {
      esModuleURI: `${root}child.sys.mjs`,
      events: { [a.event]: {} },
    },
    matches: a.matches,
    allFrames: false,
    includeParent: a.includeParent ?? true,
    ...(a.safeForUntrustedWebProcess ? { safeForUntrustedWebProcess: true } : {}),
  } as WindowActorOptions);
  registered.set(a.name, root);
  console.log(`[nora-actors] ${a.name} ${a.version} ← ${root} (${a.matches.join(", ")}) on ${a.event}`);
}
