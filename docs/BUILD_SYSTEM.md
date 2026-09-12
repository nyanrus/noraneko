# Noraneko Build System

This document provides a comprehensive overview of the Noraneko build system, explaining its components, workflows, and how they interact.

## Overview

Noraneko's build system is designed to:
1. Download and extract the prebuilt Firefox/Noraneko runtime binary
2. Apply custom patches to the runtime
3. Build browser features and modules using Vite/Deno
4. Inject the built assets into the runtime
5. Create the final distributable package

The build system is **Ruby** (`tools/`). It never uses the JS ecosystem as a library — it only
starts programs: `deno task build` / `vite` for the bundling, and `git` / `unzip` / `zip` / `tar` /
`curl` / `codesign` for everything else. Ruby and Deno both come from `mise install`.

## Entry Point

The main build entry point is:
```bash
deno task feles-build <command>
```

This runs `tools/feles-build.rb`, which orchestrates the entire build process.
(`deno task` is kept as the front door so the command people type does not change.)

## Commands

| Command | Description |
|---------|-------------|
| `dev` | Development workflow - downloads binary, applies patches, builds in dev mode, starts dev servers, launches browser |
| `stage` | Production build with dev-mode browser launch - useful for testing production assets |
| `build --phase <phase>` | Production build for CI (phases: `before-mach`, `after-mach`) |
| `stop` | Close the dev browser started from this checkout |
| `misc patch --action <action>` | Patch management (actions: `apply`, `create`, `init`) |
| `misc writeVersion` | Write version files for Gecko |

## Build Components

All build steps live in `tools/lib/`, and `tools/feles-build.rb` calls them in order.

### omni.ja: unpacked once, sealed once

A packaged runtime keeps most of the browser inside `browser/omni.ja` (a STORE zip).
`tools/lib/omni.rb` unpacks it into `_dist/omni/` at the start of a run and seals it back
at the end, so the steps in between (patcher, injector, xhtml) only ever see plain files.

That is why there is no zip library and no diff library in this repo:

| | how |
|---|---|
| Applying patches | `git apply --directory <root>` — the same command for the packaged and the flat layout, because the unpacked tree *is* the flat layout |
| Editing `chrome.manifest`, `built_in_addons.json` | reading and writing the file |
| Editing `browser.xhtml` | text, touching only the `data-geckomixin` script it wrote itself |
| Sealing | `zip -0DXqr` — the same flags mozpack's OmniJarFormatter uses |

`Omni.root` is the unpacked tree when the runtime is packaged, and the binary directory
when it is not. Every step works against that root. The unpacked tree is kept between runs
(so `misc patch --action create` can keep a git repo in it); the initializer discards it
when it extracts a new runtime.

Sealing is the last thing that touches the bundle, which is why the ad-hoc `codesign`
comes right after it.

### 1. Initializer (`initializer.rb`)

**Purpose:** Ensures the runtime binary is present and properly configured.

**Key Functions:**
- `run()` - Entry point: checks binary version, downloads if needed, extracts, saves developer preferences
- `decompressBin()` - Extracts the downloaded archive (supports ZIP, DMG, TAR.XZ)
- `downloadBin()` - Downloads the runtime from GitHub releases
- `savePrefsForProfile()` - Creates `user.js` with developer preferences

**Binary Locations:**
- Windows/Linux: `_dist/bin/noraneko/`
- macOS: `_dist/bin/noraneko/Noraneko.app/Contents/Resources/`

### 2. Patcher (`patcher.rb`)

**Purpose:** Applies patches to the runtime binary to enable Noraneko features.

**Patch Directory:** `tools/patches/`

**Key Functions:**
- `applyPatches()` - Applies all `.patch` files to the runtime
- `createPatches()` - Creates patches from changes made to the runtime (for development)
- `initializeBinGit()` - Initializes Git in the binary directory for patch management

**How Patches Work:**
1. Patches are stored in `tools/patches/` as `.patch` files
2. Applied patches are tracked in `_dist/bin/applied_patches/`
3. If patches change, old ones are reversed before applying new ones
4. Patches use `git apply --directory <Omni.root>` with `--unsafe-paths`

**Patched Files:**
Check `tools/patches/` for the current list of patches. Common patches target:
- Browser initialization and startup
- Tab browser functionality
- Module system integrations

> **Note:** Patches with `.temp` suffix are not applied automatically.

### 3. Symlinker (`symlinker.rb`)

**Purpose:** Creates symbolic links for development mode.

