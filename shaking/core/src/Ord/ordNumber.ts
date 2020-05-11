import type { Ord } from "fp-ts/lib/Ord"

import { strictEqual } from "../Eq/strictEqual"

import { compare } from "./compare"

export const ordNumber: Ord<number> = {
  equals: strictEqual,
  compare
}
