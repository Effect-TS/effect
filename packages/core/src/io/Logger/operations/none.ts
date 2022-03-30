import { constVoid } from "../../../data/Function"
import type { Logger } from "../definition"

/**
 * A logger that does nothing in response to logging events.
 *
 * @tsplus static ets/LoggerOps none
 */
export const none: Logger<unknown, void> = {
  apply: constVoid
}
