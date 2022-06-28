/**
 * Creates a stream from an effect producing a value of type `A`
 *
 * @tsplus static effect/core/stream/Stream.Ops fromEffect
 */
export function fromEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.fromEffectMaybe(effect().mapError(Maybe.some))
}
