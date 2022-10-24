import { NoSuchElementException } from "@effect/core/io/Cause"
import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`.
 *
 * @tsplus getter effect/core/io/Effect someOrFailException
 * @category getters
 * @since 1.0.0
 */
export function someOrFailException<R, E, A>(
  self: Effect<R, E, Option<A>>
): Effect<R, E | NoSuchElementException, A> {
  return self.someOrFail(new NoSuchElementException())
}
