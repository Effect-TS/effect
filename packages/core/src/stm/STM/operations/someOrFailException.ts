import { NoSuchElementException } from "@effect/core/io/Cause"
import type { Option } from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or fails with a `NoSuchElement` exception.
 *
 * @tsplus getter effect/core/stm/STM someOrFailException
 * @category getters
 * @since 1.0.0
 */
export function someOrFailException<R, E, A>(
  self: STM<R, E, Option<A>>
): STM<R, E | NoSuchElementException, A> {
  return self.someOrFail(new NoSuchElementException())
}
