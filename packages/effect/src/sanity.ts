import * as T from "./effect";

/* tested in wave */
/* istanbul ignore next */
export const natNumber = (msg: unknown) => (n: number): T.Sync<void> =>
  n < 0 || Math.round(n) !== n ? T.raiseAbort(msg) : T.unit;
