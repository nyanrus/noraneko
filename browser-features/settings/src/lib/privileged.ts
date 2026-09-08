// SPDX-License-Identifier: MPL-2.0
// about:nora:settings は system principal で開くので、Services と noraneko の module に直接触れる
// (about:config / about:preferences と同じ)。無い環境(vite で単体表示など)では null。

declare const Services: any;
declare const ChromeUtils: any;

export interface PrefsApi {
  getBoolPref(key: string, fallback?: boolean): boolean;
  setBoolPref(key: string, value: boolean): void;
}

export const prefsApi: PrefsApi | null =
  typeof Services !== "undefined" ? (Services?.prefs ?? null) : null;

export const readBool = (key: string): boolean => (prefsApi ? prefsApi.getBoolPref(key, false) : false);

// ---- modules/Drops.sys.mts の型(こちらで写しを持つ。向こうが正) ----
export interface Registry {
  name: string;
  base: string; // その registry の URL(裏は registry ごとの Worker と bucket。npm と jsr が別なのと同じ)
  identity: string;
  issuer: string;
}
export interface AttestationCheck {
  who: string;
  identity: string;
  issuer: string;
  ok: boolean;
  reason?: string;
  logIndex?: number;
  rekorUrl?: string;
}
export interface DropManifest {
  uuid: string;
  name: string; // 札
  note?: string;
  contact?: string | string[];
  source?: { repo?: string; commit?: string; commit_time?: string; path?: string };
}
export interface InspectedEntry {
  id: string;
  name: string;
  version: string;
  file: string;
  sha256: string;
  matches: string[];
  chrome: boolean;
  permissions: string[];
  functions: string[];
  sources: { path: string; text: string }[];
  files: { path: string; text: string }[];
}
export interface DropInspection {
  uuid: string;
  name: string; // 札
  registry: Registry;
  attestations: AttestationCheck[];
  manifest: DropManifest;
  entries: InspectedEntry[];
}
export interface InstalledDrop {
  name?: string;
  ids: string[];
  files: string[];
  versions: string[];
  note?: string;
  registry?: string;
}
export interface DropsApi {
  listRegistries(): Registry[];
  addRegistry(r: Registry): void;
  removeRegistry(name: string): void;
  inspectDrop(ref: string, registry?: string): Promise<DropInspection>; // ref = uuid
  parseUuid(ref: string): string;
  installDrop(inspected: DropInspection): Promise<string[]>;
  removeDrop(ref: string): Promise<void>;
  listDrops(): Record<string, InstalledDrop>;
}

export const dropsApi: DropsApi | null = (() => {
  try {
    return typeof ChromeUtils !== "undefined"
      ? (ChromeUtils.importESModule("resource://noraneko/modules/Drops.sys.mjs") as DropsApi)
      : null;
  } catch {
    return null;
  }
})();

/** 判が全部通っているか(無いときは「通っていない」扱い) */
export const allAttested = (d: DropInspection): boolean =>
  d.attestations.length > 0 && d.attestations.every((a) => a.ok);
