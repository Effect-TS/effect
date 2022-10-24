import { NoSuchElementException } from "@effect/core/io/Cause"
import type { Option } from "@fp-ts/data/Option"

/**
 * Lifts an `Option` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @tsplus static effect/core/io/Effect.Ops getOrFail
 * @category conversions
 * @since 1.0.0
 */
export function getOrFail<A>(option: Option<A>): Effect<never, NoSuchElementException, A> {
  return Effect.getOrFailWith(option, new NoSuchElementException())
}
