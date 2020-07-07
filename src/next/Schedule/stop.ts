import { recurs } from "./recurs"
import { unit } from "./unit"

export const stop =
  /*#__PURE__*/
  unit(recurs(0))
