# Noraneko Build System

This document provides a comprehensive overview of the Noraneko build system, explaining its components, workflows, and how they interact.

## Overview

Noraneko's build system is designed to:
1. Download and extract the prebuilt Firefox/Noraneko runtime binary
2. Apply custom patches to the runtime
3. Build browser features and modules using Vite/Deno
4. Inject the built assets into the runtime
5. Create the final distributable package

The build system is TypeScript on **Deno**, with the file-touching parts in **Ruby** (`tools/lib/`). Both come from `mise install`.

## Entry Point

The main build entry point is:
```bash
deno task feles-build <command>
```

This runs `tools/feles-build.ts`, which orchestrates the entire build process.

## Commands

| Command | Description |
|---------|-------------|
| `dev` | Development workflow - downloads binary, applies patches, builds in dev mode, starts dev servers, launches browser |
| `stage` | Production build with dev-mode browser launch - useful for testing production assets |
| `build --phase <phase>` | Production build for CI (phases: `before-mach`, `after-mach`) |
| `misc patch --action <action>` | Patch management (actions: `apply`, `create`, `init`) |
| `misc writeVersion` | Write version files for Gecko |

## Build Components

Build components live in two places, split by what they need:

- `tools/src/` — TypeScript, run by Deno. Everything that touches the JS
  ecosystem (vite, the omni.ja editing via JSZip, the patch application via
  npm:diff).
- `tools/lib/` — Ruby, run by `ruby`. The parts that only touch files and start
  programs. One door: `ruby tools/lib/build.rb <step>` (run it with no arguments
  to list the steps). `tools/src/utils.ts` calls it with `runRuby()` /
  `runRubyCapture()`. (`tools/scripts/build-drop.rb` is Ruby for the same reason.)

### 1. Initializer (`initializer.ts`)

**Purpose:** Ensures the runtime binary is present and properly configured.

**Key Functions:**
- `run()` - Entry point: checks binary version, downloads if needed, extracts, saves developer preferences
- `decompressBin()` - Extracts the downloaded archive (supports ZIP, DMG, TAR.XZ)
- `downloadBin()` - Downloads the runtime from GitHub releases
- `savePrefsForProfile()` - Creates `user.js` with developer preferences

**Binary Locations:**
- Windows/Linux: `_dist/bin/noraneko/`
- macOS: `_dist/bin/noraneko/Noraneko.app/Contents/Resources/`

### 2. Patcher (`patcher.ts`)

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
4. Patches use `git apply` with `--unsafe-paths`

**Patched Files:**
Check `tools/patches/` for the current list of patches. Common patches target:
- Browser initialization and startup
- Tab browser functionality
- Module system integrations

> **Note:** Patches with `.temp` suffix are not applied automatically.

### 3. Symlinker (`tools/lib/symlinker.rb`, step `symlink`)

**Purpose:** Creates symbolic links for development mode.

**Links Created:**
| Link | Target |
|------|--------|
| `bridge/loader-features/link-features-chrome` | `browser-features/chrome` |
| `bridge/loader-features/link-i18n` | `i18n` |
| `bridge/loader-modules/link-modules` | `browser-features/modules` |

### 4. Builder (`builder.ts`)

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

### 5. Injector (`injector.ts`)

**Purpose:** Injects built assets into the runtime binary.

**Key Functions:**
- `run(mode)` - Creates manifest and symlinks built assets into binary directory
- `createManifest()` - Generates `noraneko.manifest` for chrome registration
- `injectXhtmlFromTs()` - Runs XHTML injection script

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

### 6. Dev Server (`dev_server.ts`)

**Purpose:** Runs Vite development servers for hot module replacement (HMR).

**Servers:**
| Name | Port | Path |
|------|------|------|
| main | 5181 | `browser-features/chrome` |
| designs | 5174 | `browser-features/skin` |

**Logs:** Written to `logs/vite-*.log`

