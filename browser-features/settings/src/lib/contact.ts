// SPDX-License-Identifier: MPL-2.0
// 作者の連絡先。書きかたは drop.toml の contact と同じ: gh/<user>、mail/<addr>、social/<@user@host か URL>、URL そのまま

export function contactList(c: string | string[] | undefined): string[] {
  if (!c) return [];
  return Array.isArray(c) ? c : [c];
}

export function contactHref(c: string): string | null {
  if (c.startsWith("gh/")) return `https://github.com/${c.slice(3)}`;
  if (c.startsWith("mail/")) return `mailto:${c.slice(5)}`;
  if (c.startsWith("social/")) {
    const v = c.slice(7);
    if (/^https?:\/\//.test(v)) return v;
    const m = v.match(/^@?([^@]+)@([^@]+)$/);
    return m ? `https://${m[2]}/@${m[1]}` : null;
  }
  return /^https?:\/\//.test(c) ? c : null;
}
