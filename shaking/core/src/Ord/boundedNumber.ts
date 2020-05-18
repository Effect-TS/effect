import type { Bounded } from "../Base"

import { ordNumber } from "./ordNumber"

export const boundedNumber: Bounded<number> = {
  ...ordNumber,
  top: Infinity,
  bottom: -Infinity
}
