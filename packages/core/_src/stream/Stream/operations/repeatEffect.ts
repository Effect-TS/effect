/**
 * Creates a stream from an effect producing a value of type `A` which repeats
 * forever.
 *
 * @tsplus static ets/Stream/Ops repeatEffect
 */
export function repeatEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectOption(effect().mapError(Option.some));
}
