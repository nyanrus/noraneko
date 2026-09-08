// SPDX-License-Identifier: MPL-2.0
/**
 * Drops: コード一つで機能(webext-actor の xpi)が降ってくる。
 *
 * Git が使えない人にも試してもらえるように、機能の束を dl.f3liz.casa/drop/<code>/ に置く。
 * about:nora:settings でコードを入れると、まず **見る**(inspectDrop: 落として sha256 を確かめ、
 * xpi の中の manifest / schema / source を zip として読む。JS は一切実行しない)、
 * それから本人が「入れる」を押して **入れる**(installDrop: ここで初めて temporary add-on として
 * install され、拡張の background と api.js が動き出す)。
 *
 * なぜ temporary か: profile に普通に install した無署名の拡張は特権が無く、
 * about:home などへの content script は注入されない(restrictSchemes)。
 * temporary install は extensions.experiments.enabled(noraneko の既定 true)のとき
 * privileged 扱いになり、built-in と同じ力を持つ。署名の要求も掛からない。
 * 代わりに再起動で消えるので、起動時(final-ui-startup)に手元の xpi から入れ直す(一度入れたものだけ)。
 * 同じ id の built-in より優先されるので置き換わり、戻せば built-in に戻る。
 *
 * 親プロセスのコード(actor.mjs)は、importESModule が jar:file: を信用しないので、
 * resource://noraneko-drop-<code>-<版>/ の別名を xpi の root に張ってから読む(api.js はその URL を持っている)。
 *
 * 作る側: tools/scripts/build-drop.rb(actor を xpi にして manifest.json を書く。source も同梱)。
 */

const DROP_BASE = "https://dl.f3liz.casa/drop";
const PREF_INSTALLED = "noraneko.drops.installed"; // JSON: { [code]: { ids, files, versions, at, note } }
const ENV_CODE = "NORANEKO_DROP_CODE"; // dev build だけ: 起動時にこの env があれば見ずに入れる(試験用)
const DIR_NAME = "noraneko-drops";
// tsdown の --env.MODE は import.meta.env.MODE の式をそのまま置き換えるので、cast や ?. を挟むと効かない
const IS_DEV = import.meta.env.MODE === "dev";

