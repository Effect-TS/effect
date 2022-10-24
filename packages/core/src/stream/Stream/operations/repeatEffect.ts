import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream from an effect producing a value of type `A` which repeats
 * forever.
 *
 * @tsplus static effect/core/stream/Stream.Ops repeatEffect
 * @category repetition
 * @since 1.0.0
 */
export function repeatEffect<R, E, A>(effect: Effect<R, E, A>): Stream<R, E, A> {
  return Stream.repeatEffectOption(effect.mapError(Option.some))
}
