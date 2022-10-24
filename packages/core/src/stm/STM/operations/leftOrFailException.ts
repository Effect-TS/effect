import { NoSuchElementException } from "@effect/core/io/Cause"
import type { Either } from "@fp-ts/data/Either"

/**
 * Returns a successful effect if the value is `Left`, or fails with a
 * `NoSuchElementException`.
 *
 * @tsplus getter effect/core/stm/STM leftOrFailException
 * @category getters
 * @since 1.0.0
 */
export function leftOrFailException<R, E, B, C>(self: STM<R, E, Either<B, C>>) {
  return self.leftOrFail(() => new NoSuchElementException())
}