### 7. Browser Launcher (`browser_launcher.ts`)

**Purpose:** Launches the Noraneko browser with debugging enabled.

**Launch Arguments:**
- `--profile _dist/profile/test`
- `--remote-debugging-port 5180`
- `--wait-for-browser`
- `--jsdebugger`

### 8. Dev Env Manager (`tools/lib/dev_env_manager.rb`, step `dev-env`)

**Purpose:** Sets up the development environment.

**Functions:**
- `savePrefs()` - Writes developer preferences to profile
- `writeDevVersionInfo()` - Writes version information
- `setup()` - Runs both above functions

### 9. Update (`tools/lib/update.rb`)

**Purpose:** Manages version and build information.

**Key Functions:**
- step `write-version <dir>` - Writes version to Gecko config
- step `write-buildid2 <id>` - Writes build ID to `_dist/buildid2`
- step `uuid` - Prints a UUID v7 (`SecureRandom.uuid_v7`) for builds
- step `update-xml <meta.json> <out>` - Creates update manifest for MAR updates (nothing calls this)

### 10. Defines (`defines.ts`)

**Purpose:** Central configuration and path definitions.

**Key Constants:**
- `BRANDING` - Noraneko branding info
- `PLATFORM` - Current OS (windows, darwin, linux)
- `PROJECT_ROOT` - Repository root
- `PATHS` - All important paths
- `BIN_DIR`, `BIN_PATH_EXE` - Runtime binary paths
- `DEV_SERVER` - Dev server configuration

### 11. Utils (`utils.ts`)

**Purpose:** Shared utility functions.

**Key Functions:**
- `runCommand()`, `runCommandChecked()` - Execute shell commands
- `exists()` - Check file/directory existence
- `safeRemove()` - Safe recursive deletion
- `createSymlink()` - Create symbolic links
- `Logger` - Colored console logging
- `ProcessUtils` - Stream stdout/stderr with callbacks
- `runRuby()`, `runRubyCapture()` - Run one step of `tools/lib/build.rb`

## Development Workflow

When you run `deno task feles-build dev`:

```
1. Initializer.run()
   └── Check/download runtime binary
   └── Extract if needed
   └── Save developer preferences

2. Patcher.run("apply")
   └── Apply patches to runtime

3. ruby tools/lib/build.rb symlink
   └── Create development symlinks

4. Builder.run("dev")
   └── Build startup scripts
   └── Build loader modules
   └── Build chrome features

5. Injector.run("dev")
   └── Create chrome.manifest
   └── Create noraneko.manifest
   └── Symlink built assets into runtime

6. ruby tools/lib/build.rb dev-env
   └── Save profile preferences
   └── Write version info

7. DevServer.run()
   └── Start Vite dev servers (HMR)

8. BrowserLauncher.run()
   └── Launch browser with debugging
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
├── feles-build.ts         # Main entry point
├── src/                   # TypeScript, run by Deno
│   ├── builder.ts         # Asset building
│   ├── browser_launcher.ts # Browser launch
│   ├── defines.ts         # Constants/paths (the platform-dependent ones)
│   ├── dev_server.ts      # Vite dev servers
│   ├── initializer.ts     # Binary initialization
│   ├── injector.ts        # Asset injection
│   ├── patcher.ts         # Patch management
│   └── utils.ts           # Shared utilities (incl. runRuby)
├── lib/                   # Ruby, run by `ruby`
│   ├── build.rb           # The one door: `build.rb <step>`
│   ├── defines.rb         # Paths the Ruby side uses
│   ├── dev_env_manager.rb # Dev environment setup
│   ├── symlinker.rb       # Symlink creation
│   ├── update.rb          # Version / build id
│   └── utils.rb           # Logger
├── patches/               # Runtime patches
└── scripts/
    ├── build-drop.rb      # webext-actor -> drop (xpi)
    └── xhtml.ts           # XHTML injection
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
