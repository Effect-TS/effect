import { identity } from "@fp-ts/data/Function"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus getter effect/core/io/Effect absorb
 * @category mutations
 * @since 1.0.0
 */
export function absorb<R, E, A>(self: Effect<R, E, A>): Effect<R, unknown, A> {
  return self.absorbWith(identity)
}
