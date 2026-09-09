// SPDX-License-Identifier: MPL-2.0
// 同じ束から二つの頁が出る。どちらかは URL が決める:
//
//   about:nora:settings   built-in の actor の on/off、特権の確認
//   about:nora:drops      棚、入っているもの、registry(Drops.tsx)
//
// 二つに分けたのは、drops が settings の一節に収まらなくなったから ── 棚があって、
// 一枚があって、registry があって、それぞれが自分のパネルを欲しがる。
import { render } from "preact";
import { Settings } from "./Settings.tsx";
import { Drops } from "./Drops.tsx";
import { mountStyles } from "./styles.ts";

const root = document.getElementById("app");
if (root) {
  mountStyles();
  const drops = location.href.includes("nora:drops") ||
    // 古いリンク(about:nora:settings#drop=<uuid>)も drops の頁で受ける
    new URLSearchParams(location.hash.slice(1)).has("drop");
  render(drops ? <Drops /> : <Settings />, root);
}
