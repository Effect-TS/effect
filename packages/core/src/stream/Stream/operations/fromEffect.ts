import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream from an effect producing a value of type `A`
 *
 * @tsplus static effect/core/stream/Stream.Ops fromEffect
 * @category conversions
 * @since 1.0.0
 */
export function fromEffect<R, E, A>(effect: Effect<R, E, A>): Stream<R, E, A> {
  return Stream.fromEffectOption(effect.mapError(Option.some))
}
