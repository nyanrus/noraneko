# The launcher

A small page that builds and opens Noraneko for you, so you do not have to
remember any commands. It runs on your own machine and talks to nothing else.

If you would rather type the commands, [DEV.md](DEV.md) is that route, and it is
the same work underneath.

## Start it

```sh
mise exec -- deno task launcher
```

It prints a URL and, on macOS, opens it for you:

```
noraneko dev launcher: http://127.0.0.1:53271/?t=662633ed7e6f0952
```

The port is whatever was free. Set `PORT` if you want a fixed one
(`PORT=5199 mise exec -- deno task launcher`). Keep the terminal open — that
process *is* the launcher. `Ctrl-C` stops whatever is running and quits.

The first run still has to download the Firefox runtime (~66 MB) and build
everything, so it takes a few minutes. The page says so while it waits.

## What you can press

Two buttons, and that is usually all you need:

| Button | What it does |
|---|---|
| **起動する** — *Start* | Builds from the code in your checkout and opens Noraneko. The everyday one. (`feles-build dev`) |
| **配るときと同じ形で起動する** — *Start the way it ships* | Builds the way a release is built, then opens it in a dev browser. Slower. (`feles-build stage`) |

While something is running, the buttons grey out and **中止する** (*Stop*) is
live. Stopping sends `TERM` to the whole process group, so the Vite servers and
the browser go down with it rather than being left behind.

Under **くわしい記録** (*The full record*) there is the raw log, plus four
buttons for the less common jobs:

| Button | Command |
|---|---|
| 開いている Noraneko を閉じる — *Close the open Noraneko* | `feles-build stop` |
| patch を当て直す — *Re-apply patches* | `feles-build misc patch --action apply` |
| 配布用に組み立てる — *Build for distribution* | `feles-build build --phase before-mach` |
| 版の番号を書く — *Write the version* | `feles-build misc writeVersion` |

## What it shows you

The line at the top is the build, said in plain words rather than in log lines —
*downloading Noraneko itself*, *building*, *opening Noraneko* — with how long it
has been going. The log underneath is there when you want it, colour and all,
keeping the last 2000 lines.

One notice appears on its own: **すでに Noraneko が開いています** (*A Noraneko is
already open*). Firefox hands a second launch over to the copy that already owns
the profile, so the thing you just built would never appear on screen. The
notice comes with a button that closes the open one. It only counts browsers
started from this checkout, against this checkout's dev profile — a Noraneko you
installed normally is not touched.

If a build fails, the dot turns red and the reason is quoted from the log, so
you do not have to go looking for it.

## What it will not do

It is a build button, not a server, and it is written to stay that way:

- It listens on **127.0.0.1 only**. Nothing on your network can reach it.
- Every request except the page itself needs the token from the URL, so a page
  you happen to have open elsewhere cannot start a build behind your back.
- It can only run the six commands listed above. They are a fixed table in
  `tools/launcher.rb`; a name that is not in it does not run.
- It uses no gems — just the Ruby that `mise install` put there.

## When something goes wrong

- **The page does not open** (Linux, or macOS without a default browser) — copy
  the URL the terminal printed, token and all. Without `?t=…` the buttons will
  not work.
- **"すでに Noraneko が開いています" will not go away** — press its button; if it
  still will not, a browser from an earlier run may have been killed with
  `kill -9`, which orphans its content processes and leaves the profile lock
  held. Close them by hand, then try again.
- **Nothing happens when you press a button** — look at the terminal running the
  launcher; it prints the reason there.
- **A build fails** — open くわしい記録 and read the red lines. The same failures
  and their fixes are listed in [DEV.md](DEV.md#when-something-goes-wrong).

## Next

- [Development](DEV.md) — the same thing as commands, and what each step does
- [Build System](BUILD_SYSTEM.md) — the steps themselves
