import type { Ordering } from "fp-ts/lib/Ordering"

import type { Monoid } from "../Monoid"

import { semigroupOrdering } from "./semigroupOrdering"

export const monoidOrdering: Monoid<Ordering> = {
  concat: semigroupOrdering.concat,
  empty: 0
}
