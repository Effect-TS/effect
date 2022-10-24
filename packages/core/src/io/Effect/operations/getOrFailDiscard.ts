import type { Option } from "@fp-ts/data/Option"

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @tsplus static effect/core/io/Effect.Ops getOrFailDiscard
 * @category conversions
 * @since 1.0.0
 */
export function getOrFailDiscard<A>(option: Option<A>): Effect<never, void, A> {
  return Effect.getOrFailWith(option, undefined)
}
