import { Eq } from "../Eq"

import { Ordering } from "./Ordering"

/**
 * @since 2.0.0
 */
export const eqOrdering: Eq<Ordering> = {
  equals: (x, y) => x === y
}
