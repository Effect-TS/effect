import type { Bounded } from "fp-ts/lib/Bounded"

import { ordNumber } from "./ordNumber"

export const boundedNumber: Bounded<number> = {
  ...ordNumber,
  top: Infinity,
  bottom: -Infinity
}
