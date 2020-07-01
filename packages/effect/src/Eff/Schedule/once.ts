import { recurs } from "./recurs"
import { unit } from "./unit"

/**
 * A schedule that executes once.
 */
export const once =
  /*#__PURE__*/
  unit(recurs(1))
