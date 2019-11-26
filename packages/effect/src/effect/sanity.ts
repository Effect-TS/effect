import * as T from "./";

/* tested in wave */
/* istanbul ignore next */
export const natNumber = (msg: unknown) => (
  n: number
): T.Stack<T.NoEnv, T.NoErr, void> =>
  n < 0 || Math.round(n) !== n ? T.raiseAbort(msg) : T.unit;
