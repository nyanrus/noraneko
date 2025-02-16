import { createServer, type ViteDevServer } from "vite";
import { resolve } from "pathe";
import packageJson from "../../package.json" with { type: "json" };
import { $, type Options, type ProcessPromise, usePwsh } from "zx";

if (Deno.build.os === "windows") {
  usePwsh();
}

let pDevVite: ViteDevServer[] = [];
let pSettings: ProcessPromise | null = null;

const r = (value: string): string => {
  return resolve(import.meta.dirname, "../..", value);
};

async function launchDev(mode: string, buildid2: string) {
  pDevVite = [
    await createServer({
      mode,
      configFile: r("./src/apps/main/vite.config.ts"),
      root: r("./src/apps/main"),
      define: {
        "import.meta.env.__BUILDID2__": `"${buildid2 ?? ""}"`,
        "import.meta.env.__VERSION2__": `"${packageJson.version}"`,
      },
    }),
    await createServer({
      mode,
      configFile: r("./src/apps/designs/vite.config.ts"),
      root: r("./src/apps/designs"),
    }),
  ];
  // pSettings = $({cwd:r("./src/apps/settings-new"),preferLocal:true} as Options)`pnpm vite dev --mode ${mode}`;
  // pSettings.catch(console.log);
  // (async () => {
  //   for await (const i of pSettings!.stdout) {
  //     process.stdout.write(i)
  //   }
  // })();
  // (async () => {
  //   for await (const i of pSettings!.stderr) {
  //     process.stdout.write(i)
  //   }
  // })();
  for (const i of pDevVite) {
    await i.listen();
    i.printUrls();
  }
  console.log("nora-{bbd11c51-3be9-4676-b912-ca4c0bdcab94}-dev");
}

async function shutdownDev() {
  for (const i of pDevVite) {
    await i.close();
  }
  // await pSettings!.kill("SIGABRT")
  console.log("[child-dev] Completed Shutdown ViteDevServer✅");
}

{ //* main
  const decoder = new TextDecoder();
  (async () => {
    for await (const chunk of Deno.stdin.readable) {
      const text = decoder.decode(chunk);
      if (text.startsWith("q")) {
        console.log("[child-dev] Shutdown ViteDevServer");
        await shutdownDev();
        Deno.exit(0);
      }
    }
  })();
  await launchDev(Deno.args[0], Deno.args[1]);
}
