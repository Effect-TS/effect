import type { Ordering } from "fp-ts/lib/Ordering"

import type { Eq } from "../Eq"

export const eqOrdering: Eq<Ordering> = {
  equals: (x, y) => x === y
}
