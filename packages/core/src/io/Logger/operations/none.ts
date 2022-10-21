import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * A logger that does nothing in response to logging events.
 *
 * @tsplus static effect/core/io/Logger.Ops none
 */
export const none: Logger<unknown, void> = {
  apply: constVoid
}
