import { map_, Sync } from "../Effect"

import { random } from "./random"

export const randomRange = (min: number, max: number): Sync<number> =>
  map_(random, (n) => (max - min) * n + min)
