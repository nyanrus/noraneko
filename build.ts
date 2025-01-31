import * as fs from "node:fs/promises";
import * as pathe from "pathe"
import { injectManifest } from "./scripts/inject/manifest";
import { injectXHTML, injectXHTMLDev } from "./scripts/inject/xhtml";
import { applyMixin } from "./scripts/inject/mixin-loader";
import { build as buildVite } from "vite";
import AdmZip from "adm-zip";
import { savePrefsForProfile } from "./scripts/launchDev/savePrefs";

import { applyPatches } from "./scripts/git-patches/git-patches-manager";
import { initializeBinGit } from "./scripts/git-patches/git-patches-manager";
import { genVersion } from "./scripts/launchDev/writeVersion";
import { writeBuildid2 } from "./scripts/update/buildid2";
import { $, ProcessPromise } from "zx";
import { usePwsh } from 'zx'
import chalk from "chalk";

switch (process.platform) {
  case "win32":
    usePwsh()
}

//? when the linux binary has published, I'll sync linux bin version
const VERSION = process.platform === "win32" ? "001" : "000";
const binExtractDir = "_dist/bin";
const binDir = process.platform !== "darwin" ? "_dist/bin/noraneko"
  : "_dist/bin/noraneko/Noraneko.app/Contents/Resources";

const r = (dir: string) => {
  return pathe.resolve(import.meta.dirname, dir);
};

const isExists = async (path: string) => {
  return await fs
    .access(path)
    .then(() => true)
    .catch(() => false);
};

const getBinArchive = async () => {
  if (process.platform === "win32") {
    for await (const x of fs.glob("noraneko-*.win64.zip")) {
      return x
    }
  } if (process.platform === "linux") {
    const arch = process.arch;
    if (arch === "arm64") {
      return "noraneko-linux-aarch64-dev.zip";
    } if (arch === "x64") {
      return "noraneko-linux-amd64-dev.zip";
    }
  } else {
    if (process.platform === "darwin") {
      return "noraneko-macOS-universal.dmg";
    }
  }
  throw new Error("Unsupported platform/architecture");
};

const binArchive = await getBinArchive();

try {
  await fs.access("dist");
  await fs.rename("dist", "_dist");
} catch {}

const binPath = pathe.join(binDir, "noraneko");
const binPathExe = process.platform !== "darwin" ?
  binPath + (process.platform === "win32" ? ".exe" : ""):
  "./_dist/bin/noraneko/Noraneko.app/Contents/MacOS/noraneko";

const binVersion = pathe.join(binDir, "nora.version.txt");

