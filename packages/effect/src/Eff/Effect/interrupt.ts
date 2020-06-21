import { chain_ } from "./chain_"
import { fiberId } from "./fiberId"
import { interruptAs } from "./interruptAs"

/**
 * Returns an effect that is interrupted by the current fiber
 */
export const interrupt =
  /*#__PURE__*/
  chain_(fiberId(), interruptAs)
