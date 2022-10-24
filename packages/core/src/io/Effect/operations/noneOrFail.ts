import type { Option } from "@fp-ts/data/Option"

/**
 * Lifts an `Option` into a `IO`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with the content.
 *
 * @tsplus static effect/core/io/Effect.Ops noneOrFail
 * @category constructors
 * @since 1.0.0
 */
export function noneOrFail<E>(option: Option<E>): Effect<never, E, void> {
  return Effect.getOrFailDiscard(option).flip
}
