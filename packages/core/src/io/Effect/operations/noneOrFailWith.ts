import type { Option } from "@fp-ts/data/Option"

/**
 * Lifts an `Option` into a `IO`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with an error adapted with
 * the specified function.
 *
 * @tsplus static effect/core/io/Effect.Ops noneOrFailWith
 * @category constructors
 * @since 1.0.0
 */
export function noneOrFailWith<E, A>(
  option: Option<A>,
  f: (a: A) => E
): Effect<never, E, void> {
  return Effect.getOrFailDiscard(option).flip.mapError(f)
}
