import { map_, Sync } from "../Effect"

import { random } from "./random"

export const randomInt = (low: number, high: number): Sync<number> =>
  map_(random, (n) => Math.floor((high - low + 1) * n + low))
