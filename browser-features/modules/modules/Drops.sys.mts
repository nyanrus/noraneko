// SPDX-License-Identifier: MPL-2.0
/**
 * Drops: コード一つで機能(webext-actor の xpi)が降ってくる。
 *
 * Git が使えない人にも試してもらえるように、機能の束を dl.f3liz.casa/drop/<uuid>/ に置く。
 * 正体は uuid、名前は札(Julia の General と同じ絵。別の registry に同じ名前があっても uuid が違えば別のもの)。
 * about:nora:settings で uuid を入れると、まず **見る**(inspectDrop: 落として sha256 を確かめ、
 * xpi の中の manifest / schema / source を zip として読む。JS は一切実行しない)、
 * それから本人が「入れる」を押して **入れる**(installDrop: ここで初めて xpi の中のコードが動き出す)。
 *
 * 入れかたは Firefox 自身の about:newtab(newtab@mozilla.org)と同じ形:
 * - xpi は入れ物。AddonManager には temporary add-on として入れる(about:debugging に見える。署名の要求が無い。
 *   再起動で消えるので、起動時に手元の xpi から入れ直す。同じ id の built-in より優先される)。
 * - ページに届く道は JSWindowActor(NoraActors.sys.mts)。resource://noraneko-drop-<uuid>-<版>/ の別名を
 *   xpi の root に張り、その actor.json のとおりに親(parent.sys.mjs)と子(child.sys.mjs)を登録する。
 *   同じ名前の built-in の actor は外れる(置き換え)。戻せば built-in を登録し直す。
 * WebExtension の content_scripts は使わない。stock Firefox では about:* / chrome:* に注入されないから
 * (webext-actors/README.md「addon 式が駄目だった理由」)。
 *
 * 作る側: tools/scripts/build-drop.rb(actor を xpi にして manifest.json を書く。source も同梱)。
 */

const PREF_REGISTRIES = "noraneko.drops.registries"; // JSON: Registry[]。空なら既定の一つ
const PREF_INSTALLED = "noraneko.drops.installed"; // JSON: { [uuid]: { name, ids, files, versions, at, note, registry } }
const ENV_UUID = "NORANEKO_DROP_UUID"; // dev build だけ: 起動時にこの env(uuid)があれば見ずに入れる(試験用)
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

