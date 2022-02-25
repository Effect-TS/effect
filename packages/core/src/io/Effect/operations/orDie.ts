import { identity } from "../../../data/Function"
import type { Effect, RIO } from "../definition"

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @tsplus fluent ets/Effect orDie
 */
export function orDie<R, E, A>(self: Effect<R, E, A>, __tsplusTrace?: string): RIO<R, A> {
  return self.orDieWith(identity)
}
