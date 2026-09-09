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
