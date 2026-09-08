// SPDX-License-Identifier: MPL-2.0
/**
 * Drops: コード一つで機能(webext-actor の xpi)が降ってくる。
 *
 * Git が使えない人にも試してもらえるように、機能の束を dl.f3liz.casa/drop/<code>/ に置き、
 * about:nora:settings でコードを入れると AddonManager が profile に install する。
 * profile の add-on は built-in より優先されるので、同じ id の built-in を上書きする。
 * 戻すときは uninstall するだけで built-in に戻る。再起動は要らない。
 *
 * 署名: noraneko の build は MOZ_REQUIRE_SIGNING=false なので無署名の xpi が入り、
 * experiment_apis も使える(extensions.experiments.enabled)。manifest.json の sha256 で中身を守る。
 *
 * 作る側: tools/scripts/build-drop.ts(actor を xpi にして manifest.json を書く)。
 */

const DROP_BASE = "https://dl.f3liz.casa/drop";
const PREF_INSTALLED = "noraneko.drops.installed"; // JSON: { [code]: { ids: string[], version, at } }
const ENV_CODE = "NORANEKO_DROP_CODE"; // 起動時にこの env があれば入れる(dev/試験用)

const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs",
);

export interface DropEntry {
  id: string;
  name: string;
  version: string;
  file: string;
  sha256: string;
  size: number;
}
export interface DropManifest {
  code: string;
  note?: string;
  built_at?: string;
  entries: DropEntry[];
}
export interface InstalledDrop {
  ids: string[];
  version: string;
  at: number;
  note?: string;
}

function readInstalled(): Record<string, InstalledDrop> {
  try {
    return JSON.parse(Services.prefs.getStringPref(PREF_INSTALLED, "{}"));
  } catch {
    return {};
  }
}
function writeInstalled(v: Record<string, InstalledDrop>): void {
  Services.prefs.setStringPref(PREF_INSTALLED, JSON.stringify(v));
}

export function isValidCode(code: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(code);
}

export async function fetchDropManifest(code: string): Promise<DropManifest> {
  if (!isValidCode(code)) throw new Error(`bad code: ${code}`);
  const resp = await fetch(`${DROP_BASE}/${code}/manifest.json`, {
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`no drop for "${code}" (${resp.status})`);
  const m = (await resp.json()) as DropManifest;
  if (!Array.isArray(m.entries) || m.entries.length === 0) {
    throw new Error(`drop "${code}" has no entries`);
  }
  return m;
}

/** コードの束を全部 install する。返り値は入った id。 */
export async function installDrop(code: string): Promise<string[]> {
  const m = await fetchDropManifest(code);
  const ids: string[] = [];
  for (const e of m.entries) {
    const url = `${DROP_BASE}/${code}/${e.file}`;
    const install = await AddonManager.getInstallForURL(url, {
      hash: `sha256:${e.sha256}`,
      telemetryInfo: { source: "noraneko-drop", method: "code" },
    });
    install.addListener({
      onDownloadFailed: (i: any) =>
        console.error(`[noraneko-drops] download failed: ${url} error=${i.error} state=${i.state}`),
      onInstallFailed: (i: any) =>
        console.error(`[noraneko-drops] install failed: ${e.id} error=${i.error} state=${i.state}`),
    });
    await install.install();
    ids.push(e.id);
    console.log(`[noraneko-drops] installed ${e.id} ${e.version} from ${code}`);
  }
  const all = readInstalled();
  all[code] = {
    ids,
    version: m.entries.map((e) => e.version).join(","),
    at: Date.now(),
    note: m.note,
  };
  writeInstalled(all);
  return ids;
}

/** コードの束を外す(built-in に戻る)。 */
export async function removeDrop(code: string): Promise<void> {
  const all = readInstalled();
  const d = all[code];
  if (!d) return;
  for (const id of d.ids) {
    const addon = await AddonManager.getAddonByID(id);
    // profile に居るものだけ外す(built-in は uninstall できないし、する必要もない)
    if (addon && addon.scope === AddonManager.SCOPE_PROFILE) {
      await addon.uninstall();
      console.log(`[noraneko-drops] removed ${id} (${code})`);
    }
  }
  delete all[code];
  writeInstalled(all);
}

export function listDrops(): Record<string, InstalledDrop> {
  return readInstalled();
}

/** 起動時: NORANEKO_DROP_CODE があれば(まだなら)入れる。dev と試験のため。 */
export async function maybeInstallDropFromEnv(): Promise<void> {
  const code = Services.env.get(ENV_CODE);
  if (!code) return;
  if (readInstalled()[code]) return;
  try {
    await installDrop(code);
  } catch (e) {
    console.error(`[noraneko-drops] ${ENV_CODE}=${code} failed:`, e);
  }
}
