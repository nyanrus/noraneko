// https://github.com/solidjs/solid-refresh/blob/ad30cbab5daae508e862dcf7fdc51839fea59860/src/runtime/index.ts#L188
declare interface ESMHot {
  data: unknown;
  accept: (cb: (module?: unknown) => void) => void;
  invalidate: () => void;
  decline: () => void;
}
interface ImportMeta {
  hot: ESMHot
}