**Links Created:**
| Link | Target |
|------|--------|
| `bridge/loader-features/link-features-chrome` | `browser-features/chrome` |
| `bridge/loader-features/link-i18n` | `i18n` |
| `bridge/loader-modules/link-modules` | `browser-features/modules` |

### 4. Builder (`builder.rb`)

**Purpose:** Builds the actual Noraneko features and modules.

**Build Commands (Dev):**
1. `bridge/startup` - Startup scripts (tsdown)
2. `bridge/loader-modules` - Module loader (tsdown)
3. `browser-features/chrome` - Chrome UI features (Vite)

**Build Commands (Production):**
Same as dev, but with production flags.

**Output Directories:**
| Component | Output |
|-----------|--------|
| `bridge/startup/_dist` | Startup scripts |
| `bridge/loader-modules/_dist` | Module resources |
| `browser-features/chrome/_dist` | Chrome content |

### 5. Injector (`injector.rb`, with `xhtml.rb`)

**Purpose:** Injects built assets into the runtime binary.

**Key Functions:**
- `run(mode)` - Creates manifest and symlinks built assets into binary directory
- `createManifest()` - Generates `noraneko.manifest` for chrome registration
- `Xhtml.inject(root, dev:)` - Adds the startup script, and loosens the CSP in dev

**Manifest Structure:**
```
content noraneko content/ contentaccessible=yes
content noraneko-startup startup/ contentaccessible=yes
skin noraneko classic/1.0 skin/
resource noraneko resource/ contentaccessible=yes
```

**Mounts Created:**
| Directory | Source |
|-----------|--------|
| `content/` | `browser-features/chrome/_dist` |
| `startup/` | `bridge/startup/_dist` |
| `skin/` | `browser-features/skin` |
| `resource/` | `bridge/loader-modules/_dist` |

### 6. Dev Server (`dev_server.rb`)

**Purpose:** Runs Vite development servers for hot module replacement (HMR).

**Servers:**
| Name | Port | Path |
|------|------|------|
| main | 5181 | `browser-features/chrome` |
| designs | 5174 | `browser-features/skin` |

**Logs:** Written to `logs/vite-*.log`

### 7. Browser Launcher (`browser_launcher.rb`, with `dev_browser.rb`)

**Closing the dev browser (`stop`).** Firefox hands a profile to whoever already holds it,
so a dev browser left running from an earlier session silently swallows the next `dev` run —
the new process starts, hands off, and exits. `deno task feles-build stop` closes it.

Because this kills a browser, `DevBrowser` decides what it may touch from the narrow side.
A process is closed only if **both** locks pass:

1. its executable is under this checkout's `_dist/bin/`, and
2. its `--profile` is exactly this checkout's `_dist/profile/test`.

Both paths are built from `PROJECT_ROOT`, so an installed Noraneko — living outside the
checkout and using the user's own profile — can never match either. A second lock is not
redundant: a Noraneko started *from this checkout* with a different profile is left alone
too. `tools/test/dev_browser_test.rb` pins this; if you ever loosen the rule, add a case there.


**Purpose:** Launches the Noraneko browser with debugging enabled.

**Launch Arguments:**
- `--profile _dist/profile/test`
- `--remote-debugging-port 5180`
- `--wait-for-browser`
- `--jsdebugger`

### 8. Dev Env Manager (`dev_env_manager.rb`)

**Purpose:** Sets up the development environment.

**Functions:**
- `savePrefs()` - Writes developer preferences to profile
- `writeDevVersionInfo()` - Writes version information
- `setup()` - Runs both above functions

### 9. Update (`update.rb`)

**Purpose:** Manages version and build information.

**Key Functions:**
- `write_version(dir)` - Writes version to Gecko config
- `write_buildid2(id)` - Writes build ID to `_dist/buildid2`
- `build_id` - A UUID v7 (`SecureRandom.uuid_v7`) for builds
- `generate_update_xml(meta, out)` - Creates update manifest for MAR updates (nothing calls this)

### 10. Defines (`defines.rb`)

**Purpose:** Central configuration and path definitions.

**Key Constants:**
- `BRANDING` - Noraneko branding info
- `PLATFORM` - Current OS (windows, darwin, linux)
- `PROJECT_ROOT` - Repository root
- `PATHS` - All important paths
- `BIN_DIR`, `BIN_PATH_EXE` - Runtime binary paths
- `DEV_SERVER` - Dev server configuration

### 11. Utils (`utils.rb`, with `omni.rb`)

**Purpose:** Shared utility functions.

