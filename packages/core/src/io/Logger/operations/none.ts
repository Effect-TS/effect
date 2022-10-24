import { constVoid } from "@fp-ts/data/Function"

/**
 * A logger that does nothing in response to logging events.
 *
 * @tsplus static effect/core/io/Logger.Ops none
 * @category constructors
 * @since 1.0.0
 */
export const none: Logger<unknown, void> = {
  apply: constVoid
}
