import * as T from "../Effect"

export const random: T.Sync<number> =
  /*#__PURE__*/
  (() => T.sync(() => Math.random()))()

export const randomBool: T.Sync<boolean> =
  /*#__PURE__*/
  (() => T.map_(random, (n) => n < 0.5))()

export const randomInt = (low: number, high: number): T.Sync<number> =>
  T.map_(random, (n) => Math.floor((high - low + 1) * n + low))

export const randomRange = (min: number, max: number): T.Sync<number> =>
  T.map_(random, (n) => (max - min) * n + min)
