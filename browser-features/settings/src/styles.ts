// SPDX-License-Identifier: MPL-2.0
// 色と形。一枚の紙に、紙片(section)を並べる絵。light / dark は OS に合わせる(light-dark())。
// dark は真っ黒・真っ白を避けて、太字を少し細く(暗い地では太字が滲む)。

export const css = `
:root {
  color-scheme: light dark;
  --paper: light-dark(#f6f4ef, #1b1c20);
  --card: light-dark(#fffdf9, #24262c);
  --ink: light-dark(#23262d, #e3e1da);
  --muted: light-dark(#6d7280, #9b9fa8);
  --line: light-dark(#e4e0d6, #383b44);
  --line-soft: light-dark(#eeebe3, #2f3238);
  --accent: light-dark(#4f7fd6, #8fb0f0);
  --accent-soft: light-dark(#e7eefb, #2a3550);
  --ok: light-dark(#2b7a4b, #8fd0a5);
  --ok-soft: light-dark(#e6f4ea, #1f3a2b);
  --ng: light-dark(#b3261e, #f0958e);
  --ng-soft: light-dark(#fbeae8, #3d2422);
  --code: light-dark(#4a5268, #c3c7d1);
  --code-bg: light-dark(#f0eee8, #2b2e35);
  --bold: 600;
}
@media (prefers-color-scheme: dark) { :root { --bold: 500; } }

html, body { margin: 0; background: var(--paper); color: var(--ink); }
body { font: 15px/1.6 system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code, pre { font-family: ui-monospace, "SF Mono", Menlo, monospace; }

.page { max-width: 46rem; margin: 0 auto; padding: 3rem 1.5rem 5rem; }

.head { display: flex; align-items: baseline; gap: 0.9rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
.head h1 { margin: 0; font-size: 1.55rem; font-weight: var(--bold); letter-spacing: 0.01em; }
.head .eyebrow { color: var(--muted); font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
.lead { margin: 0 0 2rem; color: var(--muted); font-size: 0.92rem; }

.chip { display: inline-block; font-size: 0.72rem; padding: 0.15rem 0.6rem; border-radius: 999px; font-weight: var(--bold); letter-spacing: 0.02em; }
.chip.ok { background: var(--ok-soft); color: var(--ok); }
.chip.warn { background: var(--ng-soft); color: var(--ng); }

.card { background: var(--card); border: 1px solid var(--line); border-radius: 0.9rem; padding: 1.4rem 1.6rem 1.2rem; margin-top: 1.4rem; box-shadow: 0 1px 0 light-dark(rgba(0,0,0,0.03), rgba(0,0,0,0.3)); }
.card h2 { margin: 0 0 0.2rem; font-size: 1.05rem; font-weight: var(--bold); }
.card .hint { margin: 0 0 1rem; color: var(--muted); font-size: 0.86rem; }

.row { display: flex; gap: 0.9rem; align-items: flex-start; padding: 0.75rem 0; border-top: 1px solid var(--line-soft); }
.row:first-of-type { border-top: 0; }
.row.click { cursor: pointer; }
.row .text { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 0; }
.row .label { font-weight: var(--bold); }
.row .desc { color: var(--muted); font-size: 0.85rem; }
.row input[type=checkbox] { margin-top: 0.3rem; accent-color: var(--accent); width: 1rem; height: 1rem; }

.code { font-size: 0.76rem; color: var(--code); background: var(--code-bg); padding: 0.1rem 0.4rem; border-radius: 0.3rem; align-self: flex-start; overflow-wrap: anywhere; }
pre.code { white-space: pre-wrap; max-height: 24rem; overflow: auto; padding: 0.7rem 0.8rem; line-height: 1.5; margin: 0.4rem 0 0; align-self: stretch; }

button { font: inherit; font-size: 0.88rem; padding: 0.45rem 0.9rem; border-radius: 0.55rem; border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; }
button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
button:disabled { opacity: 0.45; cursor: default; }
button.primary { background: var(--accent); border-color: var(--accent); color: light-dark(#fff, #14181f); }
button.primary:hover:not(:disabled) { color: light-dark(#fff, #14181f); filter: brightness(1.06); }
button.danger { border-color: var(--ng); color: var(--ng); }
button.quiet { border-color: transparent; color: var(--muted); }
button.quiet:hover:not(:disabled) { border-color: var(--line); }

input, select { font: inherit; font-size: 0.92rem; padding: 0.5rem 0.7rem; border-radius: 0.55rem; border: 1px solid var(--line); background: var(--card); color: var(--ink); }
input:focus, select:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
input::placeholder { color: var(--muted); }

.drop-input { display: flex; gap: 0.5rem; align-items: stretch; margin-top: 0.4rem; }
.drop-input input { flex: 1; font-size: 1.05rem; padding: 0.6rem 0.8rem; letter-spacing: 0.02em; }

.msg { margin: 0.7rem 0 0; color: var(--muted); font-size: 0.86rem; }

details.fold > summary { cursor: pointer; color: var(--muted); font-size: 0.85rem; list-style: none; }
details.fold > summary::before { content: "▸ "; font-size: 0.75em; }
details.fold[open] > summary::before { content: "▾ "; }
details.fold { margin-bottom: 0.8rem; }
.form { display: grid; gap: 0.45rem; margin-top: 0.7rem; }
.form .actions { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.1rem; }

.sheet { margin-top: 1rem; padding-top: 0.2rem; }
.sheet .stamp { display: flex; flex-wrap: wrap; gap: 0.4rem 0.8rem; align-items: baseline; padding: 0.7rem 0.9rem; border-radius: 0.6rem; font-size: 0.86rem; }
.sheet .stamp.ok { background: var(--ok-soft); color: var(--ok); }
.sheet .stamp.ng { background: var(--ng-soft); color: var(--ng); }
.sheet .stamp .who { font-weight: var(--bold); }
.sheet .stamp .id { font-size: 0.78rem; opacity: 0.85; overflow-wrap: anywhere; }
.sheet .meta { margin: 0.6rem 0 0; color: var(--muted); font-size: 0.86rem; }
.sheet .meta + .meta { margin-top: 0.2rem; }
.sheet .meta .k { color: var(--ink); font-weight: var(--bold); font-size: 0.95rem; }
.entry { margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 0.25rem; }
.entry .name { font-weight: var(--bold); display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; }
.entry .fact { color: var(--muted); font-size: 0.85rem; }
.entry details { margin-top: 0.3rem; }
.entry summary { cursor: pointer; color: var(--muted); font-size: 0.85rem; }
.entry summary .k { color: var(--ink); }
.caution { margin-top: 1rem; padding: 0.8rem 1rem; border-radius: 0.6rem; background: var(--ng-soft); color: var(--ng); font-size: 0.9rem; border: 1px solid light-dark(#f2c4c0, #5a3330); }
.caution strong { font-weight: var(--bold); }
.sheet .actions { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }

/* 頁を横に広げる(棚が面になるので、46rem では二列で終わってしまう) */
.page.wide { max-width: 72rem; }
/* 左のレールと、右の一枚。GNOME Software と同じ絵 */
.withrail { display: grid; grid-template-columns: 12rem 1fr; gap: 1.6rem; margin-top: 1.4rem; align-items: start; }
.rail { display: flex; flex-direction: column; gap: 0.15rem; position: sticky; top: 1.5rem; }
.rail-item { display: flex; align-items: center; gap: 0.5rem; width: 100%; text-align: left;
  background: none; border: 0; border-radius: 0.6rem; padding: 0.5rem 0.7rem; cursor: pointer;
  color: var(--fg); font: inherit; font-size: 0.92rem; }
.rail-item:hover { background: var(--card); }
.rail-item.on { background: var(--card); border: 1px solid var(--line); font-weight: var(--bold); }
.rail-item span:first-child { flex: 1; }
.rail-item .n { color: var(--muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.panel { background: var(--card); border: 1px solid var(--line); border-radius: 0.9rem;
  padding: 1.4rem 1.6rem 1.6rem; min-height: 20rem; }
.panel > .hint { margin: 0 0 1rem; color: var(--muted); font-size: 0.86rem; }
.crumb { margin: 0 0 0.8rem; }
.link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; text-decoration: none; }
.link:hover { text-decoration: underline; }

/* 棚は面に。一件が一枚の札で、押すとその drop のパネルへ */
.shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.8rem; margin-top: 1rem; }
.tile-card { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto auto;
  gap: 0.15rem 0.7rem; text-align: left; background: var(--bg); border: 1px solid var(--line);
  border-radius: 0.8rem; padding: 0.9rem; cursor: pointer; color: var(--fg); font: inherit; }
.tile-card:hover { border-color: var(--accent); }
.tile-card .icon { grid-row: 1 / 3; }
.tile-card .name { font-weight: var(--bold); align-self: center; }
.tile-card .desc { color: var(--muted); font-size: 0.84rem; align-self: start;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tile-card .foot { grid-column: 1 / -1; display: flex; align-items: center; gap: 0.4rem;
  flex-wrap: wrap; margin-top: 0.5rem; }
.tile-card .mark { color: var(--muted); font-size: 0.76rem; }

@media (max-width: 46rem) {
  .withrail { grid-template-columns: 1fr; }
  .rail { flex-direction: row; flex-wrap: wrap; position: static; }
  .rail-item { width: auto; }
}

/* 一枚の表 — 店の頁。絵、説明、スクリーンショット、そして「ねこにいれる」 */
.store-head { display: flex; gap: 1.1rem; align-items: flex-start; }
.store-icon { width: 4.5rem; height: 4.5rem; border-radius: 1.1rem; flex: 0 0 auto; object-fit: cover; }
.store-icon.tile { display: inline-flex; align-items: center; justify-content: center;
  background: var(--card); border: 1px solid var(--line); font-size: 2rem; font-weight: var(--bold);
  text-transform: uppercase; color: var(--muted); }
.store-title h2 { margin: 0 0 0.2rem; font-size: 1.4rem; font-weight: var(--bold); }
.store-note { margin: 0 0 0.4rem; color: var(--fg); font-size: 0.95rem; }
.store-meta { margin: 0; display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;
  color: var(--muted); font-size: 0.82rem; }
.store-meta .mark { padding: 0.05rem 0.45rem; border-radius: 0.4rem; }
.store-meta .mark.ok { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--fg); }
.store-meta .mark.ng { background: color-mix(in srgb, #c04 22%, transparent); color: var(--fg); }
.store-actions { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin: 1.2rem 0 0.4rem; }
button.big { font-size: 1rem; padding: 0.6rem 1.4rem; border-radius: 0.7rem; }
.store-shots { display: flex; gap: 0.7rem; overflow-x: auto; margin: 1.2rem 0 0.4rem;
  padding-bottom: 0.4rem; }
.store-shots img { max-height: 17rem; border-radius: 0.7rem; border: 1px solid var(--line); }
.store-facts { display: grid; grid-template-columns: 7rem 1fr; gap: 0.35rem 0.9rem; margin: 1.2rem 0 0; }
.store-facts dt { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
.store-facts dd { margin: 0; font-size: 0.9rem; }
.store-foot { color: var(--muted); font-size: 0.8rem; margin-top: 1.2rem; }
@media (max-width: 40rem) { .store-facts { grid-template-columns: 1fr; gap: 0.1rem; } }

/* 押してから入るまで: 確かめる → 何を許すのかを見せる → 許されたら入れる */
.spin { display: inline-block; width: 0.8em; height: 0.8em; margin-inline-end: 0.4em;
  border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%;
  animation: spin 0.7s linear infinite; vertical-align: -0.05em; }
@keyframes spin { to { transform: rotate(360deg); } }
.grant { border: 1px solid var(--accent); border-radius: 0.8rem; padding: 1rem 1.2rem;
  margin-top: 0.8rem; background: var(--bg); }
.grant.bad { border-color: #c04; }
.grant-head { margin: 0 0 0.8rem; font-size: 1rem; }
.grant-sub { display: block; color: var(--muted); font-size: 0.82rem; margin-top: 0.25rem; }
.grant-list { display: grid; grid-template-columns: 6.5rem 1fr; gap: 0.4rem 0.9rem; margin: 0 0 1rem; }
.grant-list dt { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
.grant-list dd { margin: 0; font-size: 0.9rem; }
.grant .store-actions { margin: 0; }
@media (max-width: 40rem) { .grant-list { grid-template-columns: 1fr; gap: 0.1rem; } }

/* 一枚の頭。読む前に、読む量と届く範囲を言う */
.summary { border: 1px solid var(--line); border-radius: 0.7rem; padding: 0.9rem 1.1rem;
  margin: 0.9rem 0 1.1rem; background: var(--bg); display: grid; gap: 0.75rem; }
.sum-row { display: grid; grid-template-columns: 7rem 1fr; gap: 0.9rem; align-items: baseline; }
.sum-k { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
.sum-v { font-size: 0.92rem; }
.sum-v b { font-weight: var(--bold); }
.sum-sub { display: block; color: var(--muted); font-size: 0.8rem; margin-top: 0.25rem; }
.sum-list { margin: 0.4rem 0 0; padding-left: 1.1rem; display: grid; gap: 0.1rem;
  font-size: 0.85rem; color: var(--fg); }
@media (max-width: 40rem) { .sum-row { grid-template-columns: 1fr; gap: 0.15rem; } }

/* 読むための file: 面に置いて、押した一枚だけが横いっぱいになる */
.files { margin-top: 1rem; }
.files-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
.files-head .k { font-weight: var(--bold); font-size: 0.9rem; }
.files-head .n { color: var(--muted); font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.files-head .note { color: var(--muted); font-size: 0.78rem; }
.filegrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.35rem; align-items: start; }
.filegrid details { margin: 0; padding: 0.4rem 0.55rem; border-radius: 0.5rem;
  background: var(--bg); border: 1px solid var(--line-soft); }
.filegrid details:hover { border-color: var(--line); }
.filegrid details[open] { grid-column: 1 / -1; }
.filegrid summary { list-style: none; cursor: pointer; font-size: 0.85rem; overflow-wrap: anywhere;
  display: flex; align-items: baseline; gap: 0.4rem; }
.filegrid summary::-webkit-details-marker { display: none; }
.filegrid summary::before { content: "▸"; color: var(--muted); }
.filegrid details[open] > summary::before { content: "▾"; }
.filegrid summary .k { font-family: var(--mono); font-size: 0.9em; flex: 1; min-width: 0; }
.filegrid summary .k .dir { color: var(--muted); }
.filegrid summary .n { color: var(--muted); font-size: 0.76rem; font-variant-numeric: tabular-nums; }
.filegrid pre.code { margin-top: 0.5rem; max-height: 34rem; overflow: auto; }
/* 畳んであるもの。開くまでは一行で、なぜ読まなくていいかだけ言う */
.files.fold, .entry.fold { border: 1px solid var(--line-soft); border-radius: 0.6rem;
  padding: 0.5rem 0.7rem; margin-top: 0.6rem; }
.files.fold > summary, .entry.fold > summary { list-style: none; cursor: pointer;
  display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.files.fold > summary::-webkit-details-marker, .entry.fold > summary::-webkit-details-marker { display: none; }
.files.fold > summary::before, .entry.fold > summary::before { content: "▸"; color: var(--muted); }
.files.fold[open] > summary::before, .entry.fold[open] > summary::before { content: "▾"; }
.files.fold > summary .k, .entry.fold > summary .name { font-weight: var(--bold); font-size: 0.9rem; }
.files.fold > summary .n, .entry.fold > summary .n { color: var(--muted); font-size: 0.78rem; }
.files.fold > summary .note { color: var(--muted); font-size: 0.78rem; }
.entry.fold > summary .mark { font-size: 0.76rem; padding: 0.05rem 0.4rem; border-radius: 0.4rem; }
.entry.fold > summary .mark.ok { background: color-mix(in srgb, var(--accent) 18%, transparent); }
.entry.fold > summary .mark.ng { background: color-mix(in srgb, #c04 22%, transparent); }
.files.fold[open] > .filegrid, .entry.fold[open] { margin-top: 0.5rem; }

.installed { margin-top: 1.2rem; }
.installed .k { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.2rem; }

/* 棚(一覧)。入っているもの・新しい版があるものに、小さな札 */
.pill { margin-inline-start: 0.5rem; font-size: 0.7rem; font-weight: 400; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 0.05rem 0.5rem; vertical-align: 0.08em; }
/* 絵。アイコンは 96px の PNG(判の内側)、無ければ名前で決めた色のタイルに頭文字 */
.icon { width: 2.1rem; height: 2.1rem; border-radius: 0.6rem; flex: 0 0 auto; object-fit: cover; }
.sheet .icon { width: 1.5rem; height: 1.5rem; border-radius: 0.4rem; vertical-align: -0.35rem; margin-inline-end: 0.35rem; }
.icon.tile { display: inline-flex; align-items: center; justify-content: center; font-weight: var(--bold); font-size: 1.05rem; text-transform: uppercase; }
.icon.tile.sakura { background: #fce4ea; color: #9c4159; }
.icon.tile.tamago { background: #fdf0cc; color: #7f5e0c; }
.icon.tile.sora   { background: #dfeaf8; color: #3d6491; }
.icon.tile.wakaba { background: #dcf0e2; color: #2f7150; }
.icon.tile.fuji   { background: #e7e3f6; color: #5b4e94; }
.icon.tile.momo   { background: #fde4dc; color: #a24f38; }
@media (prefers-color-scheme: dark) {
  .icon.tile.sakura { background: #3a2a30; color: #f0a9bc; }
  .icon.tile.tamago { background: #383021; color: #ecd07a; }
  .icon.tile.sora   { background: #262f3b; color: #a4c4ea; }
  .icon.tile.wakaba { background: #24332a; color: #9dd6b3; }
  .icon.tile.fuji   { background: #2c2839; color: #bcb0e8; }
  .icon.tile.momo   { background: #3a2a25; color: #eba992; }
}
.shots { display: flex; gap: 0.6rem; flex-wrap: wrap; margin: 0.6rem 0; }
.shots img { max-width: 100%; max-height: 15rem; border-radius: 0.5rem; border: 1px solid var(--line); background: var(--code-bg); }

.by-uuid { margin-top: 1rem; }
.by-uuid > summary { color: var(--muted); font-size: 0.82rem; cursor: pointer; }
.by-uuid > summary::marker { color: var(--line); }
`;

/** 一度だけ <style> を head に置く */
export function mountStyles(): void {
  if (document.getElementById("nora-settings-css")) return;
  const el = document.createElement("style");
  el.id = "nora-settings-css";
  el.textContent = css;
  document.head.appendChild(el);
}
