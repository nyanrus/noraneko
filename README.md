# Noraneko Browser
by NyanRus: [GitHub](https://github.com/nyanrus) | [Buy me a milk tea](https://buymeacoffee.com/nyanrus) 🧋

<p align="center">
<img src=".github/assets/readme/logo_with_wordmark_light.svg#gh-light-mode-only" width="400px" alt="Noraneko Logo and Workmark"></img>
<img src=".github/assets/readme//logo_with_wordmark_dark.svg#gh-dark-mode-only" width="400px" alt="Noraneko Logo and Workmark"></img>
</p>

> [!WARNING]
> Experimental!

Noraneko Browser is currently testbed for Floorp 12.

Have a nice day!

## Try it

Two commands, on macOS (Apple Silicon) or Linux. Nothing is installed
system-wide — the Firefox runtime, the profile and the build output all live
under `_dist/`, and deleting the folder undoes everything.

```sh
git clone https://github.com/f3liz-casa/noraneko
cd noraneko
mise install                              # deno + ruby, pinned in mise.toml
mise exec -- deno task feles-build dev
```

The first run downloads a Firefox runtime (~66 MB) and builds the browser, so
give it a few minutes; after that a Noraneko window opens with hot reload. Close
the window and everything stops with it.

Would rather not keep commands in your head? `mise exec -- deno task launcher`
opens a page that does the same from two buttons — see
**[Launcher](docs/LAUNCHER.md)**.

You need **git**, **[mise](https://mise.jdx.dev)** and ~3 GB of disk; on macOS
also the Xcode Command Line Tools (`xcode-select --install`), because the
runtime is ad-hoc signed on extraction. macOS arm64 is verified; Linux aarch64
should work; x86_64 and Windows have no current runtime published yet.
**[Development](docs/DEV.md)** has the details, the platform table and what to do
when something goes wrong.

<p align="center">
<img src=".github/assets/readme/noraneko.structure.light.excalidraw.svg#gh-light-mode-only" width="1200px" alt="Noraneko Logo and Workmark"></img>
<img src=".github/assets/readme/noraneko.structure.dark.excalidraw.svg#gh-dark-mode-only" width="1200px" alt="Noraneko Logo and Workmark"></img>
</p>

## Credits

Thank you [@CutterKnife](https://github.com/CutterKnife) for the logo!

### Projects that are inspired by or used in Noraneko

- Mozilla Firefox

  License:\
  [Homepage: mozilla.org](https://www.mozilla.org/en-US/firefox/new/)

- Ablaze Floorp

  License: Mozilla Public License 2.0\
  [Homepage: floorp.app](https://floorp.app)\
  [GitHub: Floorp-Projects/Floorp](https://github.com/Floorp-Projects/Floorp)

- Fushra Pulse

  License: Mozilla Public License 2.0\
  [Homepage: pulsebrowser.app](https://pulsebrowser.app/)\
  [GitHub: pulse-browser/browser](https://github.com/pulse-browser/browser)

- Lepton Designs (Firefox-UI-Fix)

  License: Mozilla Public License 2.0\
  [GitHub: black7375/Firefox-UI-Fix](https://github.com/black7375/Firefox-UI-Fix)

Thank you!

## Documentation

For developers and contributors, see the following documentation:

| Document | Description |
|----------|-------------|
| [Development](docs/DEV.md) | Getting a dev browser running (macOS arm64 / Linux) |
| [Launcher](docs/LAUNCHER.md) | A page that builds and opens Noraneko for you, no commands to remember |
| [Architecture](docs/ARCHITECTURE.md) | High-level architecture overview |
| [Build System](docs/BUILD_SYSTEM.md) | Build system and tooling documentation |
| [Event Dispatcher](docs/RPC_SYSTEM_README.md) | Inter-module communication system |
| [Shared Code](docs/SHARED_CODE_STRUCTURE.md) | Shared code organization |
| [Questions](docs/QUESTIONS.md) | Open questions for contributors |

## Useful Links

[![Link to Noraneko Runtime Repository](.github/assets/readme/Link2RuntimeRepo.svg)](https://github.com/f3liz-dev/noraneko-runtime/)

## LICENSE

Mozilla Public License 2.0
