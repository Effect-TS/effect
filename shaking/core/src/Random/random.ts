import { sync, Sync } from "../Effect"

export const random: Sync<number> =
  /*#__PURE__*/
  (() => sync(() => Math.random()))()