**Key Functions:**
- `Utils.run()`, `Utils.run_checked()` - Execute commands
- `Utils.run_with_logging()` - Execute, yielding each line as it comes
- `Omni.open` / `Omni.seal` / `Omni.root` - The unpacked omni.ja
- `Utils.create_symlink()` - Create symbolic links
- `Utils::Logger` - Colored console logging

## Development Workflow

When you run `deno task feles-build dev`:

```
1. Initializer.run
   └── Check/download runtime binary, extract if needed

2. Omni.open
   └── Unpack browser/omni.ja into _dist/omni (no-op if already unpacked,
       or if the runtime is a flat build)

3. Patcher.run("apply")
   └── git apply --directory <Omni.root>

4. Symlinker.run
   └── Create development symlinks

5. Builder.run("dev", build_id)
   └── deno task build in each package

6. Injector.run("dev")
   └── chrome.manifest + built_in_addons.json (packaged),
       or noraneko.manifest + noraneko-devdir (flat)

7. Xhtml.inject(Omni.root, dev: true)
   └── The startup script in browser.xhtml, the dev CSP in preferences.xhtml

8. Omni.seal
   └── zip -0DXqr back into browser/omni.ja  ← the last write to the bundle

9. Initializer.resign_mac_app
   └── Ad-hoc codesign, because 8 broke the seal

10. DevEnvManager.setup
    └── Profile preferences, version info

11. DevServer.run  →  BrowserLauncher.run
    └── Vite, then the browser; when the browser closes, Vite is stopped
```

## Production Build Workflow (CI)

The CI workflow (`package.yml`) runs in two phases:

### Phase 1: `before-mach`
```bash
deno task feles-build build --phase before-mach
```
1. Create symlinks
2. Build all assets in production mode

### Phase 2: `after-mach`
```bash
deno task feles-build build --phase after-mach
```
1. Inject XHTML modifications

Between phases, `mach build` runs to build the Firefox runtime with artifact builds.

## Directory Structure

```
tools/
├── feles-build.rb          # Main entry point
├── lib/
│   ├── browser_launcher.rb # Browser launch
│   ├── builder.rb          # Asset building
│   ├── defines.rb          # Names, paths, which runtime to fetch
│   ├── dev_env_manager.rb  # Dev environment setup
│   ├── dev_server.rb       # Vite dev servers
│   ├── initializer.rb      # Binary download / extraction / codesign
│   ├── injector.rb         # chrome.manifest, built-in addons
│   ├── omni.rb             # Unpack / seal browser/omni.ja
│   ├── patcher.rb          # Patch management (git apply)
│   ├── symlinker.rb        # Symlink creation
│   ├── update.rb           # Version / build id
│   ├── utils.rb            # Run commands, symlinks, Logger
│   └── xhtml.rb            # XHTML injection
├── patches/                # Runtime patches
└── scripts/
    └── build-drop.rb       # webext-actor -> drop (xpi)
```

## Output Structure

```
_dist/
├── bin/                   # Runtime binary
│   └── noraneko/
│       ├── noraneko-devdir/  # Dev mode assets
│       │   ├── content/      # → browser-features/chrome/_dist
│       │   ├── startup/      # → bridge/startup/_dist
│       │   ├── skin/         # → browser-features/skin
│       │   ├── resource/     # → bridge/loader-modules/_dist
│       │   └── noraneko.manifest
│       └── chrome.manifest
├── noraneko/              # Production build output
├── profile/
│   └── test/              # Dev profile directory
└── buildid2               # Build ID file
```

## Dependencies

The build system uses:
- **Deno** - Runtime for build scripts
- **Vite** - Frontend bundling (via rolldown-vite)
- **tsdown** - TypeScript bundling for modules
- **Preact** - UI framework for browser features
- **birpc** - Inter-module RPC communication

## Configuration Files

| File | Purpose |
|------|---------|
| `deno.json` | Deno workspace configuration |
| `package.json` | Node dependencies (for Vite plugins) |
| `moz.build` | Mozilla build system integration |
| `browser-features/chrome/vite.config.ts` | Chrome features Vite config |
| `bridge/*/deno.json` | Bridge module configs |
| `bridge/*/tsdown.config.ts` | tsdown bundler configs |

## Troubleshooting

### Binary download fails
- Check internet connection
- Verify GitHub releases exist at `f3liz-dev/noraneko-runtime/releases`

### Patches fail to apply
- Run `deno task feles-build misc patch --action init` to reinitialize
- Check if runtime version has changed

### Dev server doesn't start
- Check ports 5181 and 5174 are available
- Check `logs/vite-*.log` for errors

### Build artifacts missing
- Ensure `_dist/` directories exist
- Check for build errors in console output
