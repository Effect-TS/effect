import { raiseAbort, Sync, unit } from "../Effect"

export const natNumber = (msg: unknown) => (n: number): Sync<void> =>
  n < 0 || Math.round(n) !== n ? raiseAbort(msg) : unit
