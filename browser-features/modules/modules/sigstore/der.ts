// SPDX-License-Identifier: MPL-2.0
/**
 * DER(ASN.1)の最小の読み手。X.509 の cert から要る所(TBS、署名、公開鍵、有効期間、拡張)を
 * 取り出すためだけのもの。書き手は無い。Firefox の中でも Deno でも動くように、外に依存しない。
 */

export interface DerNode {
  tag: number; // class/constructed を含む生の tag byte(SEQUENCE=0x30、INTEGER=0x02 …)
  tagNumber: number;
  constructed: boolean;
  cls: number; // 0=universal 1=application 2=context 3=private
  start: number; // 全体(tag から)の先頭
  headerLength: number;
  length: number; // 中身の長さ
  end: number; // 全体の終わり(exclusive)
  bytes: Uint8Array; // 中身
  raw: Uint8Array; // tag + length + 中身
  children?: DerNode[];
}

export function parseDer(buf: Uint8Array, offset = 0): DerNode {
  if (offset >= buf.length) throw new Error("DER: unexpected end");
  const tag = buf[offset];
  const tagNumber = tag & 0x1f;
  if (tagNumber === 0x1f) throw new Error("DER: high-tag-number form not supported");
  let p = offset + 1;
  let length = buf[p++];
  if (length & 0x80) {
    const n = length & 0x7f;
    if (n === 0 || n > 4) throw new Error("DER: bad length");
    length = 0;
    for (let i = 0; i < n; i++) length = (length << 8) | buf[p++];
    if (length < 0) throw new Error("DER: length overflow");
  }
  const headerLength = p - offset;
  const end = p + length;
  if (end > buf.length) throw new Error("DER: length past end");
  const node: DerNode = {
    tag,
    tagNumber,
    constructed: (tag & 0x20) !== 0,
    cls: tag >> 6,
    start: offset,
    headerLength,
    length,
    end,
    bytes: buf.subarray(p, end),
    raw: buf.subarray(offset, end),
  };
  if (node.constructed) {
    node.children = [];
    let q = p;
    while (q < end) {
      const c = parseDer(buf, q);
      node.children.push(c);
      q = c.end;
    }
  }
  return node;
}

/** 子を順に(無ければ error) */
export function child(node: DerNode, i: number, what = "child"): DerNode {
  const c = node.children?.[i];
  if (!c) throw new Error(`DER: missing ${what} [${i}]`);
  return c;
}

/** OBJECT IDENTIFIER → "1.2.840.10045.4.3.2" */
export function oidToString(bytes: Uint8Array): string {
  const parts: number[] = [];
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v * 128 + (bytes[i] & 0x7f);
    if ((bytes[i] & 0x80) === 0) {
      if (parts.length === 0) {
        parts.push(Math.floor(v / 40), v % 40);
      } else {
        parts.push(v);
      }
      v = 0;
    }
  }
  return parts.join(".");
}

/** UTCTime / GeneralizedTime → Date */
export function derTime(node: DerNode): Date {
  const s = new TextDecoder().decode(node.bytes);
  if (node.tagNumber === 0x17) {
    // UTCTime YYMMDDHHMMSSZ
    const yy = parseInt(s.slice(0, 2), 10);
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return new Date(Date.UTC(year, +s.slice(2, 4) - 1, +s.slice(4, 6), +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12)));
  }
  if (node.tagNumber === 0x18) {
    // GeneralizedTime YYYYMMDDHHMMSS(.fff)Z
    return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14)));
  }
  throw new Error(`DER: not a time (tag ${node.tagNumber})`);
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** PEM → DER(最初の一つ) */
export function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  return base64ToBytes(b64);
}
