import { identity } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Unearth the unchecked failure of the effect (opposite of `orDie`).
 *
 * @tsplus getter effect/core/io/Effect resurrect
 * @category mutations
 * @since 1.0.0
 */
export function resurrect<R, E, A>(self: Effect<R, E, A>): Effect<R, unknown, A> {
  return self.unrefineWith(Option.some, identity)
}
