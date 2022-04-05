/**
 * Creates a stream from an effect producing a value of type `A`
 *
 * @tsplus static ets/Stream/Ops fromEffect
 */
export function fromEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.fromEffectOption(effect().mapError(Option.some));
}
