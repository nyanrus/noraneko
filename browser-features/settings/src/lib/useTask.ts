// SPDX-License-Identifier: MPL-2.0
// 「押したら走って、終わったら一言」の形。走っている間は busy、結果か error を msg に

import { useState } from "preact/hooks";

export function useTask(onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
      onDone?.();
    }
  };
  return { busy, msg, run };
}
