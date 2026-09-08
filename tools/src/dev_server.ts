// SPDX-License-Identifier: MPL-2.0

import * as path from "@std/path";
import { PROJECT_ROOT, DEV_SERVER } from "./defines.ts";
import { Logger } from "./utils.ts";

const logger = new Logger("dev-server");
let viteProcesses: Array<{ pid?: number }> = [];

export async function run(writer: any): Promise<void> {
  logger.info("Starting Vite dev servers...");

  const servers = [
    { name: "main", path: path.join(PROJECT_ROOT, "browser-features/chrome") },
    { name: "designs", path: path.join(PROJECT_ROOT, "browser-features/skin") },
  ];

  // Ensure logs directory exists
  const logsDir = path.join(PROJECT_ROOT, "logs");
  try {
    Deno.mkdirSync(logsDir, { recursive: true });
  } catch (e: any) {
    logger.warn(`Failed to create logs dir ${logsDir}: ${e?.message ?? e}`);
  }

  // 前の回の vite が残っていたら(親が落ちて孤児になったもの)、先に片づける
  await killStaleVite(PROJECT_ROOT);

  for (const server of servers) {
    const port = getPortFor(server.name).toString();
    // Run Vite via Deno's npm compatibility (Deno-only)
    const cmd = "deno";
    const args = ["run", "-A", "npm:vite", "--port", port];

    const child = new Deno.Command(cmd, {
      args,
      cwd: server.path,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    const logFilePath = path.join(logsDir, `vite-${server.name}.log`);
    let fh: Deno.FsFile | null = null;
    try {
      fh = await Deno.open(logFilePath, {
        write: true,
        create: true,
        truncate: true,
      });
    } catch (e: any) {
      logger.warn(`Failed to open log file ${logFilePath}: ${e?.message ?? e}`);
    }

    const pipeToFile = async (
      stream: ReadableStream<Uint8Array> | null,
      file: Deno.FsFile | null,
    ) => {
      if (!stream || !file) return;
      const reader = stream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            await file.write(value);
          }
        }
      } catch (e: any) {
        logger.warn(`Error piping to file ${logFilePath}: ${e?.message ?? e}`);
      }
    };

    // Start piping without awaiting so servers run concurrently
    pipeToFile(child.stdout, fh);
    pipeToFile(child.stderr, fh);

    viteProcesses.push(child);

    logger.info(
      `Started Vite dev server for ${server.name} with PID: ${child.pid}, logging to ${logFilePath}`,
    );
  }

  logger.info("All Vite dev servers started.");
  // Wait a short time for servers to start (parity with original sleep 5)
  await new Promise((res) => setTimeout(res, 5000));

  try {
    if (typeof writer?.write === "function") {
      // prefer direct write
      writer.write(`${DEV_SERVER.ready_string}\n`);
    } else if (typeof writer === "function") {
      // some callers pass a callback
      writer(`${DEV_SERVER.ready_string}\n`);
    } else {
      // fallback to console
      console.log(DEV_SERVER.ready_string);
    }

    if (typeof writer?.end === "function") {
      writer.end();
    }
  } catch (e: any) {
    logger.warn(`Failed to write ready string to writer: ${e?.message ?? e}`);
  }
}

/**
 * 前の回の vite(親が SIGKILL などで落ちて孤児になったもの)を止める。
 * macOS には親と一緒に子が死ぬ仕組みが無いので、次の起動のここで片づける。
 * 見分けかた: コマンドラインが `npm:vite` で、cwd がこの repo の中。
 * (port で見ない: 取られていた port を避けて別の port に逃げた vite が、あとで browser の 5180 を塞いだことがある)
 */
export async function killStaleVite(projectRoot: string): Promise<void> {
  const text = (c: Deno.CommandOutput) => new TextDecoder().decode(c.stdout);
  let pids: number[] = [];
  try {
    pids = text(new Deno.Command("pgrep", { args: ["-f", "npm:vite"], stdout: "piped", stderr: "null" }).outputSync())
      .split(/\s+/).filter(Boolean).map(Number).filter((p) => p !== Deno.pid);
  } catch {
    return; // pgrep が無ければ何もしない
  }
  let killed = 0;
  for (const pid of pids) {
    let cwd = "";
    try {
      // lsof -Fn で cwd の行は "n/path"
      const out = text(new Deno.Command("lsof", { args: ["-a", "-d", "cwd", "-p", String(pid), "-Fn"], stdout: "piped", stderr: "null" }).outputSync());
      cwd = (out.split("\n").find((l) => l.startsWith("n")) ?? "").slice(1);
    } catch { /* ignore */ }
    if (!cwd.startsWith(projectRoot)) continue;
    logger.warn(`killing stale vite (pid ${pid}, cwd ${cwd}) left from a previous run`);
    try { Deno.kill(pid, "SIGTERM"); killed++; } catch { /* ignore */ }
  }
  if (killed) await new Promise((r) => setTimeout(r, 800));
}

export function shutdown(): void {
  logger.info("Shutting down Vite dev servers...");
  for (const child of viteProcesses) {
    try {
      if (child?.pid) {
        try {
          Deno.kill(child.pid);
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      logger.warn(`Failed to stop process ${child?.pid}: ${e?.message ?? e}`);
    }
  }
  viteProcesses = [];
  logger.success("Vite dev servers shut down.");
}

export function getPortFor(serverName: string): number {
  switch (serverName) {
    case "main":
      return 5181;
    case "designs":
      return 5174;
    case "settings":
      return 5175;
    default:
      return DEV_SERVER.default_port;
  }
}