const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs",
);
const { FileUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/FileUtils.sys.mjs",
);
const { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs",
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
  source?: { repo?: string; commit?: string; path?: string };
  entries: DropEntry[];
}
export interface InstalledDrop {
  ids: string[];
  files: string[];
  versions: string[];
  at: number;
  note?: string;
}
/** 見るための情報。manifest / schema / source を読んだだけで、何も実行していない */
export interface DropInspection {
  code: string;
  manifest: DropManifest;
  entries: {
    id: string;
    name: string;
    version: string;
    file: string;
    sha256: string;
    matches: string[];
    permissions: string[];
    functions: string[]; // 親プロセスで呼べる関数(experiment API の schema から)
    sources: { path: string; text: string }[];
  }[];
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
function dropDir(code: string): string {
  return PathUtils.join(PathUtils.profileDir, DIR_NAME, code);
}
/** build-drop.rb と同じ規則 */
function resAlias(code: string, version: string): string {
  return `noraneko-drop-${code}-${version}`.replace(/[^a-z0-9]/gi, "-").toLowerCase();
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

/** xpi(zip)の中を文字列で読む。実行はしない */
function readZipEntries(path: string): Map<string, string> {
  const zr = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
  zr.open(new FileUtils.File(path));
  const out = new Map<string, string>();
  try {
    for (const name of zr.findEntries("*")) {
      if (name.endsWith("/")) continue;
      const stream = zr.getInputStream(name);
      const text = NetUtil.readInputStreamToString(stream, stream.available(), { charset: "UTF-8" });
      stream.close();
      out.set(name, text);
    }
  } finally {
    zr.close();
  }
  return out;
}

/** 1. 見る: 落として sha256 を確かめ、中身を読む。実行はしない。 */
export async function inspectDrop(code: string): Promise<DropInspection> {
  console.log(`[noraneko-drops] inspect ${code}: manifest`);
  const m = await fetchDropManifest(code);
  const dir = dropDir(code);
  await IOUtils.makeDirectory(dir, { createAncestors: true, ignoreExisting: true });
  const entries: DropInspection["entries"] = [];
  for (const e of m.entries) {
    if (!/^[A-Za-z0-9._-]+$/.test(e.file)) throw new Error(`bad file name: ${e.file}`);
    const url = `${DROP_BASE}/${code}/${e.file}`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`download failed: ${url} (${resp.status})`);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const path = PathUtils.join(dir, e.file);
    await IOUtils.write(path, bytes, { tmpPath: `${path}.tmp` });
    const digest = await IOUtils.computeHexDigest(path, "sha256");
    if (digest !== e.sha256) {
      await IOUtils.remove(path);
      throw new Error(`sha256 mismatch: ${e.file}`);
    }
    console.log(`[noraneko-drops] inspect ${code}: ${e.file} sha256 ok, reading zip`);
    const files = readZipEntries(path);
    console.log(`[noraneko-drops] inspect ${code}: ${e.file} ${files.size} entries`);
    const wm = JSON.parse(files.get("manifest.json") ?? "{}");
    let functions: string[] = [];
    try {
      const schema = JSON.parse(files.get("schema.json") ?? "[]");
      functions = (Array.isArray(schema) ? schema : [schema])
        .flatMap((ns: { functions?: { name: string }[] }) => ns.functions ?? [])
        .map((f: { name: string }) => f.name);
    } catch {
      // schema が無い・壊れているなら関数は空のまま(表示だけの話)
    }
    entries.push({
      id: wm.browser_specific_settings?.gecko?.id ?? e.id,
      name: e.name,
      version: wm.version ?? e.version,
      file: e.file,
      sha256: e.sha256,
      matches: (wm.content_scripts ?? []).flatMap((c: { matches?: string[] }) => c.matches ?? []),
      permissions: wm.permissions ?? [],
      functions,
      sources: [...files.entries()]
        .filter(([n]) => n.startsWith("source/"))
        .map(([n, text]) => ({ path: n.slice("source/".length), text })),
    });
  }
  return { code, manifest: m, entries };
}

async function installFile(code: string, version: string, path: string): Promise<string> {
  const file = new FileUtils.File(path);
  // 親プロセスのコード(actor.mjs)を読むための別名。api.js が resource://<alias>/actor.mjs を読む
  const res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  const alias = resAlias(code, version);
  if (!res.hasSubstitution(alias)) {
    res.setSubstitution(alias, Services.io.newURI(`jar:${Services.io.newFileURI(file).spec}!/`));
  }
  try {
    const addon = await AddonManager.installTemporaryAddon(file);
    const policy = (globalThis as { WebExtensionPolicy?: { getByID(id: string): { isPrivileged: boolean; extension?: { rootURI?: { spec: string } } } | null } }).WebExtensionPolicy?.getByID(addon.id);
    console.log(
      `[noraneko-drops] ${addon.id}: active=${addon.isActive} privileged=${policy?.isPrivileged} ` +
        `root=${policy?.extension?.rootURI?.spec ?? "?"} alias=resource://${alias}/`,
    );
    return addon.id;
  } catch (e) {
    // "Extension is invalid" は manifest の error を additionalErrors に持っている。見えないと直せない
    const err = e as { message?: string; additionalErrors?: string[] };
    const details = Array.isArray(err?.additionalErrors) ? err.additionalErrors.join(" | ") : "";
    throw new Error(`${err?.message ?? e}${details ? `: ${details}` : ""}`);
  }
}

/** 2. 入れる: inspectDrop が落として確かめた xpi を入れる。ここで初めて拡張が動き出す。 */
export async function installDrop(inspected: DropInspection): Promise<string[]> {
  const { code, manifest: m } = inspected;
  const dir = dropDir(code);
  const ids: string[] = [];
  const files: string[] = [];
  const versions: string[] = [];
  for (const e of m.entries) {
    const path = PathUtils.join(dir, e.file);
    if (!(await IOUtils.exists(path))) throw new Error(`見てから入れて: ${e.file} が無い`);
    if ((await IOUtils.computeHexDigest(path, "sha256")) !== e.sha256) {
      throw new Error(`sha256 mismatch at install: ${e.file}`);
    }
    ids.push(await installFile(code, e.version, path));
    files.push(e.file);
    versions.push(e.version);
    console.log(`[noraneko-drops] installed ${e.id} ${e.version} from ${code}`);
  }
  const all = readInstalled();
  all[code] = { ids, files, versions, at: Date.now(), note: m.note };
  writeInstalled(all);
  return ids;
}

/** コードの束を外す(built-in に戻る)。手元の xpi も消す。 */
export async function removeDrop(code: string): Promise<void> {
  const all = readInstalled();
  const d = all[code];
  if (!d) return;
  for (const id of d.ids) {
    const addon = await AddonManager.getAddonByID(id);
    if (addon && addon.temporarilyInstalled) {
      await addon.uninstall();
      console.log(`[noraneko-drops] removed ${id} (${code})`);
    }
  }
  await IOUtils.remove(dropDir(code), { recursive: true, ignoreAbsent: true });
  delete all[code];
  writeInstalled(all);
}

export function listDrops(): Record<string, InstalledDrop> {
  return readInstalled();
}

/**
 * 起動時: 一度「入れる」を押した drop を手元の xpi から入れ直す(承認は一回でいい。画面には常に出る)。
 * dev build だけ: NORANEKO_DROP_CODE があれば見ずに入れる(試験用。製品にはこの道は無い)。
 */
export async function restoreDropsAtStartup(): Promise<void> {
  const all = readInstalled();
  for (const [code, d] of Object.entries(all)) {
    for (const [i, f] of (d.files ?? []).entries()) {
      try {
        await installFile(code, d.versions?.[i] ?? "", PathUtils.join(dropDir(code), f));
      } catch (e) {
        console.error(`[noraneko-drops] restore ${code}/${f} failed:`, e);
      }
    }
    if (d.files?.length) console.log(`[noraneko-drops] restored ${code} (${d.ids.join(", ")})`);
  }
  const code = IS_DEV ? Services.env.get(ENV_CODE) : "";
  console.log(`[noraneko-drops] startup: dev=${IS_DEV} env=${code || "-"} restored=${Object.keys(all).length}`);
  if (code && !all[code]) {
    try {
      await installDrop(await inspectDrop(code));
    } catch (e) {
      console.error(`[noraneko-drops] ${ENV_CODE}=${code} failed:`, e);
    }
  }
}