async function decompressBin() {
  try {
    console.log(`decompressing ${binArchive}`);
    if (!(await isExists(binArchive))) {
      console.error(`${binArchive} not found`);
      process.exit(1);
    }

    if (process.platform === "win32") {
      new AdmZip(binArchive).extractAllTo(binExtractDir);
      console.log("decompress complete!");
      await fs.writeFile(binVersion, VERSION);
    }

    if (process.platform === "darwin") {
      //? macOS
      const mountDir = "_dist/mount";
      await fs.mkdir(mountDir, { recursive: true });
      await $`hdiutil ${[
        "attach",
        "-mountpoint",
        mountDir,
        binArchive,
      ]}`;
      await fs.mkdir(binDir, { recursive: true });
      await fs.cp(pathe.join(mountDir, "Noraneko.app"),pathe.join("./_dist/bin/noraneko", ""))
      await fs.writeFile(binVersion, VERSION);
      await $`hdiutil ${["detach", mountDir]}`;
      await fs.rm(mountDir, { recursive: true });
      await $`chmod ${["-R", "777", `./_dist/bin/noraneko/Noraneko.app`]}`;
      await $`xattr ${["-rc", `./_dist/bin/noraneko/Noraneko.app`]}`;
    }

    if (process.platform === "linux") {
      await $`chmod ${["-R", "755", `./${binDir}`]}`;
      await $`chmod ${["755", binPathExe]}`;
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function initBin() {
  const hasVersion = await isExists(binVersion);
  const hasBin = await isExists(binPathExe);

  if (hasVersion) {
    const version = (await fs.readFile(binVersion)).toString();
    const mismatch = VERSION !== version;
    if (mismatch) {
      console.log(`version mismatch ${version} !== ${VERSION}`);
      await fs.rm(binDir, { recursive: true });
      await fs.mkdir(binDir, { recursive: true });
      await decompressBin();
      return;
    }
  } else {
    if (hasBin) {
      console.log(`bin exists, but version file not found, writing ${VERSION}`);
      await fs.mkdir(binDir, { recursive: true });
      await fs.writeFile(binVersion, VERSION);
    }
  }
  console.log("initBin");
  if (!hasBin) {
    console.log("There seems no bin. decompressing.");
    await fs.mkdir(binDir, { recursive: true });
    await decompressBin();
  }
}

async function runWithInitBinGit() {
  if (await isExists(binDir)) {
    await fs.rm(binDir, { recursive: true, force: true });
  }

  await initBin();
  await initializeBinGit();
  await run();
}

let devViteProcess: ProcessPromise | null = null;
let browserProcess: ProcessPromise | null = null;
let devInit = false;

async function run(mode: "dev" | "test" | "release" = "dev") {
  await initBin();
  await applyPatches();

  //create version for dev
  await genVersion();
  let buildid2: string | null = null;
  try {
    await fs.access("_dist/buildid2");
    buildid2 = await fs.readFile("_dist/buildid2", { encoding: "utf-8" });
  } catch {}
  console.log(`[dev] buildid2: ${buildid2}`);
  if (mode !== "release") {
    if (!devInit) {
      console.log("run dev servers");
      devViteProcess = $`node --import @swc-node/register/esm-register ./scripts/launchDev/child-dev.ts ${mode} ${buildid2 ?? ""}`.stdio("pipe").nothrow();

      (async () => {for await (const temp of devViteProcess.stdout) {
        process.stdout.write(temp)
      }})();
      (async () => {for await (const temp of devViteProcess.stderr) {
        process.stdout.write(temp)
      }})();
      await $`node --import @swc-node/register/esm-register ./scripts/launchDev/child-build.ts ${mode} ${buildid2 ?? ""}`

      // env
      if (process.platform === "darwin") {
        process.env.MOZ_DISABLE_CONTENT_SANDBOX = "1";
      }
      devInit = true;
    }
    await Promise.all([
      injectManifest(binDir, true, "noraneko-dev"),
      injectXHTMLDev(binDir),
    ])
  } else {
    await release("before");
    try {
        await fs.access("_dist/bin/noraneko/noraneko-dev");
        await fs.rm("_dist/bin/noraneko/noraneko-dev", { recursive: true });
      } catch {}
    await fs.symlink("../../noraneko","./_dist/bin/noraneko/noraneko-dev",process.platform==="win32" ? "junction" : undefined);
  }

  await Promise.all([
    (async () => {
      await injectXHTML(binDir);
    })(),
    applyMixin(binDir),
    (async () => {
      try {
        await fs.access("_dist/profile");
        await fs.rm("_dist/profile", { recursive: true });
      } catch {}
    })(),
  ]);

  //https://github.com/puppeteer/puppeteer/blob/c229fc8f9750a4c87d0ed3c7b541c31c8da5eaab/packages/puppeteer-core/src/node/FirefoxLauncher.ts#L123
  await fs.mkdir("./_dist/profile/test", { recursive: true });
  await savePrefsForProfile("./_dist/profile/test");

  browserProcess = $`node --import @swc-node/register/esm-register ./scripts/launchDev/child-browser.ts`.stdio("pipe").nothrow();

  (async () => {for await (const temp of browserProcess.stdout) {
    process.stdout.write(temp)
  }})();
  (async () => {for await (const temp of browserProcess.stderr) {
    process.stdout.write(temp)
  }})();
}

let runningExit = false
async function exit() {
  if (runningExit) return;
  runningExit = true;
  if (browserProcess) {
    console.log("[build] Start Shutdown browserProcess")
    browserProcess.stdin.write("s")
    try {
      await browserProcess
    } catch (e){
      console.error(e)
    }
    console.log("[build] End Shutdown browserProcess")
  }
  if (devViteProcess) {
    console.log("[build] Start Shutdown devViteProcess")
    devViteProcess.stdin.write("s")
    try {
      await devViteProcess
    } catch (e){
      console.error(e)
    }
    console.log("[build] End Shutdown devViteProcess")
  }
  console.log(chalk.green("[build] Cleanup Complete!"))
  process.exit(0)
}

process.on("SIGINT",async ()=>{
  await exit()
})

/**
 * * Please run with NODE_ENV='production'
 * @param mode
 */
async function release(mode: "before" | "after") {
  let buildid2: string | null = null;
  try {
    await fs.access("_dist/buildid2");
    buildid2 = await fs.readFile("_dist/buildid2", { encoding: "utf-8" });
  } catch {}
  console.log(`[build] buildid2: ${buildid2}`);
  if (mode === "before") {
    await $`node --import @swc-node/register/esm-register ./scripts/launchDev/child-build.ts production ${buildid2 ?? ""}`
    await injectManifest("./_dist", false);
  } else if (mode === "after") {
    const binPath = "../obj-x86_64-pc-windows-msvc/dist/bin";
    injectXHTML(binPath);
    let buildid2: string | null = null;
    try {
      await fs.access("_dist/buildid2");
      buildid2 = await fs.readFile("_dist/buildid2", { encoding: "utf-8" });
    } catch {}
    await writeBuildid2(`${binPath}/browser`, buildid2 ?? "");
  }
}

if (process.argv[2]) {
  switch (process.argv[2]) {
    case "--run":
      run();
      break;
    case "--run-with-init-bin-git":
      runWithInitBinGit();
      break;
    case "--test":
      run("test");
      break;
    case "--run-prod":
      run("release");
      break;
    case "--release-build-before":
      release("before");
      break;
    case "--release-build-after":
      release("after");
      break;
    case "--write-version":
      await genVersion();
      break;
  }
}