/** drop を配る registry(iOS の代替ストアと同じ絵: 既定の一つ + 本人が足したもの) */
export interface Registry {
  name: string;
  base: string; // 例: https://dl.f3liz.casa/drop  → <base>/<uuid>/manifest.json
  identity: string; // 判を押す workflow(Fulcio の cert の SAN)
  issuer: string;
}
export const DEFAULT_REGISTRY: Registry = {
  name: "f3liz",
  base: "https://dl.f3liz.casa/drop",
  identity: "https://github.com/f3liz-casa/noraneko-registry/.github/workflows/verify-and-sign.yml@refs/heads/main",
  issuer: "https://token.actions.githubusercontent.com",
};
export function listRegistries(): Registry[] {
  try {
    const v = JSON.parse(Services.prefs.getStringPref(PREF_REGISTRIES, "[]")) as Registry[];
    return v.length ? v : [DEFAULT_REGISTRY];
  } catch {
    return [DEFAULT_REGISTRY];
  }
}
export function addRegistry(r: Registry): void {
  if (!/^[a-z0-9][a-z0-9._-]{0,31}$/.test(r.name)) throw new Error(`bad registry name: ${r.name}`);
  if (!/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(r.base)) throw new Error(`base は https の URL で: ${r.base}`);
  if (!/^https:\/\//.test(r.identity)) throw new Error(`identity は workflow の URL で: ${r.identity}`);
  const all = listRegistries().filter((x) => x.name !== r.name);
  all.push({ ...r, base: r.base.replace(/\/$/, ""), issuer: r.issuer || DEFAULT_REGISTRY.issuer });
  Services.prefs.setStringPref(PREF_REGISTRIES, JSON.stringify(all));
}
export function removeRegistry(name: string): void {
  const all = listRegistries().filter((x) => x.name !== name);
  Services.prefs.setStringPref(PREF_REGISTRIES, JSON.stringify(all));
}
function registryByName(name?: string): Registry {
  const all = listRegistries();
  const r = name ? all.find((x) => x.name === name) : all[0];
  if (!r) throw new Error(`registry "${name}" が無い(設定で足せる)`);
  return r;
}

/**
 * drop の正体は uuid(registry の drop.toml で一度振ったら変えない)。配る URL も、ここに入れる字も uuid。
 * registry の指定が無ければ、一覧に順に訊いて、持っているところから落とす(uuid は一つなので、取り違えは起きない)。
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function parseUuid(ref: string): string {
  const u = ref.trim().toLowerCase();
  if (!UUID.test(u)) throw new Error(`書きかたは uuid(例: ec4dfa7c-9e5a-4c1d-8d0d-771e3ee81030): ${ref}`);
  return u;
}

export interface DropEntry {
  id: string;
  name: string;
  version: string;
  file: string;
  sha256: string;
  size: number;
}
export interface DropManifest {
  uuid: string;
  name: string; // 札(registry の中の dir の名前)
  note?: string;
  contact?: string[]; // 作者の連絡先。"gh/<user>" "mail/<addr>" "social/<@user@host か URL>" か URL(drop.toml から CI が写す)
  source?: { repo?: string; commit?: string; commit_time?: string; path?: string };
  entries: DropEntry[];
}
export interface InstalledDrop {
  name?: string; // 札(manifest の name)
  ids: string[];
  files: string[];
  versions: string[];
  actors?: string[]; // 登録した JSWindowActor の名前(外すときに使う)
  at: number;
  note?: string;
  registry?: string;
}
/** 見るための情報。manifest / schema / source を読んだだけで、何も実行していない */
export interface DropInspection {
  uuid: string;
  name: string; // 札(manifest の name)
  registry: Registry;
  attestations: import("./sigstore/Sigstore.sys.mjs").AttestationCheck[]; // registry の判
  manifest: DropManifest;
  entries: {
    id: string;
    name: string;
    version: string;
    file: string;
    sha256: string;
    matches: string[]; // content.js が動くページ(actor.json の matches)
    chrome: boolean; // ブラウザの窓そのもの(browser.xhtml)にも効く(actor.json の includeChrome)
    permissions: string[]; // (xpi の manifest に permissions があれば。いまの actor には無い)
    functions: string[]; // 親プロセスで呼べる関数(actor.json の methods)
    sources: { path: string; text: string }[]; // 書いたもの(source/)
    files: { path: string; text: string }[]; // 実際に実行される・読まれるもの(xpi の中の JS と JSON、source/ 以外)
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
/** profile/noraneko-drops/<uuid>/ */
function dropDir(uuid: string): string {
  return PathUtils.join(PathUtils.profileDir, DIR_NAME, uuid);
}
/** build-drop.rb と同じ規則: "noraneko-drop-" + uuid + "-" + 版、[a-z0-9] 以外は "-"、小文字 */
function resAlias(uuid: string, version: string): string {
  return `noraneko-drop-${uuid}-${version}`.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

/** manifest.json は bytes のまま持つ(判はその bytes に対して押されている) */
async function fetchDropManifest(reg: Registry, uuid: string): Promise<{ manifest: DropManifest; bytes: Uint8Array }> {
  const resp = await fetch(`${reg.base}/${uuid}/manifest.json`, { cache: "no-store" });
  if (!resp.ok) throw new Error(`no drop ${uuid} in ${reg.name} (${resp.status})`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const m = JSON.parse(new TextDecoder().decode(bytes)) as DropManifest;
  if (m.uuid !== uuid) throw new Error(`manifest の uuid(${m.uuid})が ${uuid} と違う`);
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(m.name ?? "")) throw new Error(`manifest の name の形が違う: ${m.name}`);
  if (!Array.isArray(m.entries) || m.entries.length === 0) {
    throw new Error(`drop ${uuid} has no entries`);
  }
  return { manifest: m, bytes };
}
/** registry の指定があればそこ。無ければ一覧に順に訊いて、最初に持っていたところ */
async function findDrop(uuid: string, registryName?: string): Promise<{ reg: Registry; manifest: DropManifest; bytes: Uint8Array }> {
  if (registryName) {
    const reg = registryByName(registryName);
    return { reg, ...(await fetchDropManifest(reg, uuid)) };
  }
  const misses: string[] = [];
  for (const reg of listRegistries()) {
    try {
      return { reg, ...(await fetchDropManifest(reg, uuid)) };
    } catch (e) {
      misses.push(String((e as Error)?.message ?? e));
    }
  }
  throw new Error(`どの registry にも ${uuid} が無い(${misses.join(" / ")})`);
}

/** 読める字のもの。それ以外(.wasm など)は中を開かず、大きさだけ見せる */
const TEXT_EXT = /\.(js|mjs|cjs|ts|tsx|json|md|css|html|xhtml|svg|txt|toml|tsubaki|jl)$/i;

/** xpi(zip)の中を文字列で読む。実行はしない */
function readZipEntries(path: string): Map<string, string> {
  const zr = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
  zr.open(new FileUtils.File(path));
  const out = new Map<string, string>();
  try {
    for (const name of zr.findEntries("*")) {
      if (name.endsWith("/")) continue;
      if (!TEXT_EXT.test(name)) {
        out.set(name, `(binary, ${zr.getEntry(name).realSize} bytes)`);
        continue;
      }
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

/** registry の判を確かめる。無ければ ok=false で理由を書く。止めはしない */
async function checkAttestations(reg: Registry, uuid: string, manifestBytes: Uint8Array) {
  const { verifyKeylessBundle } = ChromeUtils.importESModule("resource://noraneko/modules/sigstore/Sigstore.sys.mjs");
  const r = await fetch(`${reg.base}/${uuid}/manifest.json.sigstore.json`, { cache: "no-store" });
  if (!r.ok) {
    return [{ who: "registry", identity: reg.identity, issuer: reg.issuer, ok: false, reason: "registry の判(manifest.json.sigstore.json)が無い" }];
  }
  return [await verifyKeylessBundle("registry", await r.json(), manifestBytes, reg.identity, reg.issuer)];
}

/**
 * 1. 見る: 落として sha256 を確かめ、判を確かめ、中身を読む。実行はしない。
 * ref は uuid。registry は指定が無ければ一覧に順に訊く。
 */
export async function inspectDrop(ref: string, registryName?: string): Promise<DropInspection> {
  const uuid = parseUuid(ref);
  const { reg, manifest: m, bytes: manifestBytes } = await findDrop(uuid, registryName);
  console.log(`[noraneko-drops] inspect ${uuid} (${m.name}) @ ${reg.name}: manifest`);
  const attestations = await checkAttestations(reg, uuid, manifestBytes);
  const dir = dropDir(uuid);
  await IOUtils.makeDirectory(dir, { createAncestors: true, ignoreExisting: true });
  const entries: DropInspection["entries"] = [];
  for (const e of m.entries) {
    if (!/^[A-Za-z0-9._-]+$/.test(e.file)) throw new Error(`bad file name: ${e.file}`);
    const url = `${reg.base}/${uuid}/${e.file}`;
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
    console.log(`[noraneko-drops] inspect ${m.name}: ${e.file} sha256 ok, reading zip`);
    const files = readZipEntries(path);
    console.log(`[noraneko-drops] inspect ${m.name}: ${e.file} ${files.size} entries`);
    const wm = JSON.parse(files.get("manifest.json") ?? "{}");
    let actor: { matches?: string[]; methods?: string[]; includeChrome?: boolean } = {};
    try {
      actor = JSON.parse(files.get("actor.json") ?? "{}");
    } catch {
      // actor.json が壊れているなら空のまま(表示だけの話。入れるときに改めて読んで失敗する)
    }
    entries.push({
      id: wm.browser_specific_settings?.gecko?.id ?? e.id,
      name: e.name,
      version: wm.version ?? e.version,
      file: e.file,
      sha256: e.sha256,
      matches: actor.matches ?? [],
      chrome: actor.includeChrome === true,
      permissions: wm.permissions ?? [],
      functions: actor.methods ?? [],
      sources: [...files.entries()]
        .filter(([n]) => n.startsWith("source/"))
        .map(([n, text]) => ({ path: n.slice("source/".length), text })),
      files: [...files.entries()]
        .filter(([n]) => !n.startsWith("source/"))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([n, text]) => ({ path: n, text })),
    });
  }
  return { uuid, name: m.name, registry: reg, attestations, manifest: m, entries };
}

async function installFile(uuid: string, version: string, path: string): Promise<{ id: string; actor: string }> {
  const file = new FileUtils.File(path);
  // xpi の root に別名を張る。parent.sys.mjs / child.sys.mjs / actor.mjs / content.js はこの URL で読まれる
  // (importESModule は jar:file: を信用しない。content process にも同じ別名が届く)
  const res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  const alias = resAlias(uuid, version);
  const root = `resource://${alias}/`;
  if (!res.hasSubstitution(alias)) {
    res.setSubstitutionWithFlags(
      alias,
      Services.io.newURI(`jar:${Services.io.newFileURI(file).spec}!/`),
      Ci.nsISubstitutingProtocolHandler.ALLOW_CONTENT_ACCESS,
    );
  }
  try {
    const addon = await AddonManager.installTemporaryAddon(file);
    const NoraActors = ChromeUtils.importESModule("resource://noraneko/modules/NoraActors.sys.mjs");
    const reg = await NoraActors.readActorJson(root);
    NoraActors.register(root, reg);
    console.log(`[noraneko-drops] ${addon.id} ${addon.version}: actor ${reg.name} ← ${root}`);
    return { id: addon.id, actor: reg.name };
  } catch (e) {
    // "Extension is invalid" は manifest の error を additionalErrors に持っている。見えないと直せない
    const err = e as { message?: string; additionalErrors?: string[] };
    const details = Array.isArray(err?.additionalErrors) ? err.additionalErrors.join(" | ") : "";
    throw new Error(`${err?.message ?? e}${details ? `: ${details}` : ""}`);
  }
}

/** 2. 入れる: inspectDrop が落として確かめた xpi を入れる。ここで初めて拡張が動き出す。 */
export async function installDrop(inspected: DropInspection): Promise<string[]> {
  const uuid = parseUuid(inspected.uuid);
  const m = inspected.manifest;
  const dir = dropDir(uuid);
  const ids: string[] = [];
  const files: string[] = [];
  const versions: string[] = [];
  const actors: string[] = [];
  for (const e of m.entries) {
    const path = PathUtils.join(dir, e.file);
    if (!(await IOUtils.exists(path))) throw new Error(`見てから入れて: ${e.file} が無い`);
    if ((await IOUtils.computeHexDigest(path, "sha256")) !== e.sha256) {
      throw new Error(`sha256 mismatch at install: ${e.file}`);
    }
    const r = await installFile(uuid, e.version, path);
    ids.push(r.id);
    actors.push(r.actor);
    files.push(e.file);
    versions.push(e.version);
    console.log(`[noraneko-drops] installed ${e.id} ${e.version} from ${m.name} (${uuid})`);
  }
  const all = readInstalled();
  all[uuid] = { name: m.name, ids, files, versions, actors, at: Date.now(), note: m.note, registry: inspected.registry.name };
  writeInstalled(all);
  return ids;
}

/** コードの束を外す(built-in に戻る)。手元の xpi も消す。 */
export async function removeDrop(ref: string): Promise<void> {
  const uuid = parseUuid(ref);
  const all = readInstalled();
  const d = all[uuid];
  if (!d) return;
  const NoraActors = ChromeUtils.importESModule("resource://noraneko/modules/NoraActors.sys.mjs");
  for (const name of d.actors ?? []) NoraActors.unregister(name);
  for (const id of d.ids) {
    const addon = await AddonManager.getAddonByID(id);
    if (addon && addon.temporarilyInstalled) {
      await addon.uninstall();
      console.log(`[noraneko-drops] removed ${id} (${d.name ?? uuid})`);
    }
  }
  // installFile が張った別名を外す(版ごとに一つ。残すと次の版まで jar: を指したままになる)
  const res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
  for (const v of d.versions ?? []) {
    const alias = resAlias(uuid, v);
    if (res.hasSubstitution(alias)) res.setSubstitution(alias, null);
  }
  await IOUtils.remove(dropDir(uuid), { recursive: true, ignoreAbsent: true });
  delete all[uuid];
  writeInstalled(all);
  // built-in の actor を登録し直す(同じ名前のものが戻る)
  await ChromeUtils.importESModule("resource://noraneko/modules/NoranekoStartup.sys.mjs").registerBuiltinWebExtActors();
}

export function listDrops(): Record<string, InstalledDrop> {
  return readInstalled();
}

/**
 * 起動時: 一度「入れる」を押した drop を手元の xpi から入れ直す(承認は一回でいい。画面には常に出る)。
 * dev build だけ: NORANEKO_DROP_UUID があれば見ずに入れる(試験用。製品にはこの道は無い)。
 */
export async function restoreDropsAtStartup(): Promise<void> {
  const all = readInstalled();
  for (const [uuid, d] of Object.entries(all)) {
    if (!UUID.test(uuid)) {
      // 古い形(key が uuid でない)は入れ直せない。一覧からは外す(手元の xpi も古い形で、もう入らない)
      console.warn(`[noraneko-drops] dropping old entry "${uuid}" (形が古い。入れ直して)`);
      delete all[uuid];
      writeInstalled(all);
      continue;
    }
    for (const [i, f] of (d.files ?? []).entries()) {
      try {
        await installFile(uuid, d.versions?.[i] ?? "", PathUtils.join(dropDir(uuid), f));
      } catch (e) {
        console.error(`[noraneko-drops] restore ${d.name ?? uuid}/${f} failed:`, e);
      }
    }
    if (d.files?.length) console.log(`[noraneko-drops] restored ${d.name ?? uuid} (${d.ids.join(", ")})`);
  }
  const ref = IS_DEV ? Services.env.get(ENV_UUID) : ""; // uuid
  console.log(`[noraneko-drops] startup: dev=${IS_DEV} env=${ref || "-"} restored=${Object.keys(all).length}`);
  if (ref && !all[ref.trim().toLowerCase()]) {
    try {
      await installDrop(await inspectDrop(ref, Services.env.get("NORANEKO_DROP_REGISTRY") || undefined));
    } catch (e) {
      console.error(`[noraneko-drops] ${ENV_UUID}=${ref} failed:`, e);
    }
  }
}
