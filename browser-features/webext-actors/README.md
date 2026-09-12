<!-- SPDX-License-Identifier: MPL-2.0 -->

# webext-actors

noraneko の機能を **xpi(入れ物)+ JSWindowActor(ページへの道)** の形で作る基盤。
Firefox 自身の about:newtab(`newtab@mozilla.org`)と同じ形にしてある: xpi は
manifest.json(id / version / hidden)だけの入れ物で、ページに届くのは JSWindowActor。
drop(コードで降ってくる機能。`modules/Drops.sys.mts`)も同じ xpi をそのまま使う。
古い JSActor(BrowserGlue)とはプレフで二者択一。

## addon 式が駄目だった理由(2026-09-08)

最初は「特権 built-in WebExtension + content_scripts + experiment API」で作った。
**stock Firefox では about:* / chrome:* に content script が注入されない**ので、
about:newtab にも about:preferences にも一行も届かなかった(built-in も drop も)。
`mozillaAddons` で privileged にしても、host permission に `about:newtab*` を足しても同じ。
`https://example.com/*` を matches に足すとそこでは走る(= about: だけが閉じている)。
BiDi(`--remote-allow-system-access`)で中に入って確かめた。
Mozilla 自身の newtab add-on も content script を使わず、JSWindowActor を
`remoteTypes: ["privilegedabout"]` で登録している。だから同じ形に揃えた。
experiment API と background.js もそれで要らなくなった。

## authoring：1 アクター = 1 ファイル

各アクターは `<name>/actor.ts` ひとつに宣言する。`parent`（メインプロセスで動く特権
メソッド）と `content`（ページ側。`window` / `document` をそのまま使える）を書くだけ。
manifest / actor.json / parent.sys.mjs / child.sys.mjs / content.js / actor.mjs は
`build.ts` が生成する。

```ts
// settings-bridge/actor.ts
import { defineContent, defineParent, type ActorMeta } from "../_shared/defineActor.ts";

export const meta: ActorMeta = {
  id: "settings-bridge@noraneko.app",
  version: "1.0.0",
  namespace: "noraSettings",            // 名前。いまは表示だけ
  matches: ["*://localhost/*", "chrome://noraneko-settings/*"],  // JSWindowActor の matches
  runAt: "document_start",              // document_start → DOMDocElementInserted で content が走る
};

export const parent = defineParent({    // メインプロセス・Services 使える
  getBoolPref: (n: string) => /* ... Services.prefs ... */,
});

export const content = defineContent<typeof parent>((parent, ctx) => {
  // parent.getBoolPref(...) は child → parent(sendQuery)を往復する Promise
  ctx.expose({ /* ページ window に生やす関数 */ });
});
```

ルール：**モジュール top-level は純粋に**保つ。`Services` / `ChromeUtils` /
`window` などの Firefox グローバルはメソッド/フック本体の中だけで使う（`build.ts` が
メタ情報を読むために Deno で import するため）。

## 3 つの形、同じ宣言

| アクター | parent | content | 形 |
|---|---|---|---|
| `settings-bridge` | pref get/set | birpc を張ってページに `NRS*` を export | 双方向 RPC |
| `about-preferences` | `openSettings()`（gBrowser.addTab） | about:preferences に項目追加 + クリックで親呼び出し | DOM + 特権 1 発 |
| `newtab` | `getData()`（NewTabUtils） | 読み込み時に取得 → `noranekoNewtabData` を dispatch | 特権データ → DOM イベント |

## 仕組み

```
page  ←exportFunction→  content.js  ←sendQuery→  parent.sys.mjs  →  actor.mjs (parent、メインプロセス)
        (child.sys.mjs が loadSubScript で、window / document / __nora を scope に載せて読む)
```

- `child.sys.mjs`(JSWindowActorChild)は `runAt` の event で `content.js` を
  `Services.scriptloader.loadSubScript(url, scope)` で読む。scope に `window` /
  `document` / `exportFunction` / `__nora` があるので、content フックは content script と
  同じ書きかたのまま、child actor の特権で動く。
- `parent.sys.mjs`(JSWindowActorParent)は `receiveMessage` で `actor.mjs` の
  `parent[method](...args)` を呼ぶ。
- 登録は `modules/NoraActors.sys.mts`(`actor.json` のとおりに `registerWindowActor`)。
  同じ名前があれば外してから登録するので、drop が built-in を置き換えられる
  (本家の ExternalComponentsFeed と同じ)。

## ビルド

`deno task build`（= `build.ts`）：

1. 各 `actor.ts` を Deno で import し、`meta` と `parent` のメソッド名を読む。
2. `_dist/<name>/` に manifest.json / actor.json / parent.sys.mjs / child.sys.mjs を生成。
3. tsdown を 2 パスで実行（アクター毎・1 エントリ）：
   - `actor.mjs`（ESM）… `parent` だけ（content/birpc は tree-shake）。
   - `content.js`（IIFE）… content フック + 共有ランタイム + birpc。
4. `_dist/builtins.json`(actor.json 込み)と `jar.mn` / `moz.build` を生成。

`defineParent` / `defineContent` はラッパだが、`treeshake.manualPureFunctions` に
登録してあるので未使用側（parent バンドル内の content など）は中身ごと落ちる。

## 登録

- **omni レイアウト（本番に近い dev）**：`tools/lib/injector.rb` が omni.ja（ほどいた木）の
  `built_in_addons.json` に `_dist/builtins.json` の各拡張を追記（Firefox と同じ
  **build 時登録**。about:newtab の起動競合を避けられる）。
- **flat レイアウト**：`NoranekoStartup.sys.mts` が `final-ui-startup` で
  `AddonManager.maybeInstallBuiltinAddon(...)` を呼ぶ（実行時・idempotent な fallback）。
- どちらの場合も、JSWindowActor の登録は `NoranekoStartup` が `builtins.json` の `actor` で行う
  (`NoraActors.register`)。AddonManager は about:debugging に見せるための入れ物。
- プレフ `noraneko.webext-actors.<name>.enabled`（既定 false。dev の user.js は true）で opt-in。
- プレフが on のとき、`BrowserGlue.sys.mts` は対応する JSActor 登録を外す（二者択一）。

## 動かし方・検証

`noraneko.webext-actors.settings-bridge.enabled` を true にして、いつもの dev 起動。

1. `about:debugging` →「この Firefox」に対象拡張が built-in/特権で出る。
2. 対象ページ（chrome://noraneko-settings、about:preferences、about:newtab）で
   従来 JSActor と同じ挙動になる（JSActor は同 pref で自動的に外れる）。

## 新しいアクターの足し方

`<name>/actor.ts` を 1 つ足すだけ。`build.ts` が自動で拾う。`NoranekoStartup` も
`BrowserGlue` の二者択一も `builtins.json` / pref 名規約で動くので、配線の追記は不要。
（pref `noraneko.webext-actors.<name>.enabled` と JSActor 名の対応だけ、置き換える
場合は `BrowserGlue` の `WEBEXT_REPLACED_ACTORS` に 1 行足す。）
